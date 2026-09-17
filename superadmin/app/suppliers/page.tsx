'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { suppliersApi, paymentMethodsApi } from '@/lib/api';
import { Supplier, SupplierStatus, SupplierPaymentMethodItem } from '@/types/supplier';
import { PaymentMethod } from '@/types/paymentMethod';

export default function SuppliersPage() {
  const { selectedCity } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'suppliers' | 'payment-methods'>('suppliers');

  // Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);

  // Modals & Active Records
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Payment Methods State (Super Admin Management)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);
  const [pmFormError, setPmFormError] = useState<string | null>(null);
  const [isPmSubmitting, setIsPmSubmitting] = useState(false);
  const [pmFormData, setPmFormData] = useState({
    name: '',
    provider: '',
    accountName: '',
    accountNumber: '',
    description: '',
    isActive: true,
  });

  // Register Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '+251 9',
    email: '',
    city: 'Gondar',
    category: '',
    tinNumber: '',
    address: '',
    status: 'ACTIVE' as SupplierStatus,
    notes: '',
    paymentMethods: [
      { paymentMethod: '', accountNumber: '' },
    ] as Array<{ paymentMethod: string; accountNumber: string; isPrimary?: boolean }>,
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    city: '',
    category: '',
    tinNumber: '',
    address: '',
    status: 'ACTIVE' as SupplierStatus,
    notes: '',
    paymentMethods: [] as Array<{ paymentMethod: string; accountNumber: string; isPrimary?: boolean }>,
  });

  // Debounce Search Term (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Suppliers from Real Backend
  const fetchSuppliers = useCallback(async (pageToLoad = 1) => {
    setIsLoadingSuppliers(true);
    setSuppliersError(null);
    try {
      const res = await suppliersApi.list({
        page: pageToLoad,
        limit: pagination.pageSize,
        city: selectedCity,
        status: statusFilter,
        search: debouncedSearch,
      });
      setSuppliers(res.items);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to supplier services.';
      setSuppliersError(msg);
      setSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [pagination.pageSize, selectedCity, statusFilter, debouncedSearch]);

  // Trigger supplier load on query changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers(pagination.page);
  }, [fetchSuppliers, pagination.page]);

  // Load Payment Methods from Real Backend
  const fetchPaymentMethods = useCallback(async () => {
    setIsLoadingPaymentMethods(true);
    setPaymentMethodsError(null);
    try {
      const res = await paymentMethodsApi.getAll();
      setPaymentMethods(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load system payment methods.';
      setPaymentMethodsError(msg);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'payment-methods') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPaymentMethods();
    }
  }, [activeTab, fetchPaymentMethods]);

  // Open Register Modal
  const handleOpenRegister = () => {
    setFormData({
      name: '',
      companyName: '',
      phone: '+251 9',
      email: '',
      city: selectedCity === 'All Cities' ? 'Gondar' : selectedCity,
      category: '',
      tinNumber: '',
      address: '',
      status: 'ACTIVE',
      notes: '',
      paymentMethods: [
        { paymentMethod: '', accountNumber: '' },
      ],
    });
    setFormError(null);
    setIsRegisterModalOpen(true);
  };

  // Payment Method Row Management (Register)
  const handleAddPaymentMethodRow = () => {
    setFormData((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, { paymentMethod: '', accountNumber: '' }],
    }));
  };

  const handleRemovePaymentMethodRow = (index: number) => {
    if (formData.paymentMethods.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index),
    }));
  };

  const handlePaymentMethodChange = (
    index: number,
    field: 'paymentMethod' | 'accountNumber',
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.paymentMethods];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, paymentMethods: updated };
    });
  };

  // Submit Register Form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validPaymentMethods = formData.paymentMethods.filter(
      (pm) => pm.paymentMethod.trim().length > 0 && pm.accountNumber.trim().length > 0
    );

    if (validPaymentMethods.length === 0) {
      setFormError('Settlement payment method is required. Please provide at least one payment method and account number.');
      return;
    }

    for (let i = 0; i < formData.paymentMethods.length; i++) {
      const pm = formData.paymentMethods[i];
      if (!pm.paymentMethod.trim() || !pm.accountNumber.trim()) {
        setFormError(`Payment Method #${i + 1} is incomplete. Both the method name and account number must be entered.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await suppliersApi.register({
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() ? formData.email.trim() : null,
        city: formData.city.trim(),
        category: formData.category.trim() ? formData.category.trim() : null,
        tinNumber: formData.tinNumber.trim() ? formData.tinNumber.trim() : null,
        address: formData.address.trim(),
        status: formData.status,
        paymentMethods: validPaymentMethods.map((pm, idx) => ({
          paymentMethod: pm.paymentMethod.trim(),
          accountNumber: pm.accountNumber.trim(),
          isPrimary: idx === 0,
        })),
        notes: formData.notes.trim() ? formData.notes.trim() : null,
      });
      setIsRegisterModalOpen(false);
      fetchSuppliers(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register supplier. Please review inputs.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setEditFormData({
      name: supplier.name,
      companyName: supplier.companyName,
      phone: supplier.phone,
      email: supplier.email || '',
      city: supplier.city,
      category: supplier.category || '',
      tinNumber: supplier.tinNumber || '',
      address: supplier.address,
      status: supplier.status,
      notes: supplier.notes || '',
      paymentMethods: supplier.paymentMethods && supplier.paymentMethods.length > 0
        ? supplier.paymentMethods.map((pm) => ({
            paymentMethod: pm.paymentMethod,
            accountNumber: pm.accountNumber,
            isPrimary: pm.isPrimary,
          }))
        : [{ paymentMethod: '', accountNumber: '' }],
    });
    setFormError(null);
  };

  // Payment Method Row Management (Edit)
  const handleAddEditPaymentMethodRow = () => {
    setEditFormData((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, { paymentMethod: '', accountNumber: '' }],
    }));
  };

  const handleRemoveEditPaymentMethodRow = (index: number) => {
    if (editFormData.paymentMethods.length <= 1) return;
    setEditFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index),
    }));
  };

  const handleEditPaymentMethodChange = (
    index: number,
    field: 'paymentMethod' | 'accountNumber',
    value: string
  ) => {
    setEditFormData((prev) => {
      const updated = [...prev.paymentMethods];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, paymentMethods: updated };
    });
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;
    setFormError(null);

    const validPaymentMethods = editFormData.paymentMethods.filter(
      (pm) => pm.paymentMethod.trim().length > 0 && pm.accountNumber.trim().length > 0
    );

    if (validPaymentMethods.length === 0) {
      setFormError('Settlement payment method is required. Please provide at least one payment method and account number.');
      return;
    }

    for (let i = 0; i < editFormData.paymentMethods.length; i++) {
      const pm = editFormData.paymentMethods[i];
      if (!pm.paymentMethod.trim() || !pm.accountNumber.trim()) {
        setFormError(`Payment Method #${i + 1} is incomplete. Both the method name and account number must be entered.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated = await suppliersApi.update(editSupplier.id, {
        name: editFormData.name.trim(),
        companyName: editFormData.companyName.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() ? editFormData.email.trim() : null,
        city: editFormData.city.trim(),
        category: editFormData.category.trim() ? editFormData.category.trim() : null,
        tinNumber: editFormData.tinNumber.trim() ? editFormData.tinNumber.trim() : null,
        address: editFormData.address.trim(),
        status: editFormData.status,
        paymentMethods: validPaymentMethods.map((pm, idx) => ({
          paymentMethod: pm.paymentMethod.trim(),
          accountNumber: pm.accountNumber.trim(),
          isPrimary: idx === 0,
        })),
        notes: editFormData.notes.trim() ? editFormData.notes.trim() : null,
      });

      setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewSupplier && viewSupplier.id === updated.id) {
        setViewSupplier(updated);
      }
      setEditSupplier(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update supplier.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (id: string) => {
    try {
      const updated = await suppliersApi.toggleStatus(id);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (viewSupplier && viewSupplier.id === id) {
        setViewSupplier(updated);
      }
    } catch (e) {
      console.error('Failed to toggle supplier status:', e);
    }
  };

  // Payment Method Management Handlers
  const handleOpenCreatePm = () => {
    setEditingPm(null);
    setPmFormData({
      name: '',
      provider: '',
      accountName: '',
      accountNumber: '',
      description: '',
      isActive: true,
    });
    setPmFormError(null);
    setIsPmModalOpen(true);
  };

  const handleOpenEditPm = (pm: PaymentMethod) => {
    setEditingPm(pm);
    setPmFormData({
      name: pm.name,
      provider: pm.provider || '',
      accountName: pm.accountName || '',
      accountNumber: pm.accountNumber || '',
      description: pm.description || '',
      isActive: pm.isActive,
    });
    setPmFormError(null);
    setIsPmModalOpen(true);
  };

  const handleTogglePmStatus = async (pm: PaymentMethod) => {
    try {
      const updated = await paymentMethodsApi.toggleStatus(pm.id, !pm.isActive);
      setPaymentMethods((prev) => prev.map((item) => (item.id === pm.id ? updated : item)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle status.';
      alert(msg);
    }
  };

  const handlePmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmFormError(null);

    if (!pmFormData.name.trim()) {
      setPmFormError('Payment method name is required.');
      return;
    }

    setIsPmSubmitting(true);
    try {
      if (editingPm) {
        const updated = await paymentMethodsApi.update(editingPm.id, {
          name: pmFormData.name.trim(),
          provider: pmFormData.provider.trim() || null,
          accountName: pmFormData.accountName.trim() || null,
          accountNumber: pmFormData.accountNumber.trim() || null,
          description: pmFormData.description.trim() || null,
          isActive: pmFormData.isActive,
        });
        setPaymentMethods((prev) => prev.map((item) => (item.id === editingPm.id ? updated : item)));
      } else {
        const created = await paymentMethodsApi.create({
          name: pmFormData.name.trim(),
          provider: pmFormData.provider.trim() || null,
          accountName: pmFormData.accountName.trim() || null,
          accountNumber: pmFormData.accountNumber.trim() || null,
          description: pmFormData.description.trim() || null,
          isActive: pmFormData.isActive,
        });
        setPaymentMethods((prev) => [created, ...prev]);
      }
      setIsPmModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save payment method.';
      setPmFormError(msg);
    } finally {
      setIsPmSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Supplier & Payment Management"
        subtitle="Manage agricultural producers, commodity enterprises, and platform settlement payment channels"
        breadcrumbs={[{ label: 'Marketplace' }, { label: 'Suppliers & Settlement' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            {activeTab === 'suppliers' ? (
              <button
                type="button"
                className="btn btn-ardab-primary d-flex align-items-center gap-2"
                onClick={handleOpenRegister}
              >
                <i className="bi bi-building-add"></i>
                <span>Register New Supplier</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ardab-primary d-flex align-items-center gap-2"
                onClick={handleOpenCreatePm}
              >
                <i className="bi bi-credit-card-2-front-fill"></i>
                <span>Add Payment Channel</span>
              </button>
            )}
          </div>
        }
      >
        {/* Navigation Tabs */}
        <div className="d-flex border-bottom mb-4">
          <button
            type="button"
            className={`btn border-0 py-2 px-3 fw-bold rounded-0 ${
              activeTab === 'suppliers'
                ? 'border-bottom border-success border-3 text-success'
                : 'text-muted'
            }`}
            onClick={() => setActiveTab('suppliers')}
          >
            <i className="bi bi-building me-2"></i>
            Suppliers Directory
          </button>
          <button
            type="button"
            className={`btn border-0 py-2 px-3 fw-bold rounded-0 ${
              activeTab === 'payment-methods'
                ? 'border-bottom border-success border-3 text-success'
                : 'text-muted'
            }`}
            onClick={() => setActiveTab('payment-methods')}
          >
            <i className="bi bi-wallet2 me-2"></i>
            System Payment Methods
          </button>
        </div>

        {activeTab === 'suppliers' ? (
          <>
            {/* KPI Metric Overview */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <div className="ardab-card p-3 h-100">
                  <span className="text-muted small">Total Registered Suppliers</span>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <h3 className="fw-bold mb-0 text-dark">{pagination.total}</h3>
                    <span className="badge badge-success-soft">Onboarded</span>
                  </div>
                  <div className="text-muted small mt-1">
                    Supplying verified regional commodities
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="ardab-card p-3 h-100">
                  <span className="text-muted small">Active Commercial Suppliers</span>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <h3 className="fw-bold mb-0 text-success">
                      {suppliers.filter((s) => s.status === 'ACTIVE').length}
                    </h3>
                    <span className="badge badge-success-soft">Active Status</span>
                  </div>
                  <div className="text-muted small mt-1">
                    Verified with Ethiopian TIN & Trade License
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="ardab-card p-3 h-100">
                  <span className="text-muted small">Total Supplied Products</span>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <h3 className="fw-bold mb-0 text-dark">
                      {suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0)} Items
                    </h3>
                    <span className="badge badge-info-soft">In Marketplace</span>
                  </div>
                  <div className="text-muted small mt-1">
                    Linked directly to product sellers
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div className="ardab-card p-3 mb-4">
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-7">
                  <div className="position-relative">
                    <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                    <input
                      type="text"
                      className="form-control ps-5"
                      placeholder="Search by enterprise, contact, payment method, account #, city..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-5 d-flex gap-2 justify-content-md-end">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED');
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="SUSPENDED">Suspended Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {suppliersError && (
              <div className="alert alert-danger py-3 mb-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                  <span>{suppliersError}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => fetchSuppliers(pagination.page)}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i> Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoadingSuppliers ? (
              <div className="ardab-card p-5 text-center text-muted mb-4">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Loading suppliers...</span>
                </div>
                <div>Fetching platform suppliers from PostgreSQL database...</div>
              </div>
            ) : (
              <>
                {/* Desktop Suppliers Table */}
                <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden">
                  <div className="ardab-table-wrapper">
                    <table className="ardab-table">
                      <thead>
                        <tr>
                          <th>Supplier / Enterprise</th>
                          <th>Contact Person</th>
                          <th>City Hub</th>
                          <th>Commodity Category</th>
                          <th>Payment Methods & Accounts</th>
                          <th>Supplied Products</th>
                          <th>Status</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map((sup) => (
                          <tr key={sup.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="ardab-icon-box icon-box-green flex-shrink-0"
                                  style={{ width: 38, height: 38, fontSize: '1.1rem' }}
                                >
                                  <i className="bi bi-building"></i>
                                </div>
                                <div>
                                  <div className="fw-bold text-dark">{sup.companyName}</div>
                                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                    ID: {sup.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="text-dark fw-medium">{sup.name}</div>
                              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                {sup.phone} {sup.email ? `• ${sup.email}` : ''}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">{sup.city}</span>
                            </td>
                            <td>
                              <span className="text-dark small fw-medium">{sup.category || '—'}</span>
                            </td>
                            <td>
                              {sup.paymentMethods && sup.paymentMethods.length > 0 ? (
                                <div className="d-flex flex-column gap-1">
                                  {sup.paymentMethods.map((pm, idx) => (
                                    <div key={idx} className="small text-dark text-nowrap">
                                      <span className="fw-semibold text-primary">{pm.paymentMethod}: </span>
                                      <code className="text-secondary small">{pm.accountNumber}</code>
                                      {pm.isPrimary && (
                                        <span className="badge bg-success-subtle text-success ms-1" style={{ fontSize: '0.65rem' }}>
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : sup.paymentMethod?.name ? (
                                <span className="badge bg-light text-secondary border fw-normal">
                                  <i className="bi bi-wallet2 me-1"></i>
                                  {sup.paymentMethod.name}
                                </span>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-info-soft">{sup.productCount || 0} items</span>
                            </td>
                            <td>
                              <span
                                className={`ardab-badge ${
                                  sup.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                                }`}
                              >
                                {sup.status}
                              </span>
                            </td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border"
                                  title="View Details"
                                  onClick={() => setViewSupplier(sup)}
                                >
                                  <i className="bi bi-eye"></i> Details
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border"
                                  title="Edit Supplier"
                                  onClick={() => handleOpenEdit(sup)}
                                >
                                  <i className="bi bi-pencil"></i> Edit
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    sup.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                                  }`}
                                  title={sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                  onClick={() => handleToggleStatus(sup.id)}
                                >
                                  {sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-5 text-muted">
                              <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                              No suppliers found matching the criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Supplier Cards */}
                <div className="d-lg-none d-flex flex-column gap-3 mb-4">
                  {suppliers.map((sup) => (
                    <div key={sup.id} className="ardab-card p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h3 className="h6 fw-bold text-dark mb-0">{sup.companyName}</h3>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {sup.name} &bull; {sup.city}
                          </div>
                        </div>
                        <span
                          className={`ardab-badge ${
                            sup.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {sup.status}
                        </span>
                      </div>

                      <div className="p-2 bg-light rounded-3 mb-2 small text-muted">
                        <div>Category: <strong className="text-dark">{sup.category || '—'}</strong></div>
                        <div>TIN: <code>{sup.tinNumber || '—'}</code> &bull; Phone: {sup.phone}</div>
                        {sup.email && <div>Email: {sup.email}</div>}
                      </div>

                      {sup.paymentMethods && sup.paymentMethods.length > 0 && (
                        <div className="p-2 bg-light rounded-3 mb-2 small text-muted">
                          <span className="fw-semibold text-dark d-block mb-1">Settlement Accounts:</span>
                          <div className="d-flex flex-column gap-1">
                            {sup.paymentMethods.map((pm, idx) => (
                              <div key={idx} className="p-1 px-2 bg-white rounded border small d-flex justify-content-between">
                                <span className="fw-medium text-dark">{pm.paymentMethod}</span>
                                <code className="text-primary">{pm.accountNumber}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">Products Supplied:</span>
                        <span className="badge badge-info-soft">{sup.productCount || 0} Items</span>
                      </div>

                      <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => setViewSupplier(sup)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => handleOpenEdit(sup)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            sup.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                          }`}
                          onClick={() => handleToggleStatus(sup.id)}
                        >
                          {sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {suppliers.length === 0 && (
                    <div className="ardab-card p-4 text-center text-muted">
                      <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                      No suppliers found matching the criteria.
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {pagination.total > 0 && (
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mb-4">
                    <span className="text-muted small">
                      Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total suppliers)
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-ardab-outline"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      >
                        <i className="bi bi-chevron-left"></i> Previous
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ardab-outline"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Next <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Tab 2: System Payment Methods */
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-1">System Settlement Payment Channels</h5>
                <span className="text-muted small">
                  Configure active settlement methods (banks, mobile wallets) for the Ardab Market platform
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1"
                onClick={handleOpenCreatePm}
              >
                <i className="bi bi-plus-lg"></i> Add Payment Method
              </button>
            </div>

            {paymentMethodsError && (
              <div className="alert alert-danger py-2 small mb-3">
                {paymentMethodsError}
              </div>
            )}

            {isLoadingPaymentMethods ? (
              <div className="ardab-card p-4 text-center text-muted">
                <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                Loading payment channels...
              </div>
            ) : (
              <div className="ardab-card p-0 overflow-hidden">
                <div className="ardab-table-wrapper">
                  <table className="ardab-table">
                    <thead>
                      <tr>
                        <th>Channel / Method Name</th>
                        <th>Provider / Category</th>
                        <th>Default Account Holder</th>
                        <th>Default Account Number</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods.map((pm) => (
                        <tr key={pm.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="ardab-icon-box icon-box-green flex-shrink-0"
                                style={{ width: 34, height: 34, fontSize: '1rem' }}
                              >
                                <i className="bi bi-wallet2"></i>
                              </div>
                              <div>
                                <span className="fw-bold text-dark">{pm.name}</span>
                                {pm.description && (
                                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                    {pm.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {pm.provider || 'Settlement Channel'}
                            </span>
                          </td>
                          <td>
                            <span className="text-dark small">{pm.accountName || '—'}</span>
                          </td>
                          <td>
                            {pm.accountNumber ? (
                              <code className="text-primary">{pm.accountNumber}</code>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`ardab-badge ${
                                pm.isActive ? 'badge-success-soft' : 'badge-danger-soft'
                              }`}
                            >
                              {pm.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border"
                                onClick={() => handleOpenEditPm(pm)}
                              >
                                <i className="bi bi-pencil"></i> Edit
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  pm.isActive ? 'btn-outline-danger' : 'btn-outline-success'
                                }`}
                                onClick={() => handleTogglePmStatus(pm)}
                              >
                                {pm.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paymentMethods.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            No payment methods registered yet. Click &quot;Add Payment Method&quot; to configure one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Register New Supplier */}
        {isRegisterModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="ardab-icon-box icon-box-green"
                      style={{ width: 36, height: 36, fontSize: '1.1rem' }}
                    >
                      <i className="bi bi-building-add"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        Register New Platform Supplier
                      </h5>
                      <span className="text-muted small">
                        Onboard an authorized seller / producer into Ardab Market
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={isSubmitting}
                    onClick={() => setIsRegisterModalOpen(false)}
                  ></button>
                </div>

                <form onSubmit={handleRegisterSubmit}>
                  <div className="modal-body p-4">
                    {formError && (
                      <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label">Registered Business / Enterprise Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Gondar Union Farm Cooperative"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        />
                      </div>

                      <div className="col-md-5">
                        <label className="form-label">Contact Person / Manager Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Girma Wube"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="+251 91 123 4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Email Address (Optional)</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="e.g. supplier@example.et (optional)"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Operational City Hub *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          list="city-hub-suggestions"
                          placeholder="e.g. Gondar, Bahir Dar, Addis Ababa"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                        <datalist id="city-hub-suggestions">
                          <option value="Gondar" />
                          <option value="Bahir Dar" />
                          <option value="Addis Ababa" />
                          <option value="Hawassa" />
                          <option value="Dire Dawa" />
                          <option value="Mekelle" />
                          <option value="Adama" />
                          <option value="Jimma" />
                        </datalist>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Commodity Category (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          list="category-suggestions"
                          placeholder="e.g. Grains & Teff, Coffee, Oilseeds"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                        <datalist id="category-suggestions">
                          <option value="Grains & Teff" />
                          <option value="Edible Oils & Seeds" />
                          <option value="Coffee & Spices" />
                          <option value="Honey & Natural Sweeteners" />
                          <option value="Pulses & Legumes" />
                          <option value="Fresh Dairy & Butter" />
                        </datalist>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">TIN Number (Tax ID)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 0048192019"
                          value={formData.tinNumber}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Business / Warehouse Address *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Arada Commercial Zone, Warehouse #12, Gondar"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>

                      {/* Multi-Entry Payment Methods */}
                      <div className="col-12">
                        <div className="card border p-3 rounded-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <label className="form-label fw-bold mb-0 text-dark">
                                Settlement Payment Methods & Accounts *
                              </label>
                              <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>
                                Enter payment method name (e.g. Commercial Bank of Ethiopia, Telebirr) and account number.
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                              onClick={handleAddPaymentMethodRow}
                            >
                              <i className="bi bi-plus-circle"></i>
                              <span>Add Another Method</span>
                            </button>
                          </div>

                          <div className="d-flex flex-column gap-2 mt-2">
                            {formData.paymentMethods.map((pm, index) => (
                              <div
                                key={index}
                                className="p-2 bg-white rounded-3 border d-flex flex-column flex-md-row gap-2 align-items-md-center"
                              >
                                <div className="d-flex align-items-center gap-2 flex-grow-1">
                                  <span
                                    className="badge bg-light text-secondary border flex-shrink-0"
                                    style={{ minWidth: '32px', textAlign: 'center' }}
                                  >
                                    #{index + 1}
                                  </span>
                                  <div className="flex-grow-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      required
                                      list="payment-method-suggestions"
                                      placeholder="Payment Method (e.g. Commercial Bank of Ethiopia, Telebirr)"
                                      value={pm.paymentMethod}
                                      onChange={(e) =>
                                        handlePaymentMethodChange(index, 'paymentMethod', e.target.value)
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-2 flex-grow-1">
                                  <div className="flex-grow-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm font-monospace"
                                      required
                                      placeholder="Account Number (e.g. 1000293848123 or 0911223344)"
                                      value={pm.accountNumber}
                                      onChange={(e) =>
                                        handlePaymentMethodChange(index, 'accountNumber', e.target.value)
                                      }
                                    />
                                  </div>
                                  {formData.paymentMethods.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      title="Remove this payment method"
                                      onClick={() => handleRemovePaymentMethodRow(index)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Administrative Notes (Optional)</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Special instructions or verification notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline"
                      disabled={isSubmitting}
                      onClick={() => setIsRegisterModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Registering Supplier...
                        </>
                      ) : (
                        'Register & Activate Supplier'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Supplier */}
        {editSupplier && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="ardab-icon-box icon-box-green"
                      style={{ width: 36, height: 36, fontSize: '1.1rem' }}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        Edit Supplier: {editSupplier.companyName}
                      </h5>
                      <span className="text-muted small">
                        Update enterprise details and settlement payment channels
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={isSubmitting}
                    onClick={() => setEditSupplier(null)}
                  ></button>
                </div>

                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body p-4">
                    {formError && (
                      <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label">Business / Enterprise Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editFormData.companyName}
                          onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                        />
                      </div>

                      <div className="col-md-5">
                        <label className="form-label">Contact Person *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Email Address (Optional)</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Optional"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">City Hub *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          list="city-hub-suggestions"
                          value={editFormData.city}
                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Commodity Category (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          list="category-suggestions"
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">TIN Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.tinNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, tinNumber: e.target.value })}
                        />
                      </div>

                      <div className="col-md-8">
                        <label className="form-label">Physical Address *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editFormData.address}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Status *</label>
                        <select
                          className="form-select"
                          value={editFormData.status}
                          onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as SupplierStatus })}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="PENDING">PENDING</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>

                      {/* Multi-Entry Payment Methods (Edit) */}
                      <div className="col-12">
                        <div className="card border p-3 rounded-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <label className="form-label fw-bold mb-0 text-dark">
                                Settlement Payment Methods & Accounts *
                              </label>
                              <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>
                                Add or modify settlement channels and account numbers.
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                              onClick={handleAddEditPaymentMethodRow}
                            >
                              <i className="bi bi-plus-circle"></i>
                              <span>Add Another Method</span>
                            </button>
                          </div>

                          <div className="d-flex flex-column gap-2 mt-2">
                            {editFormData.paymentMethods.map((pm, index) => (
                              <div
                                key={index}
                                className="p-2 bg-white rounded-3 border d-flex flex-column flex-md-row gap-2 align-items-md-center"
                              >
                                <div className="d-flex align-items-center gap-2 flex-grow-1">
                                  <span
                                    className="badge bg-light text-secondary border flex-shrink-0"
                                    style={{ minWidth: '32px', textAlign: 'center' }}
                                  >
                                    #{index + 1}
                                  </span>
                                  <div className="flex-grow-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      required
                                      list="payment-method-suggestions"
                                      placeholder="Payment Method"
                                      value={pm.paymentMethod}
                                      onChange={(e) =>
                                        handleEditPaymentMethodChange(index, 'paymentMethod', e.target.value)
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-2 flex-grow-1">
                                  <div className="flex-grow-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm font-monospace"
                                      required
                                      placeholder="Account Number"
                                      value={pm.accountNumber}
                                      onChange={(e) =>
                                        handleEditPaymentMethodChange(index, 'accountNumber', e.target.value)
                                      }
                                    />
                                  </div>
                                  {editFormData.paymentMethods.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      title="Remove this payment method"
                                      onClick={() => handleRemoveEditPaymentMethodRow(index)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline"
                      disabled={isSubmitting}
                      onClick={() => setEditSupplier(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving Changes...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Supplier Details */}
        {viewSupplier && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{viewSupplier.companyName}</h5>
                    <span className="text-muted small">Registered Platform Supplier</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewSupplier(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <span className="text-muted small">Contact Person</span>
                      <div className="fw-semibold text-dark">{viewSupplier.name}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Phone Number</span>
                      <div className="fw-semibold text-dark">{viewSupplier.phone}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Email Address</span>
                      <div className="fw-semibold text-dark">{viewSupplier.email || '—'}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">City Hub</span>
                      <div className="fw-semibold text-dark">{viewSupplier.city}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Commodity Category</span>
                      <div className="fw-semibold text-dark">{viewSupplier.category || '—'}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">TIN (Tax ID)</span>
                      <div><code>{viewSupplier.tinNumber || '—'}</code></div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Account Status</span>
                      <div>
                        <span className={`badge ${viewSupplier.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'}`}>
                          {viewSupplier.status}
                        </span>
                      </div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Supplied Commodities</span>
                      <div>
                        <span className="badge badge-info-soft">{viewSupplier.productCount || 0} Products</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <span className="text-muted small">Physical Address</span>
                      <div className="text-dark small">{viewSupplier.address}</div>
                    </div>

                    {/* Multi-Entry Payment Methods List */}
                    {viewSupplier.paymentMethods && viewSupplier.paymentMethods.length > 0 && (
                      <div className="col-12 p-3 bg-light rounded-3 border">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted small fw-semibold">
                            Configured Settlement Payment Methods ({viewSupplier.paymentMethods.length})
                          </span>
                          <span className="badge badge-success-soft small">Settlement Active</span>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {viewSupplier.paymentMethods.map((pm: SupplierPaymentMethodItem, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 px-3 bg-white rounded-2 border d-flex justify-content-between align-items-center"
                            >
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-wallet2 text-primary"></i>
                                <span className="fw-bold text-dark small">{pm.paymentMethod}</span>
                                {pm.isPrimary && (
                                  <span className="badge badge-success-soft" style={{ fontSize: '0.65rem' }}>
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="text-end">
                                <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>
                                  Account Number
                                </span>
                                <code className="fw-bold text-dark">{pm.accountNumber}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <div>
                      <span className="text-muted small">Supplied Commodities: </span>
                      <strong className="text-dark">{viewSupplier.productCount || 0} Products</strong>
                    </div>
                    <Link
                      href="/products"
                      className="btn btn-sm btn-ardab-light"
                      onClick={() => setViewSupplier(null)}
                    >
                      View Products by this Supplier &rarr;
                    </Link>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-ardab-outline btn-sm"
                    onClick={() => {
                      const s = viewSupplier;
                      setViewSupplier(null);
                      handleOpenEdit(s);
                    }}
                  >
                    <i className="bi bi-pencil me-1"></i> Edit Supplier
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      viewSupplier.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                    }`}
                    onClick={() => handleToggleStatus(viewSupplier.id)}
                  >
                    {viewSupplier.status === 'ACTIVE' ? 'Suspend Supplier' : 'Activate Supplier'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit System Payment Method */}
        {isPmModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    {editingPm ? 'Edit Payment Channel' : 'Add System Payment Channel'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={isPmSubmitting}
                    onClick={() => setIsPmModalOpen(false)}
                  ></button>
                </div>
                <form onSubmit={handlePmSubmit}>
                  <div className="modal-body p-4">
                    {pmFormError && (
                      <div className="alert alert-danger py-2 small mb-3">
                        {pmFormError}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label">Payment Method Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Commercial Bank of Ethiopia (CBE), Telebirr"
                        value={pmFormData.name}
                        onChange={(e) => setPmFormData({ ...pmFormData, name: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Provider / Type (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mobile Money, Commercial Bank"
                        value={pmFormData.provider}
                        onChange={(e) => setPmFormData({ ...pmFormData, provider: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Account Holder Name (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Ardab Market Platform PLC"
                        value={pmFormData.accountName}
                        onChange={(e) => setPmFormData({ ...pmFormData, accountName: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Settlement Account Number (Optional)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. 1000293848123"
                        value={pmFormData.accountNumber}
                        onChange={(e) => setPmFormData({ ...pmFormData, accountNumber: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Description (Optional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Instructions or notes for settlement"
                        value={pmFormData.description}
                        onChange={(e) => setPmFormData({ ...pmFormData, description: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="pmActiveSwitch"
                        checked={pmFormData.isActive}
                        onChange={(e) => setPmFormData({ ...pmFormData, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="pmActiveSwitch">
                        Active Channel for Settlements
                      </label>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline"
                      disabled={isPmSubmitting}
                      onClick={() => setIsPmModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-ardab-primary"
                      disabled={isPmSubmitting}
                    >
                      {isPmSubmitting ? 'Saving...' : editingPm ? 'Save Changes' : 'Create Channel'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Global Datalists */}
        <datalist id="payment-method-suggestions">
          <option value="Commercial Bank of Ethiopia (CBE)" />
          <option value="Telebirr" />
          <option value="Dashen Bank / Amole" />
          <option value="Awash Bank" />
          <option value="CBE Birr" />
          <option value="Bank of Abyssinia" />
          <option value="Cooperative Bank of Oromia" />
          <option value="Nib International Bank" />
          <option value="United Bank (Hibret)" />
          <option value="Wegagen Bank" />
        </datalist>
      </PageContainer>
    </AdminLayout>
  );
}
