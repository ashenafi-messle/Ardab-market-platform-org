'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { customersApi } from '@/lib/api';
import {
  Customer,
  CustomerSummaryMetrics,
  CustomerAccountStatus,
} from '@/types/customer';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

export default function CustomersPage() {
  const { user, isLoading: authLoading, selectedCity } = useAuth();

  // Summary Cards state
  const [summary, setSummary] = useState<CustomerSummaryMetrics | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Customer List & Pagination state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');
  const [filterCity, setFilterCity] = useState<string>('All Cities');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Customer Details Drawer/Modal state
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'activity' | 'edit'>('overview');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [customerActivity, setCustomerActivity] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Edit Customer Profile Form state
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: 'Gondar',
    deliveryZone: '',
    verificationStatus: 'PENDING',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const canSuspend = hasPermission(user?.role, 'customers:suspend');

  // Sync selectedCity from header to filter if changed
  useEffect(() => {
    if (selectedCity && selectedCity !== 'All Cities') {
      setFilterCity(selectedCity);
    } else {
      setFilterCity('All Cities');
    }
  }, [selectedCity]);

  // Fetch summary counters from backend
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const res = await customersApi.getSummary();
      setSummary(res);
    } catch (err) {
      console.error('Failed to load customer summary metrics:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // Fetch paginated customer records from backend
  const fetchCustomers = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      setIsLoading(true);
      const res = await customersApi.list({
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        city: filterCity,
        status: selectedStatus,
        verificationStatus: selectedVerification,
        sortBy,
        sortOrder,
      });

      setCustomers(res.items);
      setTotalRecords(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load customers list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, currentPage, pageSize, debouncedSearch, filterCity, selectedStatus, selectedVerification, sortBy, sortOrder]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchSummary();
  }, [authLoading, user, fetchSummary]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchCustomers();
  }, [authLoading, user, fetchCustomers]);

  // Load orders when opening the orders tab
  useEffect(() => {
    if (viewCustomer && activeTab === 'orders') {
      setIsOrdersLoading(true);
      customersApi
        .getOrders(viewCustomer.id, { page: 1, pageSize: 20 })
        .then((res) => {
          setCustomerOrders(res.items || []);
        })
        .catch((err) => {
          console.error('Failed to load customer orders:', err);
        })
        .finally(() => {
          setIsOrdersLoading(false);
        });
    }
  }, [viewCustomer, activeTab]);

  // Load activity when opening the activity tab
  useEffect(() => {
    if (viewCustomer && activeTab === 'activity') {
      setIsActivityLoading(true);
      customersApi
        .getActivity(viewCustomer.id, { page: 1, pageSize: 25 })
        .then((res) => {
          setCustomerActivity(res.items || []);
        })
        .catch((err) => {
          console.error('Failed to load customer activity:', err);
        })
        .finally(() => {
          setIsActivityLoading(false);
        });
    }
  }, [viewCustomer, activeTab]);

  // Populate edit form when opening edit tab
  useEffect(() => {
    if (viewCustomer) {
      setEditFormData({
        fullName: viewCustomer.fullName || viewCustomer.name || '',
        phone: viewCustomer.phone || '',
        email: viewCustomer.email || '',
        city: viewCustomer.city || 'Gondar',
        deliveryZone: viewCustomer.deliveryZone || '',
        verificationStatus: viewCustomer.verificationStatus || 'PENDING',
      });
      setEditFeedback(null);
    }
  }, [viewCustomer]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = customers.map((c) => c.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(customers.map((c) => c.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));

  // Single customer status toggle
  const promptToggleSuspend = (customer: Customer) => {
    const isSuspending = customer.accountStatus === 'ACTIVE';
    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Suspend Customer Account' : 'Reactivate Customer Account',
      message: isSuspending
        ? `Are you sure you want to suspend ${customer.fullName || customer.name}? The customer will immediately lose access to shopping, login, and active sessions on Ardab Market.`
        : `Reactivate ${customer.fullName || customer.name}'s account? Full marketplace access will be restored.`,
      variant: isSuspending ? 'danger' : 'success',
      confirmLabel: isSuspending ? 'Suspend Account' : 'Reactivate Account',
      affectedCount: 1,
      affectedNames: [`${customer.fullName || customer.name} (${customer.phone})`],
      action: async () => {
        const updated = await customersApi.toggleStatus(customer.id, customer.accountStatus);
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
        if (viewCustomer && viewCustomer.id === customer.id) {
          setViewCustomer(updated);
        }
        fetchSummary();
      },
    });
  };

  // Permanent Customer Deletion
  const promptDeleteCustomer = (customer: Customer) => {
    setConfirmModal({
      isOpen: true,
      title: 'Permanently Delete Customer Account?',
      message: `Are you sure you want to permanently delete ${customer.fullName || customer.name} (${customer.customerCode || customer.phone})? All personal addresses, loyalty score events, activities, and reviews will be permanently removed. Historical order records will be anonymized to protect accounting and legal compliance. This action cannot be undone.`,
      variant: 'danger',
      isIrreversible: true,
      confirmLabel: 'Delete Customer Permanently',
      affectedCount: 1,
      affectedNames: [`${customer.fullName || customer.name} (${customer.customerCode || customer.phone})`],
      action: async () => {
        await customersApi.delete(customer.id);
        // Remove from state
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        if (viewCustomer && viewCustomer.id === customer.id) {
          setViewCustomer(null);
        }
        setSelectedIds((prev) => prev.filter((id) => id !== customer.id));
        fetchSummary();
        // If current page is now empty, decrement page
        fetchCustomers();
      },
    });
  };

  // Bulk status update
  const promptBulkStatus = (newStatus: CustomerAccountStatus) => {
    const count = selectedIds.length;
    const isSuspending = newStatus === 'SUSPENDED';

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Bulk Suspend Customers' : 'Bulk Reactivate Customers',
      message: isSuspending
        ? `You are about to suspend ${count} customer account(s). They will be temporarily prevented from placing orders.`
        : `Reactivate ${count} customer account(s)? Full shopping access will be restored.`,
      variant: isSuspending ? 'danger' : 'success',
      confirmLabel: isSuspending ? 'Suspend Selected' : 'Reactivate Selected',
      affectedCount: count,
      affectedNames: selectedIds,
      action: async () => {
        await customersApi.bulkUpdateStatus(selectedIds, newStatus);
        setCustomers((prev) =>
          prev.map((c) =>
            selectedIds.includes(c.id)
              ? { ...c, accountStatus: newStatus, status: newStatus }
              : c
          )
        );
        setSelectedIds([]);
        fetchSummary();
      },
    });
  };

  const handleConfirmModalAction = async () => {
    try {
      setIsConfirming(true);
      await confirmModal.action();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error('Action failed:', e);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedVerification('ALL');
    setFilterCity('All Cities');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Submit Profile Edit
  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewCustomer) return;

    setEditFeedback(null);
    setIsSavingEdit(true);

    try {
      const updated = await customersApi.update(viewCustomer.id, {
        fullName: editFormData.fullName.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() ? editFormData.email.trim() : undefined,
        city: editFormData.city,
        deliveryZone: editFormData.deliveryZone.trim() ? editFormData.deliveryZone.trim() : undefined,
        verificationStatus: editFormData.verificationStatus as any,
      });

      setViewCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditFeedback({ type: 'success', message: 'Customer profile updated successfully.' });
      fetchSummary();
    } catch (err: any) {
      console.error('Failed to update customer profile:', err);
      setEditFeedback({
        type: 'error',
        message: err?.message || 'Unable to update customer profile. Please try again.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Customer Operations"
        subtitle="Manage customer accounts, delivery addresses, order histories, and system-generated experience metrics"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Customers' }]}
      >
        {/* 1. Dynamic Top Summary Cards */}
        <div className="row g-3 mb-4">
          {/* Total Customers */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card ardab-card-hover h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Total Customers</span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-primary"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(13, 110, 253, 0.1)', fontSize: '1.2rem' }}
                >
                  <i className="bi bi-people-fill"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                {isSummaryLoading ? (
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                ) : (
                  <h3 className="fw-bold mb-0 text-dark">{summary?.totalCustomers ?? 0}</h3>
                )}
              </div>
              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                All registered customer accounts
              </span>
            </div>
          </div>

          {/* Active Customers */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card ardab-card-hover h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Active Customers</span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-success"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(25, 135, 84, 0.1)', fontSize: '1.2rem' }}
                >
                  <i className="bi bi-person-check-fill"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                {isSummaryLoading ? (
                  <div className="spinner-border spinner-border-sm text-success" role="status" />
                ) : (
                  <h3 className="fw-bold mb-0 text-success">{summary?.activeCustomers ?? 0}</h3>
                )}
              </div>
              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Permitted for orders & checkout
              </span>
            </div>
          </div>

          {/* New Customers (Last 30 Days) */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card ardab-card-hover h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">New Customers</span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-info"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(13, 202, 240, 0.1)', fontSize: '1.2rem' }}
                >
                  <i className="bi bi-person-plus-fill"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                {isSummaryLoading ? (
                  <div className="spinner-border spinner-border-sm text-info" role="status" />
                ) : (
                  <h3 className="fw-bold mb-0 text-dark">{summary?.newCustomers ?? 0}</h3>
                )}
              </div>
              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Joined in the last 30 days
              </span>
            </div>
          </div>

          {/* Verified Customers */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card ardab-card-hover h-100 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Verified Customers</span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-teal"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(32, 201, 151, 0.1)', color: '#20c997', fontSize: '1.2rem' }}
                >
                  <i className="bi bi-patch-check-fill"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                {isSummaryLoading ? (
                  <div className="spinner-border spinner-border-sm text-teal" role="status" />
                ) : (
                  <h3 className="fw-bold mb-0 text-dark">{summary?.verifiedCustomers ?? 0}</h3>
                )}
              </div>
              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Completed contact verification
              </span>
            </div>
          </div>
        </div>

        {/* 2. Search & Server Filter Bar */}
        <div className="ardab-card p-3 mb-4 shadow-sm">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5 form-control-sm py-2"
                  placeholder="Search code, name, phone, email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search customers"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y me-2 p-0 text-muted"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    title="Clear search"
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>
            </div>

            {/* City Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm py-2"
                value={filterCity}
                onChange={(e) => {
                  setFilterCity(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by operational city"
              >
                <option value="All Cities">All Cities</option>
                <option value="Gondar">Gondar</option>
                <option value="Bahir Dar">Bahir Dar</option>
                <option value="Addis Ababa">Addis Ababa</option>
              </select>
            </div>

            {/* Account Status Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm py-2"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by account status"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Verification Status Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm py-2"
                value={selectedVerification}
                onChange={(e) => {
                  setSelectedVerification(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by verification status"
              >
                <option value="ALL">All Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Sorting Filter */}
            <div className="col-6 col-md-2 d-flex gap-1">
              <select
                className="form-select form-select-sm py-2 flex-grow-1"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Sort customers"
              >
                <option value="createdAt">Date Joined</option>
                <option value="fullName">Full Name</option>
                <option value="customerCode">Customer Code</option>
                <option value="lastActivityAt">Last Activity</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-light border px-2 py-2"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
              >
                <i className={`bi bi-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Bulk Action Bar */}
        {selectedIds.length > 0 && canSuspend && (
          <div className="alert alert-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 py-2 px-3 shadow-sm rounded-3">
            <div className="d-flex align-items-center gap-2 fw-semibold small">
              <i className="bi bi-check2-square fs-6 text-primary"></i>
              <span>{selectedIds.length} customer(s) selected</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-success px-3 d-flex align-items-center gap-1 shadow-sm"
                onClick={() => promptBulkStatus('ACTIVE')}
              >
                <i className="bi bi-person-check"></i> Bulk Reactivate
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 d-flex align-items-center gap-1 bg-white shadow-sm"
                onClick={() => promptBulkStatus('SUSPENDED')}
              >
                <i className="bi bi-person-x"></i> Bulk Suspend
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

        {/* 4. Desktop Customer Table */}
        <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden shadow-sm">
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
                      aria-label="Select all customers on page"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Experience Score</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : customers.length > 0 ? (
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className={
                        selectedIds.includes(c.id)
                          ? 'table-primary'
                          : c.accountStatus === 'SUSPENDED'
                          ? 'table-danger bg-opacity-10'
                          : ''
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => handleSelectOne(c.id)}
                          aria-label={`Select ${c.fullName || c.name}`}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                            style={{
                              width: 38,
                              height: 38,
                              backgroundColor: 'var(--ardab-teal, #20c997)',
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {(c.fullName || c.name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-1">
                              <span className="fw-bold text-dark">{c.fullName || c.name}</span>
                              <span className="badge bg-light text-secondary border small" style={{ fontSize: '0.65rem' }}>
                                {c.customerCode || 'CUST'}
                              </span>
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              {c.phone} {c.email ? `• ${c.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-dark fw-medium">{c.city}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {c.deliveryZone || 'Standard Zone'}
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">
                          {c.metrics?.totalOrders ?? c.orderCount ?? 0} orders
                        </span>
                        {c.metrics?.completedOrders !== undefined && c.metrics.completedOrders > 0 && (
                          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                            {c.metrics.completedOrders} completed
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="fw-bold text-dark">
                          {formatCurrency(Number(c.metrics?.totalSpent ?? c.totalSpendingEtb ?? 0))}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="badge d-flex align-items-center gap-1 shadow-sm"
                            style={{
                              backgroundColor: 'rgba(13, 110, 253, 0.1)',
                              color: '#0d6efd',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            <i className="bi bi-stars"></i>
                            {c.metrics?.totalScore ?? c.trustScore ?? 0} pts
                          </span>
                          {c.verificationStatus === 'VERIFIED' ? (
                            <i
                              className="bi bi-patch-check-fill text-success"
                              title="Verified Customer"
                              style={{ fontSize: '1rem' }}
                            ></i>
                          ) : c.verificationStatus === 'REJECTED' ? (
                            <i
                              className="bi bi-x-circle-fill text-danger"
                              title="Rejected Verification"
                              style={{ fontSize: '1rem' }}
                            ></i>
                          ) : (
                            <i
                              className="bi bi-hourglass-split text-muted"
                              title="Verification Pending"
                              style={{ fontSize: '1rem' }}
                            ></i>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.accountStatus === 'ACTIVE'
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : c.accountStatus === 'SUSPENDED'
                              ? 'bg-danger-subtle text-danger border border-danger-subtle'
                              : 'bg-secondary-subtle text-secondary border'
                          } rounded-pill px-2 py-1`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {c.accountStatus}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border shadow-sm d-flex align-items-center gap-1"
                            onClick={() => {
                              setViewCustomer(c);
                              setActiveTab('overview');
                            }}
                            title="View Customer Profile"
                          >
                            <i className="bi bi-eye"></i> Details
                          </button>
                          {canSuspend && (
                            <>
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  c.accountStatus === 'ACTIVE'
                                    ? 'btn-outline-warning'
                                    : 'btn-outline-success'
                                } shadow-sm`}
                                onClick={() => promptToggleSuspend(c)}
                                title={c.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                              >
                                {c.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger shadow-sm"
                                onClick={() => promptDeleteCustomer(c)}
                                title="Delete Customer and Cleanse Data"
                              >
                                <i className="bi bi-trash"></i>
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

            {!isLoading && customers.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon="bi-people"
                  title="No customers match your search criteria"
                  description="Try adjusting your search query, city hub, or account status filters."
                  actionLabel="Reset Filters"
                  onAction={handleResetFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. Mobile Responsive Customer Cards (d-lg-none) */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {isLoading ? (
            <div className="ardab-card p-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading customer profiles...
            </div>
          ) : customers.length > 0 ? (
            customers.map((c) => (
              <div
                key={c.id}
                className={`ardab-card p-3 shadow-sm ${
                  selectedIds.includes(c.id)
                    ? 'border-primary'
                    : c.accountStatus === 'SUSPENDED'
                    ? 'border-danger border-2'
                    : ''
                }`}
              >
                {/* Header Row */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => handleSelectOne(c.id)}
                      aria-label={`Select ${c.fullName || c.name}`}
                    />
                    <div>
                      <div className="d-flex align-items-center gap-1">
                        <h3 className="h6 fw-bold text-dark mb-0">{c.fullName || c.name}</h3>
                        <span className="badge bg-light text-secondary border small" style={{ fontSize: '0.65rem' }}>
                          {c.customerCode || 'CUST'}
                        </span>
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {c.phone} &bull; {c.city}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      c.accountStatus === 'ACTIVE'
                        ? 'bg-success-subtle text-success border border-success-subtle'
                        : 'bg-danger-subtle text-danger border border-danger-subtle'
                    } rounded-pill px-2 py-1`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {c.accountStatus}
                  </span>
                </div>

                {/* Location Pill */}
                <div className="p-2 bg-light rounded-3 mb-2 small text-muted text-truncate">
                  <i className="bi bi-geo-alt me-1 text-primary"></i>
                  {c.deliveryZone || 'Standard Zone'} &mdash; {c.city}
                </div>

                {/* System Generated Metrics Bar */}
                <div className="row g-2 text-center mb-3 bg-light bg-opacity-50 p-2 rounded-3">
                  <div className="col-4 border-end">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Orders</span>
                    <strong className="text-dark small">{c.metrics?.totalOrders ?? c.orderCount ?? 0}</strong>
                  </div>
                  <div className="col-4 border-end">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Total Spent</span>
                    <strong className="text-dark small">{formatCurrency(Number(c.metrics?.totalSpent ?? c.totalSpendingEtb ?? 0))}</strong>
                  </div>
                  <div className="col-4">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Score</span>
                    <strong className="text-primary small">{c.metrics?.totalScore ?? c.trustScore ?? 0} pts</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border px-3"
                    onClick={() => {
                      setViewCustomer(c);
                      setActiveTab('overview');
                    }}
                  >
                    <i className="bi bi-eye me-1"></i> Details
                  </button>
                  {canSuspend && (
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        c.accountStatus === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                      }`}
                      onClick={() => promptToggleSuspend(c)}
                    >
                      {c.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon="bi-people"
              title="No customers match your search criteria"
              description="Try adjusting your search terms or resetting filters."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          )}
        </div>

        {/* 6. Server-Side Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          className="mb-4"
        />

        {/* 7. Comprehensive Customer Details Modal with 5 Tabs */}
        {viewCustomer && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                {/* Modal Header */}
                <div className="modal-header border-bottom bg-light px-4 py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                      style={{
                        width: 46,
                        height: 46,
                        backgroundColor: 'var(--ardab-teal, #20c997)',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {(viewCustomer.fullName || viewCustomer.name || 'C').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h5 className="modal-title fw-bold text-dark mb-0">
                          {viewCustomer.fullName || viewCustomer.name}
                        </h5>
                        <span className="badge bg-dark text-white small">
                          {viewCustomer.customerCode || 'CUST'}
                        </span>
                        <span
                          className={`badge ${
                            viewCustomer.accountStatus === 'ACTIVE'
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : 'bg-danger-subtle text-danger border border-danger-subtle'
                          } rounded-pill px-2 py-1`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {viewCustomer.accountStatus}
                        </span>
                      </div>
                      <span className="text-muted small">
                        Member since {formatDate(viewCustomer.createdAt || viewCustomer.registeredAt)} &bull; {viewCustomer.city}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewCustomer(null)}
                    aria-label="Close"
                  ></button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white border-bottom px-4 pt-2">
                  <ul className="nav nav-tabs border-bottom-0 gap-2">
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link border-0 border-bottom border-3 py-2 px-3 fw-semibold ${
                          activeTab === 'overview'
                            ? 'border-primary text-primary active'
                            : 'border-transparent text-muted'
                        }`}
                        onClick={() => setActiveTab('overview')}
                      >
                        <i className="bi bi-person-lines-fill me-1"></i> Overview
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link border-0 border-bottom border-3 py-2 px-3 fw-semibold ${
                          activeTab === 'orders'
                            ? 'border-primary text-primary active'
                            : 'border-transparent text-muted'
                        }`}
                        onClick={() => setActiveTab('orders')}
                      >
                        <i className="bi bi-box-seam me-1"></i> Orders
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link border-0 border-bottom border-3 py-2 px-3 fw-semibold ${
                          activeTab === 'addresses'
                            ? 'border-primary text-primary active'
                            : 'border-transparent text-muted'
                        }`}
                        onClick={() => setActiveTab('addresses')}
                      >
                        <i className="bi bi-geo-alt me-1"></i> Addresses
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link border-0 border-bottom border-3 py-2 px-3 fw-semibold ${
                          activeTab === 'activity'
                            ? 'border-primary text-primary active'
                            : 'border-transparent text-muted'
                        }`}
                        onClick={() => setActiveTab('activity')}
                      >
                        <i className="bi bi-clock-history me-1"></i> Activity
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link border-0 border-bottom border-3 py-2 px-3 fw-semibold ${
                          activeTab === 'edit'
                            ? 'border-primary text-primary active'
                            : 'border-transparent text-muted'
                        }`}
                        onClick={() => setActiveTab('edit')}
                      >
                        <i className="bi bi-pencil-square me-1"></i> Edit Profile
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Modal Body with Tab Contents */}
                <div className="modal-body p-4">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div>
                      {/* Read-Only System Experience Notice */}
                      <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4 rounded-3">
                        <i className="bi bi-shield-check fs-5 text-info"></i>
                        <span>
                          <strong>Authoritative Metrics:</strong> Total Orders, Total Spent, and Total Score are
                          system-derived from real database activity and cannot be manually altered.
                        </span>
                      </div>

                      {/* 3 Prominent System Metric Cards */}
                      <div className="row g-3 mb-4">
                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 text-center border h-100">
                            <span className="text-muted small d-block mb-1">Total Orders</span>
                            <h4 className="fw-bold text-dark mb-0">
                              {viewCustomer.metrics?.totalOrders ?? viewCustomer.orderCount ?? 0}
                            </h4>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {viewCustomer.metrics?.completedOrders ?? 0} completed &bull;{' '}
                              {viewCustomer.metrics?.cancelledOrders ?? 0} cancelled
                            </span>
                          </div>
                        </div>

                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 text-center border h-100">
                            <span className="text-muted small d-block mb-1">Total Spent (ETB)</span>
                            <h4 className="fw-bold text-success mb-0">
                              {formatCurrency(Number(viewCustomer.metrics?.totalSpent ?? viewCustomer.totalSpendingEtb ?? 0))}
                            </h4>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Authoritative settled purchases
                            </span>
                          </div>
                        </div>

                        <div className="col-12 col-md-4">
                          <div className="p-3 bg-light rounded-3 text-center border h-100">
                            <span className="text-muted small d-block mb-1">Experience Score</span>
                            <h4 className="fw-bold text-primary mb-0">
                              {viewCustomer.metrics?.totalScore ?? viewCustomer.trustScore ?? 0} pts
                            </h4>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Loyalty & engagement points
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact & Location Details */}
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="text-muted small d-block">Phone Number</label>
                          <strong className="text-dark">{viewCustomer.phone}</strong>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted small d-block">Email Address</label>
                          <strong className="text-dark">{viewCustomer.email || 'Not provided'}</strong>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted small d-block">Operating City</label>
                          <strong className="text-dark">{viewCustomer.city}</strong>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted small d-block">Delivery Zone</label>
                          <strong className="text-dark">{viewCustomer.deliveryZone || 'Standard Zone'}</strong>
                        </div>
                        <div className="col-12">
                          <label className="text-muted small d-block">Primary Delivery Address</label>
                          <strong className="text-dark">
                            {viewCustomer.address ||
                              (viewCustomer.addresses && viewCustomer.addresses[0]?.addressLine) ||
                              'No saved address on file'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ORDERS */}
                  {activeTab === 'orders' && (
                    <div>
                      {isOrdersLoading ? (
                        <div className="text-center py-5 text-muted">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                          Loading orders...
                        </div>
                      ) : customerOrders.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0">
                            <thead>
                              <tr className="table-light">
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th className="text-end">Total (ETB)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customerOrders.map((o: any) => (
                                <tr key={o.id}>
                                  <td className="fw-semibold text-primary">{o.orderNumber || o.id}</td>
                                  <td className="small text-muted">{formatDate(o.createdAt)}</td>
                                  <td>
                                    <span className="badge bg-light text-dark border small">{o.status}</span>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        o.paymentStatus === 'PAID' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
                                      } small`}
                                    >
                                      {o.paymentStatus || 'PENDING'}
                                    </span>
                                  </td>
                                  <td className="text-end fw-bold">{formatCurrency(o.totalAmount || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <EmptyState
                          icon="bi-box-seam"
                          title="No orders placed yet"
                          description="This customer has not placed any orders on the Ardab Market platform."
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 3: ADDRESSES */}
                  {activeTab === 'addresses' && (
                    <div>
                      {viewCustomer.addresses && viewCustomer.addresses.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {viewCustomer.addresses.map((addr) => (
                            <div key={addr.id} className="p-3 border rounded-3 bg-light position-relative">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center gap-2">
                                  <strong className="text-dark">{addr.label}</strong>
                                  {addr.isDefault && (
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <span className="small text-muted">{addr.phone}</span>
                              </div>
                              <div className="text-dark small mb-1">{addr.addressLine}</div>
                              <div className="text-muted small">
                                {addr.city} {addr.deliveryZone ? `&bull; ${addr.deliveryZone}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon="bi-geo-alt"
                          title="No saved delivery addresses"
                          description="Customer has not added any delivery destinations yet."
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 4: ACTIVITY TIMELINE */}
                  {activeTab === 'activity' && (
                    <div>
                      {isActivityLoading ? (
                        <div className="text-center py-5 text-muted">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                          Loading activity trail...
                        </div>
                      ) : customerActivity.length > 0 ? (
                        <div className="timeline-wrapper ps-2">
                          {customerActivity.map((act, index) => (
                            <div key={act.id || index} className="d-flex gap-3 mb-3 position-relative">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center bg-light border text-primary"
                                style={{ width: 32, height: 32, flexShrink: 0, zIndex: 2 }}
                              >
                                <i className="bi bi-clock"></i>
                              </div>
                              <div className="p-2 border rounded-3 bg-light bg-opacity-50 flex-grow-1">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <strong className="small text-dark">{act.action}</strong>
                                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {formatDate(act.createdAt)}
                                  </span>
                                </div>
                                <p className="text-muted small mb-0">{act.description}</p>
                                <span className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                  Actor: {act.actor}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon="bi-clock-history"
                          title="No activity recorded"
                          description="There are no recent platform activity events for this customer."
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 5: EDIT PROFILE */}
                  {activeTab === 'edit' && (
                    <form onSubmit={handleSaveProfileEdit}>
                      {editFeedback && (
                        <div
                          className={`alert ${
                            editFeedback.type === 'success' ? 'alert-success' : 'alert-danger'
                          } py-2 px-3 small mb-3`}
                        >
                          {editFeedback.message}
                        </div>
                      )}

                      {/* Non-Editable Protected Metrics Banner */}
                      <div className="alert alert-secondary py-2 px-3 small mb-3">
                        <i className="bi bi-lock-fill me-1"></i>
                        <strong>Protected Metrics:</strong> Total Orders, Lifetime Spend, and Experience Score
                        are calculated automatically from system activity and are intentionally locked from manual editing.
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Full Name *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editFormData.fullName}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, fullName: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Phone Number *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editFormData.phone}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, phone: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Email Address</label>
                          <input
                            type="email"
                            className="form-control form-control-sm"
                            value={editFormData.email}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, email: e.target.value })
                            }
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Operating City *</label>
                          <select
                            className="form-select form-select-sm"
                            value={editFormData.city}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, city: e.target.value })
                            }
                            required
                          >
                            <option value="Gondar">Gondar</option>
                            <option value="Bahir Dar">Bahir Dar</option>
                            <option value="Addis Ababa">Addis Ababa</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Delivery Zone</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editFormData.deliveryZone}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, deliveryZone: e.target.value })
                            }
                            placeholder="e.g. Arada Central, Bole Commercial Hub"
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Verification Status</label>
                          <select
                            className="form-select form-select-sm"
                            value={editFormData.verificationStatus}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, verificationStatus: e.target.value })
                            }
                          >
                            <option value="PENDING">Pending Verification</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>

                        <div className="col-12 text-end pt-3 border-top">
                          <button
                            type="submit"
                            className="btn btn-sm btn-primary px-4 shadow-sm"
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-top bg-light px-4 py-2 d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    {canSuspend && (
                      <>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            viewCustomer.accountStatus === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          onClick={() => promptToggleSuspend(viewCustomer)}
                        >
                          {viewCustomer.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => promptDeleteCustomer(viewCustomer)}
                        >
                          <i className="bi bi-trash me-1"></i> Delete Customer
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setViewCustomer(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Confirmation Modal */}
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
