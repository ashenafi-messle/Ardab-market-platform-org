'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { productsApi, categoriesApi, suppliersApi } from '@/lib/api';
import { Product, Category } from '@/types/product';
import { Supplier } from '@/types/supplier';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

export default function ProductsPage() {
  const { user, selectedCity } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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

  // Form State with Seller / Owner & Discount
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: 'CAT-01',
    sellerId: 'SUP-001',
    sellerName: 'Gondar Farmers Union Cooperative',
    description: '',
    originalPrice: 5000,
    discountPercent: 0,
    sellingPrice: 5000,
    weightKg: 25,
    unit: 'bag',
    availability: 'IN_STOCK' as 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED',
    cityAvailability: ['Gondar', 'Bahir Dar', 'Addis Ababa'],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const canEdit = hasPermission(user?.role, 'products:edit');

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, supRes] = await Promise.all([
        productsApi.getAll(selectedCity, selectedCategory),
        categoriesApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setProducts(prodRes);
      setCategories(catRes);
      setSuppliers(supRes);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      productsApi.getAll(selectedCity, selectedCategory),
      categoriesApi.getAll(),
      suppliersApi.getAll(),
    ])
      .then(([prodRes, catRes, supRes]) => {
        if (isMounted) {
          setProducts(prodRes);
          setCategories(catRes);
          setSuppliers(supRes);
        }
      })
      .catch((e) => {
        console.error('Failed to load products:', e);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, selectedCategory]);

  // Filtered in-memory records
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(q));
      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [products, debouncedSearch, selectedStatus]);

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
        ? `Are you sure you want to activate "${product.name}"? It will become visible and orderable in the consumer marketplace across ${product.cityAvailability.join(', ')}.`
        : `Are you sure you want to deactivate "${product.name}"? It will be immediately hidden from customer storefronts and active shopping carts.`,
      variant: isActivating ? 'success' : 'warning',
      confirmLabel: isActivating ? 'Activate' : 'Deactivate',
      affectedCount: 1,
      affectedNames: [product.name],
      action: async () => {
        const updated = await productsApi.toggleStatus(product.id);
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      },
    });
  };

  const promptBulkStatus = (newStatus: 'ACTIVE' | 'INACTIVE') => {
    const count = selectedIds.length;
    const names = products
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => `${p.name} (${p.sku})`);

    const isActivating = newStatus === 'ACTIVE';

    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Bulk Activate Products' : 'Bulk Deactivate Products',
      message: isActivating
        ? `You are about to activate ${count} marketplace product(s). They will be live and purchasable by buyers across assigned Ethiopian hub cities.`
        : `You are about to deactivate ${count} marketplace product(s). They will immediately be delisted from all active customer search results.`,
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

  const handleOpenAdd = () => {
    setEditingProduct(null);
    const defaultSup = suppliers[0] || { id: 'SUP-001', companyName: 'Gondar Farmers Union Cooperative' };
    setFormData({
      name: '',
      sku: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      categoryId: categories[0]?.id || 'CAT-01',
      sellerId: defaultSup.id,
      sellerName: defaultSup.companyName,
      description: '',
      originalPrice: 5000,
      discountPercent: 0,
      sellingPrice: 5000,
      weightKg: 25,
      unit: 'bag',
      availability: 'IN_STOCK',
      cityAvailability: ['Gondar', 'Bahir Dar', 'Addis Ababa'],
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      sellerId: product.sellerId || suppliers[0]?.id || 'SUP-001',
      sellerName: product.sellerName || suppliers[0]?.companyName || 'Registered Seller',
      description: product.description,
      originalPrice: product.originalPrice || product.sellingPrice,
      discountPercent: product.discountPercent || 0,
      sellingPrice: product.sellingPrice,
      weightKg: product.weightKg,
      unit: product.unit,
      availability: product.availability,
      cityAvailability: product.cityAvailability,
      status: product.status,
    });
    setIsModalOpen(true);
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
    const categoryName = categories.find((c) => c.id === formData.categoryId)?.name || 'General';
    const sellerObj = suppliers.find((s) => s.id === formData.sellerId);
    const sellerName = sellerObj ? sellerObj.companyName : formData.sellerName;

    const calculatedPrice =
      formData.discountPercent > 0
        ? Math.round(formData.originalPrice * (1 - formData.discountPercent / 100))
        : formData.originalPrice;

    if (editingProduct) {
      await productsApi.update(editingProduct.id, {
        ...formData,
        category: categoryName,
        sellerName,
        sellingPrice: calculatedPrice,
        discountPrice: formData.discountPercent > 0 ? calculatedPrice : undefined,
      });
    } else {
      await productsApi.create({
        ...formData,
        category: categoryName,
        sellerName,
        sellingPrice: calculatedPrice,
        discountPrice: formData.discountPercent > 0 ? calculatedPrice : undefined,
      });
    }
    setIsModalOpen(false);
    refreshData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('ALL');
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Product Catalog & Pricing"
        subtitle="Post products with full specifications, owner / seller attribution, regular prices, and active promotional discounts"
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
            <div className="col-12 col-md-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by product, seller / owner, SKU, category..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search products"
                />
              </div>
            </div>

            <div className="col-6 col-md-4">
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                  setCurrentPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="alert alert-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 py-2 px-3 shadow-sm rounded-3">
            <div className="d-flex align-items-center gap-2 fw-semibold small">
              <i className="bi bi-check2-square fs-6 text-primary"></i>
              <span>{selectedIds.length} product(s) selected</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-success px-3 d-flex align-items-center gap-1"
                onClick={() => promptBulkStatus('ACTIVE')}
              >
                <i className="bi bi-play-circle"></i> Activate Selected
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 d-flex align-items-center gap-1 bg-white"
                onClick={() => promptBulkStatus('INACTIVE')}
              >
                <i className="bi bi-pause-circle"></i> Deactivate Selected
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary text-decoration-none"
                onClick={() => setSelectedIds([])}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Product Count Metric */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="text-muted small">
            Found <strong className="text-dark">{filteredProducts.length}</strong> marketplace products
          </span>
          <span className="badge badge-success-soft">Seller / Owner Linked</span>
        </div>

        {/* Product Table (Desktop) */}
        <div className="ardab-card p-0 mb-4 d-none d-lg-block overflow-hidden">
          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all on current page"
                    />
                  </th>
                  <th>Product / SKU</th>
                  <th>Product Owner (Seller)</th>
                  <th>Category</th>
                  <th>Pricing & Discount</th>
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
                  {paginatedProducts.map((p) => (
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
                          <div
                            className="ardab-icon-box icon-box-green flex-shrink-0"
                            style={{ width: 40, height: 40, fontSize: '1.15rem' }}
                          >
                            <i className="bi bi-box-seam"></i>
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{p.name}</div>
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              SKU: {p.sku} &bull; Unit: {p.unit}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">
                          <i className="bi bi-building me-1 text-muted"></i>
                          {p.sellerName || 'Direct Marketplace'}
                        </div>
                      </td>
                      <td>
                        <span className="text-dark fw-medium small">{p.category}</span>
                      </td>
                      <td>
                        {p.discountPercent > 0 ? (
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
                        <span className="badge badge-neutral-soft">{formatWeight(p.weightKg)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {p.cityAvailability.map((city) => (
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
                      <td>
                        <span
                          className={`ardab-badge ${
                            p.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            paginatedProducts.map((p) => (
              <div
                key={p.id}
                className={`ardab-card p-3 ${selectedIds.includes(p.id) ? 'border-primary' : ''}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-start gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input mt-1"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => handleSelectOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                    <div>
                      <h3 className="h6 fw-bold text-dark mb-0">{p.name}</h3>
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {p.sku} &bull; {p.category}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`ardab-badge ${
                      p.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Seller attribution */}
                <div className="p-2 bg-light rounded-2 small text-muted mb-2">
                  Owner / Seller: <strong className="text-dark">{p.sellerName || 'Direct Marketplace'}</strong>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-dark fs-6">{formatCurrency(p.sellingPrice)}</span>
                      {p.discountPercent > 0 && (
                        <span className="badge badge-warning-soft" style={{ fontSize: '0.65rem' }}>
                          {p.discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    {p.discountPercent > 0 && p.originalPrice && (
                      <span
                        className="text-muted text-decoration-line-through small"
                        style={{ fontSize: '0.75rem' }}
                      >
                        {formatCurrency(p.originalPrice)}
                      </span>
                    )}
                  </div>
                  <span className="badge badge-neutral-soft">{formatWeight(p.weightKg)}</span>
                </div>

                <div className="d-flex gap-1 flex-wrap mb-3">
                  {p.cityAvailability.map((city) => (
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
                    </>
                  )}
                </div>
              </div>
            ))
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

        {/* Modal: Add / Edit Product with Owner & Discount */}
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
                      Assign product owner / seller, base price, and active discounts
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <form onSubmit={handleSaveProduct}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      {/* Product Name */}
                      <div className="col-md-8">
                        <label className="form-label">Product Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Magna White Teff (50 KG Bag)"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      {/* SKU */}
                      <div className="col-md-4">
                        <label className="form-label">SKU / Item Code *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>

                      {/* Product Owner / Seller (Supplier) */}
                      <div className="col-md-6">
                        <label className="form-label">Product Owner / Seller (Supplier) *</label>
                        <select
                          className="form-select"
                          value={formData.sellerId}
                          onChange={(e) => {
                            const sup = suppliers.find((s) => s.id === e.target.value);
                            setFormData({
                              ...formData,
                              sellerId: e.target.value,
                              sellerName: sup ? sup.companyName : '',
                            });
                          }}
                        >
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.companyName} ({sup.city})
                            </option>
                          ))}
                        </select>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          Owner / Merchant supplier fulfilling this commodity
                        </span>
                      </div>

                      {/* Category */}
                      <div className="col-md-6">
                        <label className="form-label">Marketplace Category *</label>
                        <select
                          className="form-select"
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-12">
                        <label className="form-label">Product Description</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Provide details about quality grade, origin, packaging..."
                        ></textarea>
                      </div>

                      {/* PRICING & DISCOUNT SECTION */}
                      <div className="col-12">
                        <div className="p-3 bg-light rounded-3 border">
                          <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-tag-fill text-success"></i>
                            Pricing, Valuation & Active Discount
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label small fw-semibold">Regular / Original Price (ETB) *</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  className="form-control"
                                  required
                                  min={0}
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

                            <div className="col-md-4">
                              <label className="form-label small fw-semibold">Final Marketplace Selling Price</label>
                              <div className="form-control bg-white fw-bold text-success">
                                {formatCurrency(formData.sellingPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Logistics details */}
                      <div className="col-md-6">
                        <label className="form-label">Unit Weight (KG) *</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={0.1}
                            step={0.1}
                            value={formData.weightKg}
                            onChange={(e) =>
                              setFormData({ ...formData, weightKg: Number(e.target.value) })
                            }
                          />
                          <span className="input-group-text small">KG</span>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Packaging Unit *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. bag, sack, kg, bunch"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        />
                      </div>

                      {/* Initial Status */}
                      <div className="col-md-6">
                        <label className="form-label">Catalog Status</label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target.value as 'ACTIVE' | 'INACTIVE',
                            })
                          }
                        >
                          <option value="ACTIVE">Active (Immediate Listing)</option>
                          <option value="INACTIVE">Inactive (Draft / Hidden)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline btn-sm"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary btn-sm">
                      {editingProduct ? 'Save Changes' : 'Publish Product'}
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
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{viewProduct.name}</h5>
                    <span className="text-muted small">
                      Owner: {viewProduct.sellerName || 'Direct Marketplace'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewProduct(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <span className="text-muted small">Description</span>
                    <p className="text-dark small mt-1">{viewProduct.description}</p>
                  </div>
                  <div className="row g-3 pt-2 border-top">
                    <div className="col-6">
                      <div className="text-muted small">Selling Price</div>
                      <div className="fw-bold fs-5 text-success">
                        {formatCurrency(viewProduct.sellingPrice)}
                      </div>
                      {viewProduct.discountPercent > 0 && (
                        <div className="text-muted small">
                          <span className="text-decoration-line-through me-1">
                            {viewProduct.originalPrice ? formatCurrency(viewProduct.originalPrice) : ''}
                          </span>
                          <span className="badge badge-warning-soft">
                            {viewProduct.discountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Logistics Unit Weight</div>
                      <div className="fw-bold fs-5 text-dark">
                        {formatWeight(viewProduct.weightKg)} / {viewProduct.unit}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Seller / Supplier</div>
                      <div className="text-dark fw-medium small">
                        {viewProduct.sellerName || 'Direct Platform'}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Category</div>
                      <div className="text-dark fw-medium small">{viewProduct.category}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">SKU</div>
                      <code>{viewProduct.sku}</code>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Status</div>
                      <span className="badge badge-success-soft">{viewProduct.status}</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-ardab-outline btn-sm"
                    onClick={() => setViewProduct(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
