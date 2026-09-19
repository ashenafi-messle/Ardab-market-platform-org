'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, attributesApi } from '@/lib/api';
import {
  Category,
  AttributeDefinition,
  CategoryAttributeItem,
  LogisticsFieldMode,
} from '@/types/product';
import { hasPermission } from '@/lib/permissions';

/**
 * Intelligent keyword-based Bootstrap 5 icon class generator for categories.
 * Maps category names or keywords to semantic Bootstrap icons.
 */
function getAutoCategoryIcon(name: string): string {
  if (!name || !name.trim()) return 'bi-box-seam';
  const clean = name.toLowerCase().trim();

  // Ethiopian agricultural staples & grains
  if (/(teff|grain|cereal|wheat|barley|sorghum|millet|corn|maize|crop|flour|rice|seed)/.test(clean)) {
    return 'bi-boxes';
  }
  // Coffee, tea & hot beverages
  if (/(coffee|bunna|espresso|beans|roast|tea|chai|beverage|drink)/.test(clean)) {
    return 'bi-cup-hot';
  }
  // Edible oils, butter, liquids
  if (/(oil|nug|sesame|sunflower|liquid|linseed|mustard)/.test(clean)) {
    return 'bi-droplet-half';
  }
  // Honey, natural sweeteners, sugar
  if (/(honey|mar|sweet|sugar|bee|molasses|syrup)/.test(clean)) {
    return 'bi-droplet';
  }
  // Pulses, legumes, beans, peas
  if (/(pulse|legume|lentil|pea|bean|chickpea|shimbra|bakela|ater|misir)/.test(clean)) {
    return 'bi-grid-3x3-gap';
  }
  // Dairy, butter, milk, cheese, eggs
  if (/(dairy|milk|butter|qibe|cheese|ayib|yoghurt|egg)/.test(clean)) {
    return 'bi-egg';
  }
  // Spices, peppers, chili, berbere
  if (/(spice|berbere|pepper|chili|mitmita|korarima|ginger|garlic|seasoning)/.test(clean)) {
    return 'bi-fire';
  }
  // Fruits, vegetables, fresh greens
  if (/(fruit|vegetable|veg|fresh|apple|banana|mango|avocado|tomato|onion|potato|green)/.test(clean)) {
    return 'bi-basket';
  }
  // Livestock, meat, poultry, livestock feed
  if (/(meat|livestock|cattle|sheep|goat|poultry|chicken|beef|feed)/.test(clean)) {
    return 'bi-shop';
  }
  // Fashion, apparel, traditional clothes
  if (/(cloth|fashion|wear|shirt|dress|habesha|textile|apparel|shoe|fabric)/.test(clean)) {
    return 'bi-tag';
  }
  // Electronics, tech, phones, accessories
  if (/(electron|tech|phone|mobile|device|gadget|computer|digital)/.test(clean)) {
    return 'bi-phone';
  }
  // Home, kitchen, dining, household
  if (/(home|house|kitchen|furniture|cook|pot|dish|decor)/.test(clean)) {
    return 'bi-house-door';
  }
  // Health, beauty, organic, wellness
  if (/(health|beauty|cosmetic|soap|care|wellness|herbal)/.test(clean)) {
    return 'bi-heart-pulse';
  }
  // Tools, machinery, farm equipment
  if (/(tool|machine|equip|hardware|tractor|pump)/.test(clean)) {
    return 'bi-tools';
  }
  // Packaging, logistics, transport
  if (/(pack|sack|bag|box|transport|logistics)/.test(clean)) {
    return 'bi-archive';
  }
  // Generic fallback
  return 'bi-box-seam';
}

interface FlattenedCategoryItem {
  category: Category;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  pathString: string;
}

export default function SubAdminCategoriesPage() {
  const { user } = useAuth();
  const [treeData, setTreeData] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  // Expanded nodes set
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // Active Category Targets
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [targetParent, setTargetParent] = useState<Category | null>(null); // For "Add Child"

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '' as string,
    icon: 'bi-box-seam',
    description: '',
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Category Image Upload state
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Move Modal State
  const [selectedMoveParentId, setSelectedMoveParentId] = useState<string>('root');
  const [moveError, setMoveError] = useState<string | null>(null);

  // Modal Tab State
  const [modalTab, setModalTab] = useState<'details' | 'logistics' | 'attributes'>('details');

  // Category Logistics & Attributes State
  const [logisticsConfig, setLogisticsConfig] = useState<{
    weightMode: LogisticsFieldMode;
    unitOfMeasureMode: LogisticsFieldMode;
    defaultUnit: string;
  }>({
    weightMode: 'NOT_USED',
    unitOfMeasureMode: 'NOT_USED',
    defaultUnit: '',
  });

  const [localCategoryAttributes, setLocalCategoryAttributes] = useState<CategoryAttributeItem[]>([]);
  const [inheritedCategoryAttributes, setInheritedCategoryAttributes] = useState<CategoryAttributeItem[]>([]);
  const [allAttributeDefinitions, setAllAttributeDefinitions] = useState<AttributeDefinition[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState<boolean>(false);
  const [isSavingAttributes, setIsSavingAttributes] = useState<boolean>(false);
  const [attributeError, setAttributeError] = useState<string | null>(null);

  // New Attribute Creation Modal within Category Attributes Tab
  const [isCreateAttrModalOpen, setIsCreateAttrModalOpen] = useState<boolean>(false);
  const [newAttrForm, setNewAttrForm] = useState<{
    name: string;
    type: string;
    description: string;
    unit: string;
    options: { label: string; value: string }[];
  }>({
    name: '',
    type: 'SELECT',
    description: '',
    unit: '',
    options: [{ label: '', value: '' }],
  });
  const [newAttrOptionInput, setNewAttrOptionInput] = useState<string>('');
  const [isCreatingAttributeDef, setIsCreatingAttributeDef] = useState<boolean>(false);
  const [createAttrDefError, setCreateAttrDefError] = useState<string | null>(null);

  // Selected Attribute from Library to add to category
  const [selectedLibraryDefId, setSelectedLibraryDefId] = useState<string>('');

  // Delete Modal State
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManage = hasPermission(user?.role, 'categories:manage') || hasPermission(user?.role, 'categories:edit');
  const canDelete = hasPermission(user?.role, 'categories:delete');

  // Toast auto-clear
  useEffect(() => {
    if (successToast) {
      const t = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successToast]);

  // Load Tree and Flat Categories
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [treeRes, flatRes] = await Promise.all([
        categoriesApi.getTree(),
        categoriesApi.getAll(),
      ]);
      setTreeData(treeRes);
      setFlatCategories(flatRes);

      // Auto-expand root categories by default on initial load
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          const initial = new Set<string>();
          treeRes.forEach((c) => initial.add(c.id));
          return initial;
        }
        return prev;
      });
    } catch (err: unknown) {
      console.error('Failed to load categories:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load categories. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Expand / Collapse toggles
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const recurse = (list: Category[]) => {
      list.forEach((cat) => {
        allIds.add(cat.id);
        if (cat.children && cat.children.length > 0) {
          recurse(cat.children);
        }
      });
    };
    recurse(treeData);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Flatten tree for hierarchical rendering
  const flattenedList: FlattenedCategoryItem[] = useMemo(() => {
    const result: FlattenedCategoryItem[] = [];

    const traverse = (node: Category, depth: number, parentPath: string[]) => {
      const currentPath = [...parentPath, node.name];
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = expandedIds.has(node.id);

      // Filter by search or status if active
      const matchesSearch = !searchTerm.trim() ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? node.isActive !== false : node.isActive === false);

      if (matchesSearch && matchesStatus) {
        result.push({
          category: node,
          depth,
          hasChildren,
          isExpanded,
          pathString: currentPath.join(' / '),
        });
      }

      if (hasChildren && (isExpanded || searchTerm.trim().length > 0)) {
        node.children!.forEach((child) => traverse(child, depth + 1, currentPath));
      }
    };

    treeData.forEach((root) => traverse(root, 0, []));
    return result;
  }, [treeData, expandedIds, searchTerm, statusFilter]);

  // Load category attributes and logistics configuration
  const loadCategoryAttributesAndLogistics = useCallback(async (catId: string) => {
    setIsLoadingAttributes(true);
    setAttributeError(null);
    try {
      const [localRes, effectiveRes, defsRes] = await Promise.all([
        categoriesApi.getAttributes(catId),
        categoriesApi.getEffectiveAttributes(catId),
        attributesApi.getAll({ status: 'ACTIVE' }),
      ]);

      setLogisticsConfig({
        weightMode: localRes.logistics?.weightMode || 'NOT_USED',
        unitOfMeasureMode: localRes.logistics?.unitOfMeasureMode || 'NOT_USED',
        defaultUnit: localRes.logistics?.defaultUnit || '',
      });

      setLocalCategoryAttributes(localRes.attributes || []);
      // Filter out local attributes from effective attributes to display only inherited ones
      const localDefIds = new Set((localRes.attributes || []).map((a) => a.attributeDefinitionId));
      const inherited = (effectiveRes.attributes || []).filter((a) => !localDefIds.has(a.id) && a.source === 'INHERITED');
      setInheritedCategoryAttributes(inherited);
      setAllAttributeDefinitions(defsRes || []);
    } catch (err: unknown) {
      console.error('Failed to load category attributes:', err);
      setAttributeError(err instanceof Error ? err.message : 'Failed to load category attributes.');
    } finally {
      setIsLoadingAttributes(false);
    }
  }, []);

  // Handle Open Create Root Category
  const handleOpenCreateRoot = () => {
    setActiveCategory(null);
    setTargetParent(null);
    setModalTab('details');
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      icon: 'bi-box-seam',
      description: '',
      imageUrl: '',
      sortOrder: 0,
      isActive: true,
    });
    setLogisticsConfig({
      weightMode: 'NOT_USED',
      unitOfMeasureMode: 'NOT_USED',
      defaultUnit: '',
    });
    setLocalCategoryAttributes([]);
    setInheritedCategoryAttributes([]);
    setFormError(null);
    setImageUploadError(null);
    setAttributeError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);
  };

  // Handle Open Add Child Category
  const handleOpenAddChild = async (parentCat: Category) => {
    setActiveCategory(null);
    setTargetParent(parentCat);
    setModalTab('details');
    setFormData({
      name: '',
      slug: '',
      parentId: parentCat.id,
      icon: parentCat.icon || 'bi-diagram-2',
      description: '',
      imageUrl: '',
      sortOrder: (parentCat.children?.length || 0) + 1,
      isActive: true,
    });
    setFormError(null);
    setImageUploadError(null);
    setAttributeError(null);
    setLocalCategoryAttributes([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);

    // Fetch parent's effective attributes to preview what this child will inherit
    try {
      const [parentEffective, defsRes] = await Promise.all([
        categoriesApi.getEffectiveAttributes(parentCat.id),
        attributesApi.getAll({ status: 'ACTIVE' }),
      ]);
      setInheritedCategoryAttributes(parentEffective.attributes || []);
      setAllAttributeDefinitions(defsRes || []);
      setLogisticsConfig({
        weightMode: parentEffective.logistics?.weightMode || 'NOT_USED',
        unitOfMeasureMode: parentEffective.logistics?.unitOfMeasureMode || 'NOT_USED',
        defaultUnit: parentEffective.logistics?.defaultUnit || '',
      });
    } catch (err) {
      console.error('Failed to preview parent inherited attributes:', err);
    }
  };

  // Handle Open Edit Category
  const handleOpenEdit = async (cat: Category) => {
    setActiveCategory(cat);
    setTargetParent(null);
    setModalTab('details');
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || '',
      icon: cat.icon || getAutoCategoryIcon(cat.name),
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      sortOrder: cat.sortOrder || 0,
      isActive: cat.isActive !== false,
    });
    setFormError(null);
    setImageUploadError(null);
    setAttributeError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);

    // Load category attributes & logistics
    await loadCategoryAttributesAndLogistics(cat.id);
  };

  // Handle Add Existing Attribute Definition to Local Category Attributes
  const handleAddAttributeToCategory = () => {
    if (!selectedLibraryDefId) return;
    const def = allAttributeDefinitions.find((d) => d.id === selectedLibraryDefId);
    if (!def) return;

    if (localCategoryAttributes.some((a) => a.attributeDefinitionId === def.id)) {
      setAttributeError(`Attribute '${def.name}' is already assigned to this category.`);
      return;
    }

    const newLocalAttr: CategoryAttributeItem = {
      id: `temp_${Date.now()}`,
      attributeDefinitionId: def.id,
      name: def.name,
      slug: def.slug,
      type: def.type,
      description: def.description,
      unit: def.unit,
      isRequired: false,
      isVisible: true,
      sortOrder: localCategoryAttributes.length,
      options: def.options || [],
      source: 'LOCAL',
    };

    setLocalCategoryAttributes((prev) => [...prev, newLocalAttr]);
    setSelectedLibraryDefId('');
    setAttributeError(null);
  };

  // Handle Remove Attribute from Local Category Attributes
  const handleRemoveAttributeFromCategory = (attrDefId: string) => {
    setLocalCategoryAttributes((prev) => prev.filter((a) => a.attributeDefinitionId !== attrDefId));
  };

  // Handle Toggle Attribute isRequired
  const handleToggleAttributeRequired = (attrDefId: string) => {
    setLocalCategoryAttributes((prev) =>
      prev.map((a) => (a.attributeDefinitionId === attrDefId ? { ...a, isRequired: !a.isRequired } : a))
    );
  };

  // Save Attributes & Logistics Configuration
  const handleSaveAttributesAndLogistics = async () => {
    if (!activeCategory) {
      // If category is not yet created, values are stored in state and saved after creation
      setSuccessToast('Attributes will be saved when the category is created.');
      return;
    }

    setIsSavingAttributes(true);
    setAttributeError(null);

    try {
      await categoriesApi.updateAttributes(activeCategory.id, {
        logistics: {
          weightMode: logisticsConfig.weightMode,
          unitOfMeasureMode: logisticsConfig.unitOfMeasureMode,
          defaultUnit: logisticsConfig.defaultUnit ? logisticsConfig.defaultUnit.trim() : null,
        },
        attributes: localCategoryAttributes.map((a, idx) => ({
          attributeDefinitionId: a.attributeDefinitionId,
          isRequired: a.isRequired,
          isVisible: a.isVisible,
          sortOrder: idx,
        })),
      });

      setSuccessToast(`Attributes & logistics updated for "${activeCategory.name}".`);
      await loadCategoryAttributesAndLogistics(activeCategory.id);
    } catch (err: unknown) {
      console.error('Failed to save category attributes:', err);
      setAttributeError(err instanceof Error ? err.message : 'Failed to save attributes.');
    } finally {
      setIsSavingAttributes(false);
    }
  };

  // Handle Create Brand-New Attribute Definition in Library
  const handleCreateNewAttributeDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrForm.name.trim()) {
      setCreateAttrDefError('Attribute name is required.');
      return;
    }

    const isSelect = newAttrForm.type === 'SELECT' || newAttrForm.type === 'MULTI_SELECT';
    const cleanOptions = newAttrForm.options
      .map((o) => ({ label: o.label.trim(), value: o.value.trim() || o.label.trim().toLowerCase().replace(/\s+/g, '_') }))
      .filter((o) => o.label.length > 0);

    if (isSelect && cleanOptions.length === 0) {
      setCreateAttrDefError('At least one option is required for SELECT or MULTI_SELECT attributes.');
      return;
    }

    setIsCreatingAttributeDef(true);
    setCreateAttrDefError(null);

    try {
      const createdDef = await attributesApi.create({
        name: newAttrForm.name.trim(),
        type: newAttrForm.type,
        description: newAttrForm.description.trim() || null,
        unit: newAttrForm.unit.trim() || null,
        options: isSelect ? cleanOptions : [],
      });

      // Refresh definition list
      const defs = await attributesApi.getAll({ status: 'ACTIVE' });
      setAllAttributeDefinitions(defs);

      // Automatically add newly created definition to local attributes
      const newLocalAttr: CategoryAttributeItem = {
        id: `temp_${Date.now()}`,
        attributeDefinitionId: createdDef.id,
        name: createdDef.name,
        slug: createdDef.slug,
        type: createdDef.type,
        description: createdDef.description,
        unit: createdDef.unit,
        isRequired: false,
        isVisible: true,
        sortOrder: localCategoryAttributes.length,
        options: createdDef.options || [],
        source: 'LOCAL',
      };
      setLocalCategoryAttributes((prev) => [...prev, newLocalAttr]);

      // Reset form and close modal
      setNewAttrForm({
        name: '',
        type: 'SELECT',
        description: '',
        unit: '',
        options: [{ label: '', value: '' }],
      });
      setIsCreateAttrModalOpen(false);
      setSuccessToast(`Attribute '${createdDef.name}' created and added to category.`);
    } catch (err: unknown) {
      console.error('Failed to create attribute definition:', err);
      setCreateAttrDefError(err instanceof Error ? err.message : 'Failed to create attribute definition.');
    } finally {
      setIsCreatingAttributeDef(false);
    }
  };

  // Handle Device File Upload to Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Image size exceeds maximum limit of 5 MB.');
      return;
    }

    // Validate extension/type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setImageUploadError('Allowed image formats: JPG, JPEG, PNG, WEBP.');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const uploadRes = await categoriesApi.uploadImage(file);
      setFormData((prev) => ({
        ...prev,
        imageUrl: uploadRes.url,
      }));
      setSuccessToast('Image successfully uploaded to Cloudinary.');
    } catch (err: unknown) {
      console.error('Image upload failure:', err);
      setImageUploadError(err instanceof Error ? err.message : 'Failed to upload image to Cloudinary.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Form Save (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (activeCategory) {
        // Update existing
        await categoriesApi.update(activeCategory.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          icon: formData.icon.trim() || undefined,
          description: formData.description.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || null,
          sortOrder: Number(formData.sortOrder) || 0,
          isActive: formData.isActive,
        });
        setSuccessToast(`Category "${formData.name}" updated successfully.`);
      } else {
        // Create new (Root or Child)
        const newCat = await categoriesApi.create({
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          parentId: formData.parentId ? formData.parentId : null,
          icon: formData.icon.trim() || 'bi-box-seam',
          description: formData.description.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || null,
          sortOrder: Number(formData.sortOrder) || 0,
          isActive: formData.isActive,
        });

        // Ensure parent is expanded so new child is visible
        if (newCat.parentId) {
          setExpandedIds((prev) => new Set([...prev, newCat.parentId!]));
        }

        // If local attributes or logistics were configured during creation, save them
        if (localCategoryAttributes.length > 0 || logisticsConfig.weightMode !== 'NOT_USED' || logisticsConfig.unitOfMeasureMode !== 'NOT_USED') {
          try {
            await categoriesApi.updateAttributes(newCat.id, {
              logistics: {
                weightMode: logisticsConfig.weightMode,
                unitOfMeasureMode: logisticsConfig.unitOfMeasureMode,
                defaultUnit: logisticsConfig.defaultUnit ? logisticsConfig.defaultUnit.trim() : null,
              },
              attributes: localCategoryAttributes.map((a, idx) => ({
                attributeDefinitionId: a.attributeDefinitionId,
                isRequired: a.isRequired,
                isVisible: a.isVisible,
                sortOrder: idx,
              })),
            });
          } catch (attrErr) {
            console.error('Failed to attach attributes to newly created category:', attrErr);
          }
        }

        setSuccessToast(`Category "${newCat.name}" created successfully.`);
      }

      setIsFormModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to save category:', err);
      setFormError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (cat: Category) => {
    const nextStatus = cat.isActive === false;
    try {
      await categoriesApi.updateStatus(cat.id, nextStatus);
      setSuccessToast(`Category "${cat.name}" is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to toggle status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update category status.');
    }
  };

  // Handle Open Move Modal
  const handleOpenMove = (cat: Category) => {
    setActiveCategory(cat);
    setSelectedMoveParentId(cat.parentId || 'root');
    setMoveError(null);
    setIsMoveModalOpen(true);
  };

  // Submit Move
  const handleSaveMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;

    setIsSubmitting(true);
    setMoveError(null);

    const targetParentId = selectedMoveParentId === 'root' ? null : selectedMoveParentId;

    try {
      await categoriesApi.move(activeCategory.id, targetParentId);
      setSuccessToast(`Category "${activeCategory.name}" moved successfully.`);
      if (targetParentId) {
        setExpandedIds((prev) => new Set([...prev, targetParentId]));
      }
      setIsMoveModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to move category:', err);
      setMoveError(err instanceof Error ? err.message : 'Failed to move category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Open Delete Modal
  const handleOpenDelete = (cat: Category) => {
    setActiveCategory(cat);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!activeCategory) return;

    setIsSubmitting(true);
    setDeleteError(null);

    try {
      const res = await categoriesApi.delete(activeCategory.id);
      setSuccessToast(res.message || `Category "${activeCategory.name}" deleted.`);
      setIsDeleteModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to delete category:', err);
      setDeleteError(err instanceof Error ? err.message : 'Category cannot be deleted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (cat: Category) => {
    setActiveCategory(cat);
    setIsDetailsModalOpen(true);
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Product Categories"
        subtitle="Manage the central marketplace product hierarchy, taxonomy trees, sibling ordering, and consumer catalog navigation"
        breadcrumbs={[{ label: 'Taxonomy' }, { label: 'Product Categories' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={loadData}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin-icon' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
            {canManage && (
              <button
                type="button"
                className="btn btn-ardab-primary d-flex align-items-center gap-2"
                onClick={handleOpenCreateRoot}
              >
                <i className="bi bi-plus-lg"></i>
                <span>Add Root Category</span>
              </button>
            )}
          </div>
        }
      >
        {/* Success Toast */}
        {successToast && (
          <div className="alert alert-success d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill fs-5 text-success"></i>
              <span className="fw-semibold">{successToast}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setSuccessToast(null)}></button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill fs-5 text-danger"></i>
              <span>{errorMessage}</span>
            </div>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadData}>
              Retry
            </button>
          </div>
        )}

        {/* Filter & View Toolbar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-2 align-items-center justify-content-between">
            {/* Search Input */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search category name, slug, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary border-start-0"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter & Tree Controls */}
            <div className="col-12 col-md-7 d-flex flex-wrap align-items-center justify-content-md-end gap-2">
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              {viewMode === 'tree' && (
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={expandAll}
                    title="Expand all nodes"
                  >
                    <i className="bi bi-arrows-expand me-1"></i>
                    Expand All
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={collapseAll}
                    title="Collapse all nodes"
                  >
                    <i className="bi bi-arrows-collapse me-1"></i>
                    Collapse All
                  </button>
                </div>
              )}

              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${viewMode === 'tree' ? 'btn-ardab-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('tree')}
                  title="Tree Hierarchy View"
                >
                  <i className="bi bi-diagram-3 me-1"></i>
                  Tree View
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-ardab-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('table')}
                  title="Flat Table View"
                >
                  <i className="bi bi-table me-1"></i>
                  Table View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="ardab-card p-5 text-center my-4">
            <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading categories...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Loading Marketplace Category Hierarchy...</h5>
            <p className="text-muted small">Fetching tree nodes and category definitions from the server</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && flattenedList.length === 0 && (
          <div className="ardab-card p-5 text-center my-4">
            <div className="ardab-icon-box icon-box-green mx-auto mb-3" style={{ width: 64, height: 64, fontSize: '2rem' }}>
              <i className="bi bi-folder-x"></i>
            </div>
            <h5 className="fw-bold text-dark mb-1">No Product Categories Found</h5>
            <p className="text-muted small mb-4" style={{ maxWidth: 460, margin: '0 auto' }}>
              {searchTerm
                ? `No categories match "${searchTerm}". Try a different keyword or clear your search.`
                : 'The platform has not initialized any categories yet. Create your first root category to begin.'}
            </p>
            {searchTerm ? (
              <button type="button" className="btn btn-outline-secondary" onClick={() => setSearchTerm('')}>
                Clear Search
              </button>
            ) : canManage ? (
              <button type="button" className="btn btn-ardab-primary" onClick={handleOpenCreateRoot}>
                <i className="bi bi-plus-lg me-1"></i> Create First Root Category
              </button>
            ) : null}
          </div>
        )}

        {/* MAIN VIEW: HIERARCHICAL TREE VIEW */}
        {!isLoading && flattenedList.length > 0 && viewMode === 'tree' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden">
            <div className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-diagram-3 text-success fs-5"></i>
                <span className="fw-bold text-dark">Category Taxonomy Tree</span>
                <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.72rem' }}>
                  {flattenedList.length} shown
                </span>
              </div>
              <span className="text-muted small">
                Unlimited nesting supported &bull; Sibling ordered
              </span>
            </div>

            <div className="list-group list-group-flush">
              {flattenedList.map(({ category: cat, depth, hasChildren, isExpanded, pathString }) => {
                const isRoot = depth === 0;
                const indentPadding = Math.min(depth * 28 + 16, 220);

                return (
                  <div
                    key={cat.id}
                    className={`list-group-item list-group-item-action d-flex flex-wrap align-items-center justify-content-between py-3 px-3 border-bottom ${
                      !cat.isActive ? 'bg-light text-muted' : ''
                    }`}
                    style={{
                      paddingLeft: `${indentPadding}px`,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Left Details */}
                    <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0 me-3 my-1">
                      {/* Expand / Collapse Button */}
                      {hasChildren ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center text-secondary rounded-circle"
                          style={{ width: 24, height: 24, minWidth: 24 }}
                          onClick={() => toggleExpand(cat.id)}
                          title={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
                        >
                          <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} style={{ fontSize: '0.75rem' }}></i>
                        </button>
                      ) : (
                        <span
                          className="d-inline-block text-center text-muted"
                          style={{ width: 24, minWidth: 24, fontSize: '0.65rem' }}
                        >
                          &bull;
                        </span>
                      )}

                      {/* Icon */}
                      <div
                        className={`ardab-icon-box ${isRoot ? 'icon-box-green' : 'bg-light text-secondary'} flex-shrink-0`}
                        style={{ width: 34, height: 34, fontSize: '1.05rem' }}
                      >
                        <i className={`bi ${cat.icon || 'bi-box-seam'}`}></i>
                      </div>

                      {/* Name & Metadata */}
                      <div className="min-w-0">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className={`fw-bold ${cat.isActive ? 'text-dark' : 'text-muted text-decoration-line-through'}`}>
                            {cat.name}
                          </span>
                          <code className="text-muted" style={{ fontSize: '0.72rem' }}>
                            /{cat.slug}
                          </code>
                          <span
                            className={`badge ${
                              cat.isActive !== false ? 'badge-success-soft' : 'badge-danger-soft'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {cat.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          {depth > 0 && (
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                              Level {depth + 1}
                            </span>
                          )}
                        </div>

                        {/* Breadcrumbs path */}
                        <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem', maxWidth: '500px' }}>
                          <span className="text-secondary fw-semibold">Path:</span> {pathString}
                        </div>
                      </div>
                    </div>

                    {/* Right Stats & Action Buttons */}
                    <div className="d-flex align-items-center gap-3 my-1 ms-auto flex-wrap">
                      {/* Products and Children Counters */}
                      <div className="d-flex align-items-center gap-2 text-muted small me-2">
                        <span title="Subcategories under this category" className="badge bg-light text-dark border">
                          <i className="bi bi-diagram-2 me-1 text-primary"></i>
                          {cat.children?.length || cat.childrenCount || 0} sub
                        </span>
                        <span title="Products assigned to this category" className="badge bg-light text-dark border">
                          <i className="bi bi-box me-1 text-success"></i>
                          {cat.productCount || 0} products
                        </span>
                        {cat.sortOrder !== undefined && cat.sortOrder > 0 && (
                          <span title="Sibling Sort Order" className="badge bg-light text-secondary border">
                            #{cat.sortOrder}
                          </span>
                        )}
                      </div>

                      {/* Action Button Toolbar */}
                      <div className="btn-group btn-group-sm">
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-outline-success"
                            onClick={() => handleOpenAddChild(cat)}
                            title={`Add child category under "${cat.name}"`}
                          >
                            <i className="bi bi-plus-lg me-1"></i>
                            <span className="d-none d-sm-inline">Add Child</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => handleOpenDetails(cat)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit Category"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleOpenMove(cat)}
                            title="Move Category in Tree"
                          >
                            <i className="bi bi-arrows-move"></i>
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className={`btn ${cat.isActive !== false ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            onClick={() => handleToggleStatus(cat)}
                            title={cat.isActive !== false ? 'Deactivate Category' : 'Activate Category'}
                          >
                            {cat.isActive !== false ? (
                              <i className="bi bi-pause-circle"></i>
                            ) : (
                              <i className="bi bi-play-circle"></i>
                            )}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleOpenDelete(cat)}
                            title="Safe Delete Category"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECONDARY VIEW: FLAT TABLE VIEW */}
        {!isLoading && flattenedList.length > 0 && viewMode === 'table' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Category Name</th>
                    <th>Hierarchy Breadcrumbs</th>
                    <th>Slug</th>
                    <th>Products</th>
                    <th>Subcategories</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenedList.map(({ category: cat, depth, pathString }, idx) => (
                    <tr key={cat.id}>
                      <td className="text-muted small">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${cat.icon || 'bi-box-seam'} text-success`}></i>
                          <span className="fw-bold text-dark">{cat.name}</span>
                        </div>
                      </td>
                      <td className="small text-muted">{pathString}</td>
                      <td>
                        <code className="text-primary">{cat.slug}</code>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{cat.productCount || 0}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{cat.children?.length || cat.childrenCount || 0}</span>
                      </td>
                      <td className="small text-muted">{cat.sortOrder || 0}</td>
                      <td>
                        <span
                          className={`badge ${
                            cat.isActive !== false ? 'badge-success-soft' : 'badge-danger-soft'
                          }`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {cat.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-light border"
                              onClick={() => handleOpenAddChild(cat)}
                              title="Add child category"
                            >
                              <i className="bi bi-plus-lg text-success"></i>
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-light border"
                              onClick={() => handleOpenEdit(cat)}
                              title="Edit category"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-light border"
                              onClick={() => handleOpenMove(cat)}
                              title="Move category"
                            >
                              <i className="bi bi-arrows-move"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-light border text-danger"
                              onClick={() => handleOpenDelete(cat)}
                              title="Delete category"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: ADD / EDIT CATEGORY */}
        {isFormModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="ardab-icon-box icon-box-green" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-diagram-3"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        {activeCategory ? `Edit Category: ${activeCategory.name}` : targetParent ? `Add Child Category under "${targetParent.name}"` : 'Create Root Category'}
                      </h5>
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {targetParent ? `Parent: ${targetParent.name} (${targetParent.slug})` : 'New top-level commodity classification'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={isSubmitting}
                  ></button>
                </div>

                <form onSubmit={handleSaveForm}>
                  <div className="modal-body p-4">
                    {formError && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 p-3 mb-3 rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Navigation Tabs */}
                    <ul className="nav nav-tabs nav-fill mb-3">
                      <li className="nav-item">
                        <button
                          type="button"
                          className={`nav-link fw-semibold ${modalTab === 'details' ? 'active text-success' : 'text-muted'}`}
                          onClick={() => setModalTab('details')}
                        >
                          <i className="bi bi-info-circle me-1"></i> General Details
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          type="button"
                          className={`nav-link fw-semibold ${modalTab === 'logistics' ? 'active text-success' : 'text-muted'}`}
                          onClick={() => setModalTab('logistics')}
                        >
                          <i className="bi bi-truck me-1"></i> Logistics & Shipping
                          {logisticsConfig.weightMode !== 'NOT_USED' && (
                            <span className="badge bg-success-subtle text-success ms-1" style={{ fontSize: '0.65rem' }}>Active</span>
                          )}
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          type="button"
                          className={`nav-link fw-semibold ${modalTab === 'attributes' ? 'active text-success' : 'text-muted'}`}
                          onClick={() => setModalTab('attributes')}
                        >
                          <i className="bi bi-tags me-1"></i> Attributes & Variants
                          {(localCategoryAttributes.length > 0 || inheritedCategoryAttributes.length > 0) && (
                            <span className="badge bg-primary ms-1" style={{ fontSize: '0.65rem' }}>
                              {localCategoryAttributes.length + inheritedCategoryAttributes.length}
                            </span>
                          )}
                        </button>
                      </li>
                    </ul>

                    {/* TAB 1: GENERAL DETAILS */}
                    {modalTab === 'details' && (
                      <div className="row g-3">
                        {/* Parent Category Display */}
                        <div className="col-12">
                          <label className="form-label fw-semibold text-dark">Parent Category</label>
                          <div className="p-2 px-3 bg-light border rounded-3 d-flex align-items-center justify-content-between">
                            <span className="text-dark fw-medium">
                              {targetParent
                                ? `${targetParent.name} (Child will be placed here)`
                                : activeCategory && activeCategory.parentId
                                ? `Assigned Parent: ${activeCategory.parent?.name || activeCategory.parentId}`
                                : 'None (Root Category — parentId = NULL)'}
                            </span>
                            <span className="badge bg-secondary">
                              {targetParent || (activeCategory && activeCategory.parentId) ? 'Nested Node' : 'Root'}
                            </span>
                          </div>
                        </div>

                        {/* Category Name */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-dark">
                            Category Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            placeholder="e.g. Formal Shirts, Magna Teff, Honey"
                            value={formData.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              const autoIcon = getAutoCategoryIcon(val);
                              setFormData((prev) => ({
                                ...prev,
                                name: val,
                                slug: activeCategory ? prev.slug : val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                                icon: autoIcon,
                              }));
                            }}
                          />
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            Bootstrap icon will be automatically generated as you type.
                          </span>
                        </div>

                        {/* Slug */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-dark">
                            URL Slug <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light text-muted">/category/</span>
                            <input
                              type="text"
                              className="form-control"
                              required
                              placeholder="formal-shirts"
                              value={formData.slug}
                              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            />
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            Unique URL path fragment.
                          </span>
                        </div>

                        {/* Bootstrap Icon (System-Generated with Manual Override) */}
                        <div className="col-md-6">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <label className="form-label fw-semibold text-dark mb-0">Bootstrap Icon Class</label>
                            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.65rem' }}>
                              <i className="bi bi-magic me-1"></i>System Generated
                            </span>
                          </div>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                              <i className={`bi ${formData.icon || 'bi-box-seam'} fs-5 text-success`}></i>
                            </span>
                            <input
                              type="text"
                              className="form-control border-start-0"
                              placeholder="bi-boxes, bi-flower1, bi-cup-hot"
                              value={formData.icon}
                              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="Regenerate icon from category name"
                              onClick={() => {
                                const autoIcon = getAutoCategoryIcon(formData.name);
                                setFormData({ ...formData, icon: autoIcon });
                              }}
                            >
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-1">
                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                              Current: <code>{formData.icon || 'bi-box-seam'}</code>
                            </span>
                            <div className="d-flex gap-1">
                              {['bi-boxes', 'bi-cup-hot', 'bi-droplet', 'bi-basket', 'bi-tag', 'bi-egg'].map((suggested) => (
                                <button
                                  key={suggested}
                                  type="button"
                                  className="btn btn-sm btn-light border py-0 px-1 text-muted"
                                  style={{ fontSize: '0.7rem' }}
                                  title={`Set ${suggested}`}
                                  onClick={() => setFormData({ ...formData, icon: suggested })}
                                >
                                  <i className={`bi ${suggested}`}></i>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sibling Sort Order */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-dark">Sibling Sort Order</label>
                          <input
                            type="number"
                            className="form-control"
                            min={0}
                            value={formData.sortOrder}
                            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                          />
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            Controls display priority among sibling categories (lowest first).
                          </span>
                        </div>

                        {/* Category Banner / Image (Local Device Upload -> Cloudinary) */}
                        <div className="col-12">
                          <label className="form-label fw-semibold text-dark d-flex align-items-center justify-content-between">
                            <span>
                              <i className="bi bi-cloud-upload text-success me-1"></i>
                              Category Banner / Image
                            </span>
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                              Stored on Cloudinary
                            </span>
                          </label>

                          {/* Device File Picker Component */}
                          <div className="card border rounded-3 p-3 bg-light">
                            <div className="row align-items-center g-3">
                              <div className="col-md-7">
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="form-control form-control-sm"
                                    id="categoryImageFileInput"
                                    onChange={handleImageFileChange}
                                    disabled={isUploadingImage || isSubmitting}
                                  />
                                  {isUploadingImage && (
                                    <div className="spinner-border spinner-border-sm text-success flex-shrink-0" role="status">
                                      <span className="visually-hidden">Uploading...</span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                                  Browse from device: JPG, PNG, WEBP (Max 5MB). Automatically uploaded to Cloudinary.
                                </span>

                                {imageUploadError && (
                                  <div className="text-danger small mt-2 d-flex align-items-center gap-1">
                                    <i className="bi bi-exclamation-circle-fill"></i>
                                    <span>{imageUploadError}</span>
                                  </div>
                                )}
                              </div>

                              <div className="col-md-5 text-end">
                                {formData.imageUrl ? (
                                  <div className="d-inline-flex align-items-center gap-2 border bg-white rounded-3 p-1 shadow-sm">
                                    <img
                                      src={formData.imageUrl}
                                      alt="Category Preview"
                                      className="rounded object-fit-cover"
                                      style={{ width: 48, height: 48 }}
                                    />
                                    <div className="text-start pe-2" style={{ maxWidth: 160 }}>
                                      <span className="d-block text-truncate fw-bold small text-success" style={{ fontSize: '0.75rem' }}>
                                        Uploaded
                                      </span>
                                      <a
                                        href={formData.imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-truncate text-muted d-block small"
                                        style={{ fontSize: '0.68rem' }}
                                      >
                                        View Image
                                      </a>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger py-0 px-2"
                                      title="Remove image"
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, imageUrl: '' }));
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                      }}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-muted small text-center p-2 border rounded-3 bg-white d-inline-block">
                                    <i className="bi bi-image fs-4 d-block text-secondary"></i>
                                    <span style={{ fontSize: '0.7rem' }}>No image chosen</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Direct URL Fallback or Manual Inspection */}
                            <div className="mt-2 pt-2 border-top">
                              <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white text-muted" style={{ fontSize: '0.72rem' }}>
                                  Cloudinary URL:
                                </span>
                                <input
                                  type="text"
                                  className="form-control bg-white"
                                  placeholder="Auto-filled once image is browsed and uploaded"
                                  value={formData.imageUrl}
                                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                  style={{ fontSize: '0.75rem' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="col-12">
                          <label className="form-label fw-semibold text-dark">Description</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Brief summary of items covered under this category..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          ></textarea>
                        </div>

                        {/* Status Checkbox */}
                        <div className="col-12">
                          <div className="form-check form-switch mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="categoryActiveSwitch"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="categoryActiveSwitch">
                              Category is Active and selectable for products
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: LOGISTICS & SHIPPING CONFIGURATION */}
                    {modalTab === 'logistics' && (
                      <div className="p-2">
                        <div className="alert alert-info d-flex align-items-start gap-2 mb-3 rounded-3" style={{ fontSize: '0.85rem' }}>
                          <i className="bi bi-info-circle-fill text-info flex-shrink-0 mt-1 fs-6"></i>
                          <div>
                            <strong>Category Logistics Rules:</strong> Configure whether products assigned to this category (or its child subcategories) require physical weight and unit of measure.
                            <div className="mt-1 text-muted">
                              &bull; <em>NOT_USED</em>: Hides weight/UOM for clothing, electronics, shoes.<br />
                              &bull; <em>OPTIONAL</em>: Allows weight/UOM if relevant.<br />
                              &bull; <em>REQUIRED</em>: Enforces weight/UOM for bulk agricultural staples (Teff, Grains, Sugar) to ensure accurate 5,000 kg vehicle capacity checks.
                            </div>
                          </div>
                        </div>

                        <div className="card p-3 border rounded-3 bg-light mb-3">
                          <h6 className="fw-bold text-dark mb-3">
                            <i className="bi bi-speedometer2 text-success me-2"></i>
                            Product Weight Configuration
                          </h6>
                          <div className="row g-3 align-items-center">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Weight Field Mode</label>
                              <select
                                className="form-select"
                                value={logisticsConfig.weightMode}
                                onChange={(e) =>
                                  setLogisticsConfig((prev) => ({
                                    ...prev,
                                    weightMode: e.target.value as LogisticsFieldMode,
                                  }))
                                }
                              >
                                <option value="NOT_USED">NOT_USED (Hide for this category)</option>
                                <option value="OPTIONAL">OPTIONAL (Allowed but not mandatory)</option>
                                <option value="REQUIRED">REQUIRED (Enforced during product creation)</option>
                              </select>
                            </div>
                            <div className="col-md-6">
                              <div className="p-2 bg-white rounded border small text-muted">
                                {logisticsConfig.weightMode === 'NOT_USED' && (
                                  <span><i className="bi bi-eye-slash text-secondary me-1"></i> Products in this category will not have a weight field.</span>
                                )}
                                {logisticsConfig.weightMode === 'OPTIONAL' && (
                                  <span><i className="bi bi-check text-primary me-1"></i> Sellers can optionally specify weight in kilograms.</span>
                                )}
                                {logisticsConfig.weightMode === 'REQUIRED' && (
                                  <span><i className="bi bi-exclamation-circle text-danger me-1"></i> Mandatory. Fleet capacity checks will strictly use this weight.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="card p-3 border rounded-3 bg-light mb-3">
                          <h6 className="fw-bold text-dark mb-3">
                            <i className="bi bi-rulers text-primary me-2"></i>
                            Unit of Measure Configuration
                          </h6>
                          <div className="row g-3 align-items-center">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Unit of Measure Mode</label>
                              <select
                                className="form-select"
                                value={logisticsConfig.unitOfMeasureMode}
                                onChange={(e) =>
                                  setLogisticsConfig((prev) => ({
                                    ...prev,
                                    unitOfMeasureMode: e.target.value as LogisticsFieldMode,
                                  }))
                                }
                              >
                                <option value="NOT_USED">NOT_USED (Hide for this category)</option>
                                <option value="OPTIONAL">OPTIONAL (Optional string / unit)</option>
                                <option value="REQUIRED">REQUIRED (Enforce e.g. Quintal, Kg, Bag)</option>
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Default Unit (Optional)</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. quintal, kg, bag, piece"
                                value={logisticsConfig.defaultUnit}
                                onChange={(e) =>
                                  setLogisticsConfig((prev) => ({
                                    ...prev,
                                    defaultUnit: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {activeCategory && (
                          <div className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={handleSaveAttributesAndLogistics}
                              disabled={isSavingAttributes}
                            >
                              {isSavingAttributes ? 'Saving...' : 'Save Logistics Configuration'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: ATTRIBUTES & VARIANTS */}
                    {modalTab === 'attributes' && (
                      <div className="p-2">
                        {attributeError && (
                          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 mb-3 rounded-3 small">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>{attributeError}</span>
                          </div>
                        )}

                        {/* Top Toolbar: Add from library or create new attribute */}
                        <div className="card p-3 border rounded-3 bg-light mb-4">
                          <div className="row g-2 align-items-center">
                            <div className="col-12 col-md-7">
                              <label className="form-label fw-semibold small mb-1">
                                Add Existing Attribute from Platform Library:
                              </label>
                              <div className="input-group input-group-sm">
                                <select
                                  className="form-select"
                                  value={selectedLibraryDefId}
                                  onChange={(e) => setSelectedLibraryDefId(e.target.value)}
                                >
                                  <option value="">-- Choose Attribute (e.g. Size, Color, Grain Type) --</option>
                                  {allAttributeDefinitions.map((def) => {
                                    const isAssigned = localCategoryAttributes.some((a) => a.attributeDefinitionId === def.id);
                                    return (
                                      <option key={def.id} value={def.id} disabled={isAssigned}>
                                        {def.name} ({def.type}) {isAssigned ? '— (Already Added)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  disabled={!selectedLibraryDefId}
                                  onClick={handleAddAttributeToCategory}
                                >
                                  <i className="bi bi-plus-lg me-1"></i> Add to Category
                                </button>
                              </div>
                            </div>
                            <div className="col-12 col-md-5 text-md-end pt-md-3">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                  setCreateAttrDefError(null);
                                  setIsCreateAttrModalOpen(true);
                                }}
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Create New Attribute Definition
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Section 1: Local Attributes Configured for This Category */}
                        <div className="mb-4">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fw-bold text-dark mb-0">
                              <i className="bi bi-sliders text-success me-1"></i> Local Attributes Assigned to this Category
                            </h6>
                            <span className="badge bg-light text-dark border">
                              {localCategoryAttributes.length} configured
                            </span>
                          </div>

                          {localCategoryAttributes.length === 0 ? (
                            <div className="text-center p-4 bg-light rounded-3 border text-muted small">
                              <i className="bi bi-tags fs-3 d-block text-secondary mb-1"></i>
                              No local attributes assigned yet. Pick an attribute from the library above or create a new one.
                            </div>
                          ) : (
                            <div className="table-responsive border rounded-3 bg-white">
                              <table className="table table-sm table-hover align-middle mb-0">
                                <thead className="table-light small">
                                  <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Options / Values</th>
                                    <th className="text-center">Required?</th>
                                    <th className="text-end">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {localCategoryAttributes.map((attr) => (
                                    <tr key={attr.attributeDefinitionId}>
                                      <td>
                                        <strong>{attr.name}</strong>
                                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                          Slug: <code>{attr.slug}</code>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-light text-dark border small">
                                          {attr.type}
                                        </span>
                                      </td>
                                      <td>
                                        {attr.options && attr.options.length > 0 ? (
                                          <div className="d-flex flex-wrap gap-1">
                                            {attr.options.slice(0, 5).map((opt) => (
                                              <span key={opt.id} className="badge bg-light text-secondary border" style={{ fontSize: '0.65rem' }}>
                                                {opt.label}
                                              </span>
                                            ))}
                                            {attr.options.length > 5 && (
                                              <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.65rem' }}>
                                                +{attr.options.length - 5} more
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted small">Direct Input</span>
                                        )}
                                      </td>
                                      <td className="text-center">
                                        <button
                                          type="button"
                                          className={`btn btn-sm ${attr.isRequired ? 'btn-danger' : 'btn-outline-secondary'} py-0 px-2`}
                                          style={{ fontSize: '0.72rem' }}
                                          onClick={() => handleToggleAttributeRequired(attr.attributeDefinitionId)}
                                        >
                                          {attr.isRequired ? 'Required' : 'Optional'}
                                        </button>
                                      </td>
                                      <td className="text-end">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger py-0 px-2"
                                          title="Remove from category"
                                          onClick={() => handleRemoveAttributeFromCategory(attr.attributeDefinitionId)}
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Section 2: Inherited Attributes from Ancestor Categories */}
                        {inheritedCategoryAttributes.length > 0 && (
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <h6 className="fw-bold text-dark mb-0">
                                <i className="bi bi-diagram-2 text-primary me-1"></i> Inherited Attributes from Ancestors
                              </h6>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                {inheritedCategoryAttributes.length} inherited
                              </span>
                            </div>
                            <div className="table-responsive border rounded-3 bg-light">
                              <table className="table table-sm table-hover align-middle mb-0">
                                <thead className="table-light small">
                                  <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Inherited From</th>
                                    <th className="text-center">Required</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inheritedCategoryAttributes.map((attr) => (
                                    <tr key={attr.id || attr.attributeDefinitionId}>
                                      <td>
                                        <strong>{attr.name}</strong>
                                      </td>
                                      <td>
                                        <span className="badge bg-white text-dark border small">{attr.type}</span>
                                      </td>
                                      <td>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                          {attr.originCategoryName || 'Parent Category'}
                                        </span>
                                      </td>
                                      <td className="text-center">
                                        <span className={`badge ${attr.isRequired ? 'bg-danger' : 'bg-secondary'} small`}>
                                          {attr.isRequired ? 'Required' : 'Optional'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {activeCategory && (
                          <div className="text-end mt-3">
                            <button
                              type="button"
                              className="btn btn-ardab-primary btn-sm px-3"
                              onClick={handleSaveAttributesAndLogistics}
                              disabled={isSavingAttributes}
                            >
                              {isSavingAttributes ? 'Saving Attributes...' : 'Save Category Attributes'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="modal-footer border-top bg-light py-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setIsFormModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary px-4" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : activeCategory ? (
                        'Save Changes'
                      ) : (
                        'Create Category'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1.5: CREATE NEW ATTRIBUTE DEFINITION */}
        {isCreateAttrModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow-lg">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="ardab-icon-box bg-primary-subtle text-primary" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-tag-fill"></i>
                    </div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Create New Attribute Definition</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsCreateAttrModalOpen(false)}
                    disabled={isCreatingAttributeDef}
                  ></button>
                </div>

                <form onSubmit={handleCreateNewAttributeDef}>
                  <div className="modal-body p-4">
                    {createAttrDefError && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 p-2 mb-3 rounded-3 small">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>{createAttrDefError}</span>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Attribute Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Size, Color, Grain Type, Memory"
                        value={newAttrForm.name}
                        onChange={(e) => setNewAttrForm({ ...newAttrForm, name: e.target.value })}
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold small">Type</label>
                        <select
                          className="form-select form-select-sm"
                          value={newAttrForm.type}
                          onChange={(e) => setNewAttrForm({ ...newAttrForm, type: e.target.value })}
                        >
                          <option value="SELECT">SELECT (Single dropdown)</option>
                          <option value="MULTI_SELECT">MULTI_SELECT (Tags/Multiple)</option>
                          <option value="TEXT">TEXT (Free text input)</option>
                          <option value="NUMBER">NUMBER (Numeric specification)</option>
                          <option value="BOOLEAN">BOOLEAN (Yes / No switch)</option>
                          <option value="DATE">DATE (Calendar date)</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small">Unit (Optional)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. GB, mm, kg, cm"
                          value={newAttrForm.unit}
                          onChange={(e) => setNewAttrForm({ ...newAttrForm, unit: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Predefined Options for SELECT / MULTI_SELECT */}
                    {(newAttrForm.type === 'SELECT' || newAttrForm.type === 'MULTI_SELECT') && (
                      <div className="mb-3 p-3 bg-light rounded-3 border">
                        <label className="form-label fw-semibold small mb-1">Predefined Options</label>
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {newAttrForm.options.map((opt, idx) => (
                            <span key={idx} className="badge bg-white text-dark border p-2 d-inline-flex align-items-center gap-2">
                              <span>{opt.label}</span>
                              <button
                                type="button"
                                className="btn-close btn-close-white ms-1"
                                style={{ fontSize: '0.55rem' }}
                                onClick={() =>
                                  setNewAttrForm({
                                    ...newAttrForm,
                                    options: newAttrForm.options.filter((_, i) => i !== idx),
                                  })
                                }
                              ></button>
                            </span>
                          ))}
                        </div>

                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Add option (e.g. Small, Red, Magna, Organic)"
                            value={newAttrOptionInput}
                            onChange={(e) => setNewAttrOptionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newAttrOptionInput.trim()) {
                                  setNewAttrForm({
                                    ...newAttrForm,
                                    options: [
                                      ...newAttrForm.options,
                                      {
                                        label: newAttrOptionInput.trim(),
                                        value: newAttrOptionInput.trim().toLowerCase().replace(/\s+/g, '_'),
                                      },
                                    ],
                                  });
                                  setNewAttrOptionInput('');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              if (newAttrOptionInput.trim()) {
                                setNewAttrForm({
                                  ...newAttrForm,
                                  options: [
                                    ...newAttrForm.options,
                                    {
                                      label: newAttrOptionInput.trim(),
                                      value: newAttrOptionInput.trim().toLowerCase().replace(/\s+/g, '_'),
                                    },
                                  ],
                                });
                                setNewAttrOptionInput('');
                              }
                            }}
                          >
                            Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-2">
                      <label className="form-label fw-semibold small">Description (Optional)</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Purpose of this attribute..."
                        value={newAttrForm.description}
                        onChange={(e) => setNewAttrForm({ ...newAttrForm, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light py-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setIsCreateAttrModalOpen(false)}
                      disabled={isCreatingAttributeDef}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm px-3" disabled={isCreatingAttributeDef}>
                      {isCreatingAttributeDef ? 'Creating...' : 'Save & Add to Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: SAFE MOVE CATEGORY */}
        {isMoveModalOpen && activeCategory && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="ardab-icon-box bg-light text-primary" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-arrows-move"></i>
                    </div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      Move Category: &ldquo;{activeCategory.name}&rdquo;
                    </h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsMoveModalOpen(false)}
                    disabled={isSubmitting}
                  ></button>
                </div>

                <form onSubmit={handleSaveMove}>
                  <div className="modal-body p-4">
                    {moveError && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 p-3 mb-3 rounded-3" role="alert">
                        <i className="bi bi-exclamation-octagon-fill"></i>
                        <span>{moveError}</span>
                      </div>
                    )}

                    <p className="text-muted small mb-3">
                      Select a new parent category in the marketplace taxonomy tree. Circular moves (e.g. moving a parent into its own child) are strictly prevented.
                    </p>

                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark">Target Parent Category</label>
                      <select
                        className="form-select"
                        value={selectedMoveParentId}
                        onChange={(e) => setSelectedMoveParentId(e.target.value)}
                      >
                        <option value="root">-- Move to Root Level (No Parent) --</option>
                        {flatCategories
                          .filter((c) => c.id !== activeCategory.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.slug})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light py-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setIsMoveModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-4" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Moving...
                        </>
                      ) : (
                        'Confirm Move'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: SAFE DELETE CATEGORY */}
        {isDeleteModalOpen && activeCategory && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="ardab-icon-box bg-danger-subtle text-danger" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      Delete &ldquo;{activeCategory.name}&rdquo;?
                    </h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isSubmitting}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {deleteError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 p-3 mb-3 rounded-3" role="alert">
                      <i className="bi bi-shield-x"></i>
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <p className="text-dark mb-3">
                    Are you sure you want to permanently delete <strong>{activeCategory.name}</strong>?
                  </p>

                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="text-muted">Associated Products:</span>
                      <strong className={activeCategory.productCount > 0 ? 'text-danger' : 'text-dark'}>
                        {activeCategory.productCount || 0}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="text-muted">Child Subcategories:</span>
                      <strong className={(activeCategory.children?.length || activeCategory.childrenCount || 0) > 0 ? 'text-danger' : 'text-dark'}>
                        {activeCategory.children?.length || activeCategory.childrenCount || 0}
                      </strong>
                    </div>
                  </div>

                  {(activeCategory.productCount > 0 || (activeCategory.children?.length || activeCategory.childrenCount || 0) > 0) && (
                    <div className="alert alert-warning small d-flex align-items-start gap-2 mb-0">
                      <i className="bi bi-info-circle-fill text-warning flex-shrink-0 mt-1"></i>
                      <span>
                        This category has active dependencies. Deleting will be rejected by backend integrity checks.
                        Consider <strong>Deactivating</strong> it instead to preserve product associations.
                      </span>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top bg-light py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: DETAILS MODAL */}
        {isDetailsModalOpen && activeCategory && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="ardab-icon-box icon-box-green" style={{ width: 36, height: 36 }}>
                      <i className={`bi ${activeCategory.icon || 'bi-box-seam'}`}></i>
                    </div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{activeCategory.name}</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsDetailsModalOpen(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="list-group list-group-flush border rounded-3 overflow-hidden">
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Category ID</span>
                      <code className="small text-dark">{activeCategory.id}</code>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">URL Slug</span>
                      <code className="small text-primary">{activeCategory.slug}</code>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Hierarchy Level</span>
                      <span className="badge bg-light text-dark border">
                        {activeCategory.parentId ? 'Child Subcategory' : 'Root Category'}
                      </span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Active Status</span>
                      <span
                        className={`badge ${
                          activeCategory.isActive !== false ? 'badge-success-soft' : 'badge-danger-soft'
                        }`}
                      >
                        {activeCategory.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Sibling Sort Order</span>
                      <span className="fw-semibold text-dark">{activeCategory.sortOrder || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Products Assigned</span>
                      <span className="fw-bold text-success">{activeCategory.productCount || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Immediate Children</span>
                      <span className="fw-bold text-primary">
                        {activeCategory.children?.length || activeCategory.childrenCount || 0}
                      </span>
                    </div>
                  </div>

                  {activeCategory.description && (
                    <div className="mt-3">
                      <span className="text-muted small fw-semibold">Description:</span>
                      <p className="text-dark small mt-1 mb-0 p-2 bg-light rounded-2 border">
                        {activeCategory.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top bg-light py-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
