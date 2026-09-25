'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { productsApi, categoriesApi, suppliersApi } from '@/lib/api';
import {
  Product,
  Category,
  ProductStatus,
  ProductImageItem,
  EffectiveCategoryAttributes,
  CategoryAttributeItem,
  ProductAttributeValueInput,
} from '@/types/product';
import { Supplier } from '@/types/supplier';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';
import HierarchicalCategorySelector from '@/components/products/HierarchicalCategorySelector';

export interface StagedFile {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
}

export default function ProductsPage() {
  const { user, isLoading: authLoading, selectedCity } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Bulk Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationVariant;
    action: () => Promise<void>;
    affectedCount?: number;
    affectedNames?: string[];
    isIrreversible?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Modal State for Add / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  // Image Upload and Gallery State
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImageItem[]>([]);
  const [isDeletingImageId, setIsDeletingImageId] = useState<string | null>(null);
  const [isSettingPrimaryId, setIsSettingPrimaryId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDetailImageIndex, setActiveDetailImageIndex] = useState(0);

  // Cascading categories for modal
  const [sellerCategories, setSellerCategories] = useState<Category[]>([]);
  const [isLoadingSellerCategories, setIsLoadingSellerCategories] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Category-driven attributes and logistics state
  const [effectiveCategoryConfig, setEffectiveCategoryConfig] = useState<EffectiveCategoryAttributes | null>(null);
  const [isLoadingEffectiveAttributes, setIsLoadingEffectiveAttributes] = useState(false);
  // Map of attributeDefinitionId -> values
  const [attributeFormValues, setAttributeFormValues] = useState<Record<string, {
    optionId?: string | null;
    valueText?: string;
    valueNumber?: number | '';
    valueBoolean?: boolean;
    valueDate?: string;
  }>>({});
  // Safeguard modal state when switching category with existing entered attribute data
  const [categorySwitchWarningModal, setCategorySwitchWarningModal] = useState<{
    isOpen: boolean;
    newCategoryId: string;
  }>({ isOpen: false, newCategoryId: '' });

  // Form State with Seller / Owner FIRST, sequential itemCode read-only, and packagingUnit removed
  const [formData, setFormData] = useState({
    name: '',
    itemCode: '',
    sellerId: '',
    sellerName: '',
    categoryId: '',
    description: '',
    costPrice: 0,
    sellingPrice: 5000,
    originalPrice: 5000,
    discountPercent: 0,
    weight: null as number | null,
    unit: null as string | null,
    cityAvailability: ['All Cities'],
    status: 'ACTIVE' as ProductStatus,
  });

  const canEdit = hasPermission(user?.role, 'products:edit');

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, supRes] = await Promise.all([
        productsApi.getAll(selectedCity, selectedCategory !== 'all' ? selectedCategory : undefined),
        categoriesApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setProducts(prodRes);
      setAllCategories(catRes);
      setSuppliers(supRes);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, selectedCategory]);

  useEffect(() => {
    if (authLoading || !user) return;
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [prodRes, catRes, supRes] = await Promise.all([
          productsApi.getAll(selectedCity, selectedCategory !== 'all' ? selectedCategory : undefined),
          categoriesApi.getAll(),
          suppliersApi.getAll(),
        ]);
        if (isMounted) {
          setProducts(prodRes);
          setAllCategories(catRes);
          setSuppliers(supRes);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Failed to load products:', e);
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [selectedCity, selectedCategory, authLoading, user]);

  // Load seller-assigned categories when seller is selected in modal
  const loadSellerCategories = async (sellerId: string, preselectedCategoryId?: string) => {
    if (!sellerId) {
      setSellerCategories([]);
      return;
    }
    setIsLoadingSellerCategories(true);
    try {
      const cats = await categoriesApi.getBySeller(sellerId);
      setSellerCategories(cats);
      // If previous category not in new seller's categories, reset or use preselected
      if (preselectedCategoryId && cats.some((c) => c.id === preselectedCategoryId)) {
        setFormData((prev) => ({ ...prev, categoryId: preselectedCategoryId }));
      } else if (cats.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: cats[0].id }));
      } else {
        setFormData((prev) => ({ ...prev, categoryId: '' }));
      }
    } catch (err) {
      console.error('Failed to load categories for seller:', err);
      setSellerCategories([]);
    } finally {
      setIsLoadingSellerCategories(false);
    }
  };

  // Fast lookup map for full category breadcrumb path derivation
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    allCategories.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCategories]);

  const getFullCategoryPathName = useCallback(
    (catId?: string) => {
      if (!catId || !categoriesMap.has(catId)) return null;
      const path: string[] = [];
      let curId: string | null | undefined = catId;
      const visited = new Set<string>();

      while (curId && categoriesMap.has(curId) && !visited.has(curId)) {
        visited.add(curId);
        const catItem: Category | undefined = categoriesMap.get(curId);
        if (!catItem) break;
        path.unshift(catItem.name);
        curId = catItem.parentId;
      }

      return path.length > 0 ? path.join(' / ') : null;
    },
    [categoriesMap]
  );

  // Filtered in-memory records
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = debouncedSearch.toLowerCase().trim();
      const code = p.itemCode || p.sku || '';
      const fullPath = getFullCategoryPathName(p.marketplaceCategoryId) || '';
      const catName = typeof p.category === 'string' ? p.category : p.category?.name || '';
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        fullPath.toLowerCase().includes(q) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(q));

      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      const matchesSeller = selectedSeller === 'all' || p.sellerId === selectedSeller;
      const matchesCategory = selectedCategory === 'all' || p.marketplaceCategoryId === selectedCategory;

      return matchesSearch && matchesStatus && matchesSeller && matchesCategory;
    });
  }, [products, debouncedSearch, selectedStatus, selectedSeller, selectedCategory, getFullCategoryPathName]);

  // Paginated records
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safePage, pageSize]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedProducts.map((p) => p.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedProducts.map((p) => p.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedIds.includes(p.id));

  // Destructive / Action modal triggers
  const promptToggleStatus = (product: Product) => {
    const isActivating = product.status !== 'ACTIVE';
    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Activate Marketplace Product' : 'Deactivate Marketplace Product',
      message: isActivating
        ? `Are you sure you want to activate "${product.name}" [${product.itemCode}]? It will become visible and orderable in the consumer marketplace.`
        : `Are you sure you want to deactivate "${product.name}" [${product.itemCode}]? It will be hidden from customer storefronts.`,
      variant: isActivating ? 'success' : 'warning',
      confirmLabel: isActivating ? 'Activate' : 'Deactivate',
      affectedCount: 1,
      affectedNames: [`${product.name} [${product.itemCode}]`],
      action: async () => {
        const updated = await productsApi.toggleStatus(product.id);
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      },
    });
  };

  const promptArchiveProduct = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      title: 'Archive Marketplace Product',
      message: `Are you sure you want to archive product "${product.name}" [${product.itemCode}]? This will remove it from active catalog views.`,
      variant: 'danger',
      confirmLabel: 'Archive Product',
      affectedCount: 1,
      affectedNames: [`${product.name} [${product.itemCode}]`],
      isIrreversible: true,
      action: async () => {
        await productsApi.delete(product.id);
        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: 'ARCHIVED' } : p)));
      },
    });
  };

  const promptDeleteProduct = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      title: 'Permanently Delete Product',
      message: `This will permanently remove "${product.name}" [${product.itemCode}] and all its images from the database. This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete Forever',
      affectedCount: 1,
      affectedNames: [`${product.name} [${product.itemCode}]`],
      isIrreversible: true,
      action: async () => {
        await productsApi.delete(product.id);
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        setSelectedIds((prev) => prev.filter((id) => id !== product.id));
      },
    });
  };

  const promptBulkDelete = () => {
    const count = selectedIds.length;
    const names = products
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => `${p.name} (${p.itemCode})`);

    setConfirmModal({
      isOpen: true,
      title: 'Permanently Delete Selected Products',
      message: `You are about to permanently delete ${count} product(s) and all their images from the database. This cannot be undone.`,
      variant: 'danger',
      confirmLabel: `Delete ${count} Product${count !== 1 ? 's' : ''} Forever`,
      affectedCount: count,
      affectedNames: names,
      isIrreversible: true,
      action: async () => {
        await productsApi.bulkDelete(selectedIds);
        setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      },
    });
  };

  const promptBulkStatus = (newStatus: 'ACTIVE' | 'INACTIVE') => {
    const count = selectedIds.length;
    const names = products
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => `${p.name} (${p.itemCode})`);

    const isActivating = newStatus === 'ACTIVE';

    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Bulk Activate Products' : 'Bulk Deactivate Products',
      message: isActivating
        ? `You are about to activate ${count} marketplace product(s). They will be live and purchasable by buyers.`
        : `You are about to deactivate ${count} marketplace product(s). They will immediately be delisted from active customer searches.`,
      variant: isActivating ? 'success' : 'danger',
      confirmLabel: isActivating ? 'Activate Selected' : 'Deactivate Selected',
      affectedCount: count,
      affectedNames: names,
      action: async () => {
        await productsApi.bulkUpdateStatus(selectedIds, newStatus);
        setProducts((prev) =>
          prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status: newStatus } : p))
        );
        setSelectedIds([]);
      },
    });
  };

  const handleConfirmModalAction = async () => {
    try {
      setIsConfirming(true);
      await confirmModal.action();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsConfirming(false);
    }
  };

  // File validation and staging for image uploads
  const validateAndAddFiles = (files: FileList | File[]) => {
    setFormError(null);
    const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
    const MAX_TOTAL = 10;

    const currentCount = stagedFiles.length + existingImages.length;
    if (currentCount + files.length > MAX_TOTAL) {
      setFormError(`You can upload a maximum of ${MAX_TOTAL} images per product.`);
      return;
    }

    const newStaged: StagedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const validExt = ALLOWED_EXTS.includes(ext);
      const validType = ALLOWED_MIMES.includes(file.type);

      if (!validExt || !validType) {
        setFormError(`"${file.name}" has an unsupported format. Allowed formats: JPG, JPEG, PNG, WEBP.`);
        return;
      }

      if (file.size > MAX_SIZE) {
        setFormError(`"${file.name}" exceeds the 5MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }

      const isFirst =
        stagedFiles.length === 0 &&
        newStaged.length === 0 &&
        !existingImages.some((img) => img.isPrimary);

      newStaged.push({
        id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        isPrimary: isFirst,
      });
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      const filtered = prev.filter((item) => item.id !== id);
      if (target?.isPrimary && filtered.length > 0 && !existingImages.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleSetPrimaryStaged = (id: string) => {
    setExistingImages((prev) => prev.map((img) => ({ ...img, isPrimary: false })));
    setStagedFiles((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    );
  };

  const handleSetPrimaryExisting = async (imageId: string) => {
    if (!editingProduct) return;
    setIsSettingPrimaryId(imageId);
    try {
      await productsApi.setPrimaryImage(editingProduct.id, imageId);
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.id === imageId,
        }))
      );
      setStagedFiles((prev) => prev.map((item) => ({ ...item, isPrimary: false })));
      refreshData();
    } catch (err) {
      console.error('Failed to set primary image:', err);
      setFormError('Failed to set primary image. Please try again.');
    } finally {
      setIsSettingPrimaryId(null);
    }
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    if (!editingProduct) return;
    setIsDeletingImageId(imageId);
    try {
      await productsApi.deleteImage(editingProduct.id, imageId);
      setExistingImages((prev) => {
        const remaining = prev.filter((img) => img.id !== imageId);
        if (remaining.length > 0 && !remaining.some((img) => img.isPrimary) && stagedFiles.length === 0) {
          remaining[0].isPrimary = true;
        }
        return remaining;
      });
      refreshData();
    } catch (err) {
      console.error('Failed to delete image:', err);
      setFormError('Failed to delete image from Cloudinary storage.');
    } finally {
      setIsDeletingImageId(null);
    }
  };

  const handleCloseModal = () => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setStagedFiles([]);
    setExistingImages([]);
    setIsModalOpen(false);
  };

  // Load effective attributes and logistics configuration whenever a category is chosen
  const loadEffectiveCategoryAttributes = useCallback(async (catId: string, existingAttrValues?: any[]) => {
    if (!catId) {
      setEffectiveCategoryConfig(null);
      setAttributeFormValues({});
      return;
    }
    setIsLoadingEffectiveAttributes(true);
    try {
      const config = await categoriesApi.getEffectiveAttributes(catId);
      setEffectiveCategoryConfig(config);

      // Populate attribute form values if existing, or default
      const initialValues: Record<string, any> = {};
      if (existingAttrValues && existingAttrValues.length > 0) {
        existingAttrValues.forEach((av: any) => {
          initialValues[av.attributeDefinitionId] = {
            optionId: av.optionId || null,
            valueText: av.valueText || '',
            valueNumber: av.valueNumber !== null && av.valueNumber !== undefined ? av.valueNumber : '',
            valueBoolean: av.valueBoolean !== null && av.valueBoolean !== undefined ? av.valueBoolean : false,
            valueDate: av.valueDate ? av.valueDate.substring(0, 10) : '',
          };
        });
      }
      setAttributeFormValues(initialValues);
    } catch (err) {
      console.error('Failed to load effective category attributes:', err);
      setEffectiveCategoryConfig(null);
    } finally {
      setIsLoadingEffectiveAttributes(false);
    }
  }, []);

  const handleOpenAdd = () => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setStagedFiles([]);
    setExistingImages([]);
    setEditingProduct(null);
    setFormError(null);
    setEffectiveCategoryConfig(null);
    setAttributeFormValues({});
    const activeSuppliers = suppliers.filter((s) => s.status === 'ACTIVE');
    const defaultSup = activeSuppliers[0] || suppliers[0];
    const initialSellerId = defaultSup ? defaultSup.id : '';

    setFormData({
      name: '',
      itemCode: '', // Generated server-side automatically
      sellerId: initialSellerId,
      sellerName: defaultSup ? defaultSup.companyName : '',
      categoryId: '',
      description: '',
      costPrice: 0,
      sellingPrice: 1000,
      originalPrice: 1000,
      discountPercent: 0,
      weight: null,
      unit: null,
      cityAvailability: ['All Cities'],
      status: 'ACTIVE',
    });

    if (initialSellerId) {
      loadSellerCategories(initialSellerId);
    } else {
      setSellerCategories([]);
    }

    setIsModalOpen(true);
  };

  const handleOpenEdit = async (product: Product) => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setStagedFiles([]);
    setExistingImages(product.productImages || []);
    setEditingProduct(product);
    setFormError(null);
    const sellerId = product.sellerId || (product.seller ? product.seller.id : '');
    const categoryId = product.marketplaceCategoryId || product.categoryId || '';

    setFormData({
      name: product.name,
      itemCode: product.itemCode || product.sku || '',
      sellerId,
      sellerName: product.sellerName || (product.seller ? product.seller.companyName : ''),
      categoryId,
      description: product.description || '',
      costPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice,
      originalPrice: product.originalPrice || product.sellingPrice,
      discountPercent: product.discountPercent || 0,
      weight: product.weight !== null && product.weight !== undefined ? Number(product.weight) : null,
      unit: product.unit || null,
      cityAvailability: product.cityAvailability || ['All Cities'],
      status: product.status,
    });

    if (sellerId) {
      loadSellerCategories(sellerId, categoryId);
    }

    if (categoryId) {
      // Also fetch detailed product by ID if attributeValues are not yet populated on list view
      let attrValues = product.attributeValues;
      if (!attrValues) {
        try {
          const detailed = await productsApi.getById(product.id);
          attrValues = detailed.attributeValues;
        } catch (e) {
          console.error('Failed to get product attributes by ID:', e);
        }
      }
      loadEffectiveCategoryAttributes(categoryId, attrValues);
    }

    setIsModalOpen(true);
  };

  // Safe category selection with warning if existing attributes were modified
  const handleCategorySelectionAttempt = (newCategoryId: string) => {
    if (newCategoryId === formData.categoryId) return;

    // Check if user already entered attribute data for the current category
    const hasEnteredAttributeData = Object.values(attributeFormValues).some(
      (v) => v.optionId || (v.valueText && v.valueText.trim().length > 0) || (v.valueNumber !== '' && v.valueNumber !== undefined)
    );

    if (hasEnteredAttributeData) {
      // Trigger confirmation modal
      setCategorySwitchWarningModal({
        isOpen: true,
        newCategoryId,
      });
      return;
    }

    // Direct switch
    applyCategoryChange(newCategoryId);
  };

  const applyCategoryChange = (newCategoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: newCategoryId,
    }));
    loadEffectiveCategoryAttributes(newCategoryId);
    setCategorySwitchWarningModal({ isOpen: false, newCategoryId: '' });
  };

  const handleSellerChange = (newSellerId: string) => {
    const selected = suppliers.find((s) => s.id === newSellerId);
    setFormData((prev) => ({
      ...prev,
      sellerId: newSellerId,
      sellerName: selected ? selected.companyName : '',
    }));
  };

  const handlePriceChange = (orig: number, disc: number) => {
    const discounted = Math.round(orig * (1 - disc / 100));
    setFormData((prev) => ({
      ...prev,
      originalPrice: orig,
      discountPercent: disc,
      sellingPrice: disc > 0 ? discounted : orig,
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sellerId) {
      setFormError('Please select a Product Owner / Seller first.');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Please select a valid Marketplace Category assigned to this seller.');
      return;
    }

    // Logistics: Unit & Weight removed from Super Admin product creation/edit
    let finalWeight: number | null = editingProduct && editingProduct.weight !== null ? Number(editingProduct.weight) : null;
    let finalUnit: string | null = editingProduct && editingProduct.unit ? editingProduct.unit : null;

    if (formData.sellingPrice <= 0) {
      setFormError('Marketplace selling price must be greater than 0.');
      return;
    }

    // Validate Required Category Attributes
    const activeAttributes = effectiveCategoryConfig?.attributes || [];
    for (const attr of activeAttributes) {
      if (attr.isRequired) {
        const val = attributeFormValues[attr.id];
        const hasVal = val && (
          val.optionId ||
          (val.valueText && val.valueText.trim().length > 0) ||
          (val.valueNumber !== '' && val.valueNumber !== undefined) ||
          val.valueBoolean !== undefined ||
          val.valueDate
        );
        if (!hasVal) {
          setFormError(`Required category attribute "${attr.name}" must be specified.`);
          return;
        }
      }
    }

    // Package attributeValues payload
    const preparedAttributeValues: ProductAttributeValueInput[] = [];
    activeAttributes.forEach((attr) => {
      const val = attributeFormValues[attr.id];
      if (!val) return;

      if (attr.type === 'SELECT' || attr.type === 'MULTI_SELECT') {
        if (val.optionId) {
          preparedAttributeValues.push({
            attributeDefinitionId: attr.id,
            optionId: val.optionId,
          });
        }
      } else if (attr.type === 'TEXT') {
        if (val.valueText && val.valueText.trim().length > 0) {
          preparedAttributeValues.push({
            attributeDefinitionId: attr.id,
            valueText: val.valueText.trim(),
          });
        }
      } else if (attr.type === 'NUMBER') {
        if (val.valueNumber !== '' && val.valueNumber !== undefined && !isNaN(Number(val.valueNumber))) {
          preparedAttributeValues.push({
            attributeDefinitionId: attr.id,
            valueNumber: Number(val.valueNumber),
          });
        }
      } else if (attr.type === 'BOOLEAN') {
        if (val.valueBoolean !== undefined && val.valueBoolean !== null) {
          preparedAttributeValues.push({
            attributeDefinitionId: attr.id,
            valueBoolean: Boolean(val.valueBoolean),
          });
        }
      } else if (attr.type === 'DATE') {
        if (val.valueDate) {
          preparedAttributeValues.push({
            attributeDefinitionId: attr.id,
            valueDate: new Date(val.valueDate).toISOString(),
          });
        }
      }
    });

    setIsSaving(true);
    try {
      if (editingProduct) {
        // Update product (strictly omit itemCode and packagingUnit)
        await productsApi.update(editingProduct.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          sellerId: formData.sellerId,
          marketplaceCategoryId: formData.categoryId,
          unit: finalUnit,
          weight: finalWeight,
          costPrice: formData.costPrice > 0 ? Number(formData.costPrice) : null,
          originalPrice: formData.originalPrice > 0 ? Number(formData.originalPrice) : null,
          sellingPrice: Number(formData.sellingPrice),
          discountPercent: Number(formData.discountPercent || 0),
          cityAvailability: formData.cityAvailability,
          status: formData.status,
          attributeValues: preparedAttributeValues,
        });

        // Upload any staged images for the existing product
        if (stagedFiles.length > 0) {
          for (const item of stagedFiles) {
            await productsApi.uploadImage(editingProduct.id, item.file, item.isPrimary);
          }
        }
      } else {
        // Create new product with multipart/form-data for image streaming
        const formPayload = new FormData();
        formPayload.append('name', formData.name.trim());
        if (formData.description.trim()) {
          formPayload.append('description', formData.description.trim());
        }
        formPayload.append('sellerId', formData.sellerId);
        formPayload.append('marketplaceCategoryId', formData.categoryId);
        if (finalUnit) formPayload.append('unit', finalUnit);
        if (finalWeight !== null) formPayload.append('weight', String(finalWeight));
        if (formData.costPrice > 0) {
          formPayload.append('costPrice', String(formData.costPrice));
        }
        if (formData.originalPrice > 0) {
          formPayload.append('originalPrice', String(formData.originalPrice));
        }
        formPayload.append('sellingPrice', String(formData.sellingPrice));
        formPayload.append('discountPercent', String(formData.discountPercent || 0));
        formPayload.append('status', formData.status);
        formData.cityAvailability.forEach((city) => {
          formPayload.append('cityAvailability', city);
        });
        if (preparedAttributeValues.length > 0) {
          formPayload.append('attributeValues', JSON.stringify(preparedAttributeValues));
        }

        const sortedFiles = [...stagedFiles].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        sortedFiles.forEach((item) => {
          formPayload.append('images', item.file);
        });

        await productsApi.create(formPayload);
      }

      stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setStagedFiles([]);
      setExistingImages([]);
      setIsModalOpen(false);
      refreshData();
    } catch (err: unknown) {
      console.error('Failed to save product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save product. Please verify seller category assignment.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedSeller('all');
    setSelectedStatus('ALL');
  };

  const renderStatusBadge = (status: ProductStatus | string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="ardab-badge badge-success-soft">ACTIVE</span>;
      case 'DRAFT':
        return <span className="ardab-badge badge-warning-soft">DRAFT</span>;
      case 'OUT_OF_STOCK':
        return <span className="ardab-badge badge-danger-soft">OUT OF STOCK</span>;
      case 'ARCHIVED':
        return <span className="ardab-badge bg-secondary text-white">ARCHIVED</span>;
      default:
        return <span className="ardab-badge badge-neutral-soft">{status || 'INACTIVE'}</span>;
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Product Catalog & Pricing"
        subtitle="Manage platform commodities with sequential server-generated Item Codes, seller category binding, and live pricing"
        breadcrumbs={[{ label: 'Marketplace' }, { label: 'Products' }]}
        actions={
          canEdit ? (
            <button
              type="button"
              className="btn btn-ardab-primary d-flex align-items-center gap-2"
              onClick={handleOpenAdd}
            >
              <i className="bi bi-plus-lg"></i>
              <span>Post New Product</span>
            </button>
          ) : undefined
        }
      >
        {/* Filter Controls Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by product name, item code, seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Seller Filter */}
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <option value="all">All Product Owners / Sellers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="col-6 col-md-1 d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-light border w-100"
                title="Reset Filters"
                onClick={handleResetFilters}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && canEdit && (
            <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small text-muted">
                <strong>{selectedIds.length}</strong> product(s) selected
              </span>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => promptBulkStatus('ACTIVE')}
                >
                  <i className="bi bi-check-circle me-1"></i> Bulk Activate
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => promptBulkStatus('INACTIVE')}
                >
                  <i className="bi bi-x-circle me-1"></i> Bulk Deactivate
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  title="Permanently delete selected products"
                  onClick={() => promptBulkDelete()}
                >
                  <i className="bi bi-trash3 me-1"></i> Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Table (Desktop) */}
        <div className="ardab-card d-none d-lg-block mb-4">
          <div className="table-responsive">
            <table className="table ardab-table align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all on current page"
                    />
                  </th>
                  <th>Product & Item Code</th>
                  <th>Product Owner (Seller)</th>
                  <th>Category</th>
                  <th>Selling Price</th>
                  <th>Unit Weight</th>
                  <th>City Scope</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} columns={9} />
              ) : paginatedProducts.length > 0 ? (
                <tbody>
                  {paginatedProducts.map((p) => {
                    const catName = typeof p.category === 'string' ? p.category : p.category?.name || 'General';
                    const code = p.itemCode || p.sku || 'PENDING';
                    return (
                      <tr key={p.id} className={selectedIds.includes(p.id) ? 'table-primary' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => handleSelectOne(p.id)}
                            aria-label={`Select ${p.name}`}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            {(() => {
                              const thumb =
                                p.primaryImage?.thumbnailUrl ||
                                p.primaryImage?.url ||
                                (typeof p.images?.[0] === 'string'
                                  ? p.images[0]
                                  : (p.images?.[0] as ProductImageItem)?.url) ||
                                p.imageUrl;
                              if (thumb) {
                                return (
                                  <img
                                    src={thumb}
                                    alt={p.name}
                                    className="rounded-2 border object-fit-cover flex-shrink-0"
                                    style={{ width: 44, height: 44 }}
                                    loading="lazy"
                                  />
                                );
                              }
                              return (
                                <div
                                  className="ardab-icon-box icon-box-green flex-shrink-0"
                                  style={{ width: 44, height: 44, fontSize: '1.15rem' }}
                                >
                                  <i className="bi bi-box-seam"></i>
                                </div>
                              );
                            })()}
                            <div>
                              <div className="fw-bold text-dark">{p.name}</div>
                              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                <code className="text-primary fw-semibold">{code}</code>
                                {p.unit ? ` • Unit: ${p.unit}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark small">
                            <i className="bi bi-building me-1 text-muted"></i>
                            {p.sellerName || (p.seller ? p.seller.companyName : 'Direct Marketplace')}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const fullPath = getFullCategoryPathName(p.marketplaceCategoryId);
                            return (
                              <div>
                                <span className="text-dark fw-medium small">{catName}</span>
                                {fullPath && fullPath !== catName && (
                                  <div className="text-muted small text-truncate" style={{ fontSize: '0.7rem', maxWidth: 180 }} title={fullPath}>
                                    <i className="bi bi-diagram-2 me-1 text-secondary"></i>
                                    {fullPath}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          {p.discountPercent && p.discountPercent > 0 ? (
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-success fs-6">
                                  {formatCurrency(p.sellingPrice)}
                                </span>
                                <span className="badge badge-warning-soft" style={{ fontSize: '0.65rem' }}>
                                  {p.discountPercent}% OFF
                                </span>
                              </div>
                              <span
                                className="text-muted text-decoration-line-through small"
                                style={{ fontSize: '0.75rem' }}
                              >
                                {p.originalPrice ? formatCurrency(p.originalPrice) : ''}
                              </span>
                            </div>
                          ) : (
                            <div className="fw-bold text-dark fs-6">
                              {formatCurrency(p.sellingPrice)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral-soft">
                            {formatWeight(p.weight || p.weightKg || 0)}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {(p.cityAvailability || ['All Cities']).map((city) => (
                              <span
                                key={city}
                                className="badge bg-light text-dark border"
                                style={{ fontSize: '0.65rem' }}
                              >
                                {city}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{renderStatusBadge(p.status)}</td>
                        <td className="text-end">
                          <div className="d-inline-flex align-items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="View Details"
                              onClick={() => setViewProduct(p)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border"
                                  title="Edit Product"
                                  onClick={() => handleOpenEdit(p)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    p.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                                  }`}
                                  title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                  onClick={() => promptToggleStatus(p)}
                                >
                                  <i
                                    className={`bi ${
                                      p.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'
                                    }`}
                                  ></i>
                                </button>
                                {p.status !== 'ARCHIVED' && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Archive Product"
                                    onClick={() => promptArchiveProduct(p)}
                                  >
                                    <i className="bi bi-archive"></i>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  title="Permanently Delete Product"
                                  onClick={() => promptDeleteProduct(p)}
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>

            {!isLoading && paginatedProducts.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon="bi-box-seam"
                  title="No marketplace products match your criteria"
                  description="Try adjusting your search terms, changing the category filter, or resetting all filters."
                  actionLabel="Reset Search & Filters"
                  onAction={handleResetFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* Product Cards (Mobile & Tablet) */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {isLoading ? (
            <div className="ardab-card p-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading products...
            </div>
          ) : paginatedProducts.length > 0 ? (
            paginatedProducts.map((p) => {
              const catName = typeof p.category === 'string' ? p.category : p.category?.name || 'General';
              const code = p.itemCode || p.sku || 'PENDING';
              return (
                <div
                  key={p.id}
                  className={`ardab-card p-3 ${selectedIds.includes(p.id) ? 'border-primary' : ''}`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleSelectOne(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                      {(() => {
                        const thumb =
                          p.primaryImage?.thumbnailUrl ||
                          p.primaryImage?.url ||
                          (typeof p.images?.[0] === 'string'
                            ? p.images[0]
                            : (p.images?.[0] as ProductImageItem)?.url) ||
                          p.imageUrl;
                        if (thumb) {
                          return (
                            <img
                              src={thumb}
                              alt={p.name}
                              className="rounded-2 border object-fit-cover flex-shrink-0"
                              style={{ width: 40, height: 40 }}
                              loading="lazy"
                            />
                          );
                        }
                        return (
                          <div
                            className="ardab-icon-box icon-box-green flex-shrink-0"
                            style={{ width: 40, height: 40, fontSize: '1rem' }}
                          >
                            <i className="bi bi-box-seam"></i>
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="h6 fw-bold text-dark mb-0">{p.name}</h3>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          <code className="text-primary">{code}</code> &bull; {catName}
                        </span>
                      </div>
                    </div>
                    {renderStatusBadge(p.status)}
                  </div>

                  {/* Seller attribution */}
                  <div className="p-2 bg-light rounded-2 small text-muted mb-2">
                    Owner / Seller: <strong className="text-dark">{p.sellerName || (p.seller ? p.seller.companyName : 'Direct Marketplace')}</strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                    <div>
                      <span className="fw-bold text-dark fs-6">{formatCurrency(p.sellingPrice)}</span>
                      <span className="text-muted small ms-1">/ {p.unit}</span>
                    </div>
                    <span className="badge badge-neutral-soft">{formatWeight(p.weight || p.weightKg || 0)}</span>
                  </div>

                  <div className="d-flex gap-1 flex-wrap mb-3">
                    {(p.cityAvailability || ['All Cities']).map((city) => (
                      <span
                        key={city}
                        className="badge bg-light text-dark border"
                        style={{ fontSize: '0.65rem' }}
                      >
                        {city}
                      </span>
                    ))}
                  </div>

                  <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      onClick={() => setViewProduct(p)}
                    >
                      <i className="bi bi-eye me-1"></i> View
                    </button>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <i className="bi bi-pencil me-1"></i> Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            p.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                          }`}
                          onClick={() => promptToggleStatus(p)}
                        >
                          {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          title="Permanently Delete Product"
                          onClick={() => promptDeleteProduct(p)}
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon="bi-box-seam"
              title="No marketplace products match your criteria"
              description="Try adjusting your search terms, changing the category filter, or resetting all filters."
              actionLabel="Reset Search & Filters"
              onAction={handleResetFilters}
            />
          )}
        </div>

        {/* Server-ready Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredProducts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />

        {/* Modal: Add / Edit Product with Seller First & Cascading Categories */}
        {isModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      {editingProduct ? 'Edit Product & Pricing' : 'Post New Marketplace Product'}
                    </h5>
                    <span className="text-muted small">
                      Select product owner / seller first, bind category, and specify standard units
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  ></button>
                </div>

                <form onSubmit={handleSaveProduct}>
                  <div className="modal-body p-4">
                    {formError && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                        <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                        <div className="small">{formError}</div>
                      </div>
                    )}

                    <div className="row g-3">
                      {/* 1. SELLER / PRODUCT OWNER FIRST */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Product Owner / Seller (Supplier) <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={formData.sellerId}
                          onChange={(e) => handleSellerChange(e.target.value)}
                        >
                          <option value="">-- Select Product Owner / Seller --</option>
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.companyName} ({sup.city}) {sup.status !== 'ACTIVE' ? `[${sup.status}]` : ''}
                            </option>
                          ))}
                        </select>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          Assign this product to any active seller or enterprise partner
                        </span>
                      </div>

                      {/* 2. DYNAMIC HIERARCHICAL MARKETPLACE CATEGORY SELECTOR */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">
                          Marketplace Category Hierarchy <span className="text-danger">*</span>
                        </label>
                        <HierarchicalCategorySelector
                          selectedCategoryId={formData.categoryId}
                          disabled={!formData.sellerId}
                          onSelectCategory={(chosenId) => {
                            handleCategorySelectionAttempt(chosenId);
                          }}
                        />
                      </div>

                      {/* 3. PRODUCT NAME */}
                      <div className="col-md-8">
                        <label className="form-label fw-semibold">
                          Product Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Magna White Teff Grade 1"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      {/* 4. ITEM CODE (READ-ONLY, AUTO-GENERATED SERVER-SIDE) */}
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Item Code</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light text-muted">
                            <i className="bi bi-upc-scan"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control bg-light text-muted font-monospace fw-semibold"
                            readOnly
                            value={editingProduct ? (editingProduct.itemCode || editingProduct.sku || '') : '[Auto-generated upon save]'}
                          />
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {editingProduct
                            ? 'Server-assigned sequential code (strictly immutable)'
                            : 'Atomic sequence format (e.g. ARDAB-000001)'}
                        </span>
                      </div>

                      {/* 5. DESCRIPTION */}
                      <div className="col-12">
                        <label className="form-label">Product Description</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Specify quality characteristics, origin highlands, cleaning standards..."
                        ></textarea>
                      </div>

                      {/* 6. DYNAMIC CATEGORY ATTRIBUTES & VARIANTS */}
                      {formData.categoryId && (
                        <div className="col-12">
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                <i className="bi bi-tags-fill text-primary"></i>
                                Category Specifications & Attributes
                              </h6>
                              {effectiveCategoryConfig && (
                                <span className="badge bg-white text-dark border small">
                                  {effectiveCategoryConfig.categoryName}
                                </span>
                              )}
                            </div>

                            {isLoadingEffectiveAttributes ? (
                              <div className="text-center py-3 text-muted small">
                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                Loading category attributes...
                              </div>
                            ) : effectiveCategoryConfig && effectiveCategoryConfig.attributes.length > 0 ? (
                              <div className="row g-3">
                                {effectiveCategoryConfig.attributes.map((attr) => {
                                  const currentVal = attributeFormValues[attr.id] || {};
                                  return (
                                    <div key={attr.id} className="col-12 col-md-6">
                                      <label className="form-label fw-semibold small d-flex align-items-center justify-content-between">
                                        <span>
                                          {attr.name}
                                          {attr.unit ? ` (${attr.unit})` : ''}
                                          {attr.isRequired && <span className="text-danger ms-1">*</span>}
                                        </span>
                                        {attr.source === 'INHERITED' && (
                                          <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                                            Inherited
                                          </span>
                                        )}
                                      </label>

                                      {/* SELECT TYPE */}
                                      {attr.type === 'SELECT' && (
                                        <select
                                          className="form-select form-select-sm"
                                          required={attr.isRequired}
                                          value={currentVal.optionId || ''}
                                          onChange={(e) =>
                                            setAttributeFormValues((prev) => ({
                                              ...prev,
                                              [attr.id]: { ...prev[attr.id], optionId: e.target.value || null },
                                            }))
                                          }
                                        >
                                          <option value="">-- Select {attr.name} --</option>
                                          {attr.options.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {/* MULTI_SELECT TYPE */}
                                      {attr.type === 'MULTI_SELECT' && (
                                        <div className="p-2 bg-white rounded border">
                                          <div className="d-flex flex-wrap gap-2">
                                            {attr.options.map((opt) => {
                                              const isChecked = currentVal.optionId === opt.id;
                                              return (
                                                <div key={opt.id} className="form-check form-check-inline mb-0">
                                                  <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name={`attr_${attr.id}`}
                                                    id={`opt_${opt.id}`}
                                                    checked={isChecked}
                                                    onChange={() =>
                                                      setAttributeFormValues((prev) => ({
                                                        ...prev,
                                                        [attr.id]: { ...prev[attr.id], optionId: opt.id },
                                                      }))
                                                    }
                                                  />
                                                  <label className="form-check-label small" htmlFor={`opt_${opt.id}`}>
                                                    {opt.label}
                                                  </label>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* TEXT TYPE */}
                                      {attr.type === 'TEXT' && (
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          required={attr.isRequired}
                                          placeholder={`Enter ${attr.name.toLowerCase()}`}
                                          value={currentVal.valueText || ''}
                                          onChange={(e) =>
                                            setAttributeFormValues((prev) => ({
                                              ...prev,
                                              [attr.id]: { ...prev[attr.id], valueText: e.target.value },
                                            }))
                                          }
                                        />
                                      )}

                                      {/* NUMBER TYPE */}
                                      {attr.type === 'NUMBER' && (
                                        <div className="input-group input-group-sm">
                                          <input
                                            type="number"
                                            className="form-control"
                                            required={attr.isRequired}
                                            placeholder="0"
                                            value={currentVal.valueNumber ?? ''}
                                            onChange={(e) =>
                                              setAttributeFormValues((prev) => ({
                                                ...prev,
                                                [attr.id]: {
                                                  ...prev[attr.id],
                                                  valueNumber: e.target.value === '' ? '' : Number(e.target.value),
                                                },
                                              }))
                                            }
                                          />
                                          {attr.unit && <span className="input-group-text">{attr.unit}</span>}
                                        </div>
                                      )}

                                      {/* BOOLEAN TYPE */}
                                      {attr.type === 'BOOLEAN' && (
                                        <div className="form-check form-switch mt-1">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`switch_${attr.id}`}
                                            checked={Boolean(currentVal.valueBoolean)}
                                            onChange={(e) =>
                                              setAttributeFormValues((prev) => ({
                                                ...prev,
                                                [attr.id]: { ...prev[attr.id], valueBoolean: e.target.checked },
                                              }))
                                            }
                                          />
                                          <label className="form-check-label small" htmlFor={`switch_${attr.id}`}>
                                            {currentVal.valueBoolean ? 'Yes / Enabled' : 'No / Disabled'}
                                          </label>
                                        </div>
                                      )}

                                      {/* DATE TYPE */}
                                      {attr.type === 'DATE' && (
                                        <input
                                          type="date"
                                          className="form-control form-control-sm"
                                          required={attr.isRequired}
                                          value={currentVal.valueDate || ''}
                                          onChange={(e) =>
                                            setAttributeFormValues((prev) => ({
                                              ...prev,
                                              [attr.id]: { ...prev[attr.id], valueDate: e.target.value },
                                            }))
                                          }
                                        />
                                      )}

                                      {attr.description && (
                                        <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
                                          {attr.description}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-2 text-muted small">
                                <i className="bi bi-info-circle me-1"></i>
                                No custom attribute specifications defined for this category.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 7. PRICING & VALUATION */}
                      <div className="col-12">
                        <div className="p-3 bg-light rounded-3 border">
                          <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-cash-stack text-success"></i>
                            Pricing & Valuation
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label small fw-semibold">Cost Price / Base ETB (Optional)</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  value={formData.costPrice || ''}
                                  onChange={(e) =>
                                    setFormData({ ...formData, costPrice: Number(e.target.value) })
                                  }
                                  placeholder="0.00"
                                />
                                <span className="input-group-text small">ETB</span>
                              </div>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label small fw-semibold">Regular / Original Price (ETB) *</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  className="form-control"
                                  required
                                  min={1}
                                  value={formData.originalPrice}
                                  onChange={(e) =>
                                    handlePriceChange(Number(e.target.value), formData.discountPercent)
                                  }
                                />
                                <span className="input-group-text small">ETB</span>
                              </div>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label small fw-semibold">Discount Percent (%)</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  max={90}
                                  value={formData.discountPercent}
                                  onChange={(e) =>
                                    handlePriceChange(formData.originalPrice, Number(e.target.value))
                                  }
                                />
                                <span className="input-group-text small">%</span>
                              </div>
                            </div>

                            <div className="col-12">
                              <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border">
                                <span className="small text-muted fw-medium">Active Marketplace Selling Price:</span>
                                <span className="fs-5 fw-bold text-success">
                                  {formatCurrency(formData.sellingPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 8. STATUS LIFECYCLE */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Product Lifecycle Status</label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target.value as ProductStatus,
                            })
                          }
                        >
                          <option value="ACTIVE">Active (Live in Marketplace)</option>
                          <option value="DRAFT">Draft (Under Review)</option>
                          <option value="INACTIVE">Inactive (Hidden)</option>
                          <option value="OUT_OF_STOCK">Out of Stock</option>
                        </select>
                      </div>

                      {/* 9. CITY AVAILABILITY */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">City Availability</label>
                        <select
                          className="form-select"
                          value={formData.cityAvailability[0] || 'All Cities'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cityAvailability: [e.target.value],
                            })
                          }
                        >
                          <option value="All Cities">All Hub Cities</option>
                          <option value="Addis Ababa">Addis Ababa</option>
                          <option value="Bahir Dar">Bahir Dar</option>
                          <option value="Gondar">Gondar</option>
                          <option value="Hawassa">Hawassa</option>
                          <option value="Adama">Adama</option>
                        </select>
                      </div>

                      {/* 10. PRODUCT IMAGES (CLOUDINARY STORAGE GATEWAY) */}
                      <div className="col-12">
                        <div className="p-3 bg-light rounded-3 border">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                              <i className="bi bi-images text-primary"></i>
                              Product Images
                            </h6>
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              JPEG, PNG, WEBP &bull; Max 5MB per image &bull; Up to 10 images
                            </span>
                          </div>

                          {/* Drag & Drop Upload Zone */}
                          <div
                            className={`border rounded-3 p-3 text-center ${
                              isDragging ? 'bg-primary-subtle border-primary' : 'bg-white border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px' }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                              if (e.dataTransfer.files) {
                                validateAndAddFiles(e.dataTransfer.files);
                              }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp"
                              className="d-none"
                              onChange={(e) => {
                                if (e.target.files) {
                                  validateAndAddFiles(e.target.files);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="py-2">
                              <i className="bi bi-cloud-arrow-up text-primary fs-2 d-block mb-1"></i>
                              <div className="fw-semibold text-dark small">
                                Drag & drop product images here, or <span className="text-primary text-decoration-underline">browse files</span>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                Direct secure upload through Ardab gateway to Cloudinary
                              </div>
                            </div>
                          </div>

                          {/* Existing & Staged Image Previews */}
                          {(existingImages.length > 0 || stagedFiles.length > 0) && (
                            <div className="mt-3">
                              <div className="small fw-semibold text-muted mb-2">
                                Image Gallery ({existingImages.length + stagedFiles.length}/10):
                              </div>
                              <div className="row g-2">
                                {/* Existing Saved Images (When editing) */}
                                {existingImages.map((img) => (
                                  <div key={img.id} className="col-6 col-sm-4 col-md-3">
                                    <div className="position-relative rounded-2 border overflow-hidden bg-white shadow-sm">
                                      <img
                                        src={img.thumbnailUrl || img.url}
                                        alt="Product asset"
                                        className="w-100 object-fit-cover"
                                        style={{ height: 100 }}
                                      />
                                      {img.isPrimary && (
                                        <span
                                          className="position-absolute top-0 start-0 m-1 badge bg-success shadow-sm"
                                          style={{ fontSize: '0.65rem' }}
                                        >
                                          <i className="bi bi-star-fill me-1"></i> Primary
                                        </span>
                                      )}
                                      <div className="p-1 bg-light border-top d-flex align-items-center justify-content-between gap-1">
                                        {!img.isPrimary && (
                                          <button
                                            type="button"
                                            className="btn btn-xs btn-outline-primary py-0 px-1"
                                            style={{ fontSize: '0.7rem' }}
                                            title="Set as Primary Image"
                                            disabled={isSettingPrimaryId === img.id}
                                            onClick={() => handleSetPrimaryExisting(img.id)}
                                          >
                                            {isSettingPrimaryId === img.id ? '...' : 'Make Primary'}
                                          </button>
                                        )}
                                        {img.isPrimary && <span className="text-success small ms-1" style={{ fontSize: '0.7rem' }}>Primary</span>}
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-outline-danger py-0 px-1 ms-auto"
                                          style={{ fontSize: '0.7rem' }}
                                          title="Delete Image from Cloudinary"
                                          disabled={isDeletingImageId === img.id}
                                          onClick={() => handleDeleteExistingImage(img.id)}
                                        >
                                          {isDeletingImageId === img.id ? (
                                            <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} />
                                          ) : (
                                            <i className="bi bi-trash"></i>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Staged New Images (Pending upload on save) */}
                                {stagedFiles.map((item) => (
                                  <div key={item.id} className="col-6 col-sm-4 col-md-3">
                                    <div className="position-relative rounded-2 border overflow-hidden bg-white shadow-sm">
                                      <img
                                        src={item.preview}
                                        alt={item.file.name}
                                        className="w-100 object-fit-cover"
                                        style={{ height: 100 }}
                                      />
                                      <span
                                        className="position-absolute top-0 end-0 m-1 badge bg-info shadow-sm"
                                        style={{ fontSize: '0.65rem' }}
                                      >
                                        New
                                      </span>
                                      {item.isPrimary && (
                                        <span
                                          className="position-absolute top-0 start-0 m-1 badge bg-success shadow-sm"
                                          style={{ fontSize: '0.65rem' }}
                                        >
                                          <i className="bi bi-star-fill me-1"></i> Primary
                                        </span>
                                      )}
                                      <div className="p-1 bg-light border-top d-flex align-items-center justify-content-between gap-1">
                                        {!item.isPrimary && (
                                          <button
                                            type="button"
                                            className="btn btn-xs btn-outline-primary py-0 px-1"
                                            style={{ fontSize: '0.7rem' }}
                                            title="Set as Primary Image"
                                            onClick={() => handleSetPrimaryStaged(item.id)}
                                          >
                                            Make Primary
                                          </button>
                                        )}
                                        {item.isPrimary && <span className="text-success small ms-1" style={{ fontSize: '0.7rem' }}>Primary</span>}
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-outline-danger py-0 px-1 ms-auto"
                                          style={{ fontSize: '0.7rem' }}
                                          title="Remove File"
                                          onClick={() => handleRemoveStaged(item.id)}
                                        >
                                          <i className="bi bi-x-lg"></i>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline btn-sm"
                      disabled={isSaving}
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary btn-sm" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                          Saving...
                        </>
                      ) : editingProduct ? (
                        'Save Changes'
                      ) : (
                        'Publish Product'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Details */}
        {viewProduct && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{viewProduct.name}</h5>
                    <span className="text-muted small">
                      Owner: {viewProduct.sellerName || (viewProduct.seller ? viewProduct.seller.companyName : 'Direct Marketplace')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setViewProduct(null);
                      setActiveDetailImageIndex(0);
                    }}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {/* Image Gallery */}
                  {(() => {
                    const galleryImages: string[] = [];
                    if (viewProduct.productImages && viewProduct.productImages.length > 0) {
                      viewProduct.productImages.forEach((img) => galleryImages.push(img.url));
                    } else if (viewProduct.images && viewProduct.images.length > 0) {
                      viewProduct.images.forEach((img) => {
                        galleryImages.push(typeof img === 'string' ? img : img.url);
                      });
                    } else if (viewProduct.imageUrl) {
                      galleryImages.push(viewProduct.imageUrl);
                    }

                    if (galleryImages.length > 0) {
                      const activeImg = galleryImages[activeDetailImageIndex] || galleryImages[0];
                      return (
                        <div className="mb-4">
                          <div
                            className="w-100 bg-light rounded-3 border d-flex align-items-center justify-content-center overflow-hidden mb-2"
                            style={{ height: 260 }}
                          >
                            <img
                              src={activeImg}
                              alt={viewProduct.name}
                              className="img-fluid object-fit-contain"
                              style={{ maxHeight: 260 }}
                            />
                          </div>
                          {galleryImages.length > 1 && (
                            <div className="d-flex gap-2 overflow-auto pb-1">
                              {galleryImages.map((imgUrl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`btn p-0 rounded-2 border overflow-hidden flex-shrink-0 ${
                                    idx === activeDetailImageIndex ? 'border-primary border-2 shadow-sm' : 'opacity-75'
                                  }`}
                                  style={{ width: 56, height: 56 }}
                                  onClick={() => setActiveDetailImageIndex(idx)}
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className="w-100 h-100 object-fit-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="p-3 bg-light rounded-3 border text-center text-muted mb-4">
                        <i className="bi bi-images fs-3 d-block mb-1"></i>
                        <span className="small">No images uploaded for this commodity</span>
                      </div>
                    );
                  })()}

                  {viewProduct.description && (
                    <div className="mb-3">
                      <span className="text-muted small fw-semibold">Description</span>
                      <p className="text-dark small mt-1">{viewProduct.description}</p>
                    </div>
                  )}

                  <div className="row g-3 pt-2 border-top">
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Selling Price</div>
                      <div className="fw-bold fs-5 text-success">
                        {formatCurrency(viewProduct.sellingPrice)}
                      </div>
                      {viewProduct.discountPercent && viewProduct.discountPercent > 0 ? (
                        <div className="text-muted small">
                          <span className="text-decoration-line-through me-1">
                            {viewProduct.originalPrice ? formatCurrency(viewProduct.originalPrice) : ''}
                          </span>
                          <span className="badge badge-warning-soft">
                            {viewProduct.discountPercent}% OFF
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {viewProduct.costPrice && viewProduct.costPrice > 0 ? (
                      <div className="col-6 col-md-4">
                        <div className="text-muted small">Cost Price (Super Admin)</div>
                        <div className="fw-bold fs-5 text-muted">
                          {formatCurrency(viewProduct.costPrice)}
                        </div>
                      </div>
                    ) : null}
                    {/* Product Attribute Values Display */}
                    {viewProduct.attributeValues && viewProduct.attributeValues.length > 0 && (
                      <div className="col-12 border-top pt-3">
                        <div className="text-muted small fw-semibold mb-2">Category Specifications & Custom Attributes:</div>
                        <div className="row g-2">
                          {viewProduct.attributeValues.map((av) => (
                            <div key={av.id} className="col-6 col-md-4">
                              <div className="p-2 bg-light rounded-2 border">
                                <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                  {av.name || av.slug || 'Specification'}
                                </span>
                                <span className="fw-semibold text-dark small">
                                  {av.optionLabel ||
                                    av.optionValue ||
                                    av.valueText ||
                                    (av.valueNumber !== null && av.valueNumber !== undefined ? `${av.valueNumber} ${av.unit || ''}` : null) ||
                                    (av.valueBoolean !== null && av.valueBoolean !== undefined ? (av.valueBoolean ? 'Yes' : 'No') : null) ||
                                    (av.valueDate ? new Date(av.valueDate).toLocaleDateString() : '—')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Logistics Unit Weight</div>
                      <div className="fw-bold fs-5 text-dark">
                        {viewProduct.weight !== null && viewProduct.weight !== undefined
                          ? `${formatWeight(viewProduct.weight || viewProduct.weightKg || 0)} / ${viewProduct.unit || 'unit'}`
                          : 'Not Applicable (N/A)'}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Unit of Measure</div>
                      <div className="fw-bold fs-5 text-dark">
                        {viewProduct.unit ? viewProduct.unit : 'Not Applicable'}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Product Owner / Seller</div>
                      <div className="text-dark fw-medium small">
                        {viewProduct.sellerName || (viewProduct.seller ? viewProduct.seller.companyName : 'Direct Platform')}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Category Hierarchy</div>
                      <div className="text-dark fw-medium small">
                        {getFullCategoryPathName(viewProduct.marketplaceCategoryId) ||
                          (typeof viewProduct.category === 'string'
                            ? viewProduct.category
                            : viewProduct.category?.name || 'General')}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Sequential Item Code</div>
                      <code className="text-primary fw-bold fs-6">{viewProduct.itemCode || viewProduct.sku}</code>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Status</div>
                      {renderStatusBadge(viewProduct.status)}
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Created Date</div>
                      <span className="text-dark small">
                        {viewProduct.createdAt ? new Date(viewProduct.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted small">Last Updated</div>
                      <span className="text-dark small">
                        {viewProduct.updatedAt ? new Date(viewProduct.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-ardab-outline btn-sm"
                    onClick={() => {
                      setViewProduct(null);
                      setActiveDetailImageIndex(0);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Switch Warning Confirmation Modal */}
        <ConfirmationModal
          isOpen={categorySwitchWarningModal.isOpen}
          title="Switch Product Category?"
          message="Switching categories will reset previously entered category-specific attributes because the new category uses a different specification schema. Are you sure you want to proceed?"
          variant="warning"
          confirmLabel="Yes, Switch Category"
          isLoading={false}
          onConfirm={() => applyCategoryChange(categorySwitchWarningModal.newCategoryId)}
          onCancel={() => setCategorySwitchWarningModal({ isOpen: false, newCategoryId: '' })}
        />

        {/* Destructive / Status Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel || 'Confirm'}
          affectedItemsCount={confirmModal.affectedCount}
          affectedItemNames={confirmModal.affectedNames}
          isIrreversible={confirmModal.isIrreversible}
          isLoading={isConfirming}
          onConfirm={handleConfirmModalAction}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </PageContainer>
    </AdminLayout>
  );
}
