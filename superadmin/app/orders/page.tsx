'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/lib/api';
import { Order, OrderStatus, OrderSummaryMetrics, OrderTimelineEvent } from '@/types/order';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { STANDARD_FLEET_CAPACITY_KG, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

const ORDER_STATUS_TABS: { label: string; value: OrderStatus | 'ALL'; countKey?: keyof OrderSummaryMetrics }[] = [
  { label: 'All Orders', value: 'ALL', countKey: 'totalOrders' },
  { label: 'Incoming Queue (Pending)', value: 'PENDING', countKey: 'pendingOrders' },
  { label: 'Confirmed', value: 'CONFIRMED', countKey: 'confirmedOrders' },
  { label: 'Processing', value: 'PROCESSING', countKey: 'processingOrders' },
  { label: 'Ready for Delivery', value: 'READY_FOR_DELIVERY', countKey: 'readyOrders' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled / Rejected', value: 'CANCELLED' },
];

export default function OrdersPage() {
  const { user, isLoading: authLoading, selectedCity } = useAuth();

  // Orders and Pagination state
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter and Search states
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('placedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Summary Metrics
  const [summary, setSummary] = useState<OrderSummaryMetrics>({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    todayOrders: 0,
    confirmedOrders: 0,
    readyOrders: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected Order for Detail Modal & Activities
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderActivities, setOrderActivities] = useState<OrderTimelineEvent[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Reason Modal for Cancel / Reject
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    orderId: string;
    actionType: 'CANCEL' | 'REJECT';
    orderNumber: string;
    customerName: string;
  }>({
    isOpen: false,
    orderId: '',
    actionType: 'CANCEL',
    orderNumber: '',
    customerName: '',
  });
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  // Confirmation modal state for bulk or generic transitions
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

  const canManage = hasPermission(user?.role, 'orders:manage');
  const canUpdateStatus = hasPermission(user?.role, 'orders:update_status');
  const canCancel = hasPermission(user?.role, 'orders:cancel');

  // Load dynamic summary metrics
  const loadSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const data = await ordersApi.getSummary(selectedCity);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load order summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [selectedCity]);

  // Load paginated orders with server-side filters
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await ordersApi.list({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
        city: selectedCity,
        status: activeTab === 'ALL' ? undefined : activeTab,
        paymentStatus: paymentFilter === 'ALL' ? undefined : paymentFilter,
        sortBy,
        sortOrder,
      });
      setOrders(res.items);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || res.items.length,
        totalPages: res.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, selectedCity, activeTab, paymentFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (authLoading) return;
    loadSummary();
  }, [authLoading, loadSummary]);

  useEffect(() => {
    if (authLoading) return;
    loadOrders();
  }, [authLoading, loadOrders]);

  // Load activities whenever an order is selected
  useEffect(() => {
    if (!selectedOrder) {
      setOrderActivities([]);
      return;
    }
    let isMounted = true;
    setIsLoadingActivities(true);
    ordersApi
      .getActivity(selectedOrder.id)
      .then((acts) => {
        if (isMounted) setOrderActivities(acts);
      })
      .catch((err) => {
        console.error('Failed to load order activities:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingActivities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrder]);

  // Select all / one handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = orders.map((o) => o.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(orders.map((o) => o.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));

  // Order status update logic
  const executeUpdateStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    try {
      setActionErrorMessage(null);
      const updated = await ordersApi.updateStatus(orderId, newStatus, reason);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      loadSummary();
      setActionSuccessMessage(`Order ${updated.orderNumber || orderId} transitioned to ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update order status');
      setTimeout(() => setActionErrorMessage(null), 5000);
    }
  };

  // Open reason modal for destructive actions
  const openReasonModal = (order: Order, actionType: 'CANCEL' | 'REJECT') => {
    setReasonModal({
      isOpen: true,
      orderId: order.id,
      actionType,
      orderNumber: order.orderNumber || order.id,
      customerName: order.customerName,
    });
    setActionReason('');
  };

  const handleSubmitReasonModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason.trim()) return;

    try {
      setIsSubmittingReason(true);
      if (reasonModal.actionType === 'REJECT') {
        await ordersApi.reject(reasonModal.orderId, actionReason.trim());
        setActionSuccessMessage(`Order ${reasonModal.orderNumber} successfully rejected.`);
      } else {
        await ordersApi.cancel(reasonModal.orderId, actionReason.trim());
        setActionSuccessMessage(`Order ${reasonModal.orderNumber} successfully cancelled.`);
      }

      setReasonModal((prev) => ({ ...prev, isOpen: false }));
      loadOrders();
      loadSummary();
      if (selectedOrder && selectedOrder.id === reasonModal.orderId) {
        const refreshed = await ordersApi.getById(reasonModal.orderId);
        setSelectedOrder(refreshed);
      }
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Action failed.');
      setTimeout(() => setActionErrorMessage(null), 5000);
    } finally {
      setIsSubmittingReason(false);
    }
  };

  // Bulk status update prompt
  const promptBulkStatus = (newStatus: OrderStatus) => {
    const count = selectedIds.length;
    const isCancel = newStatus === 'CANCELLED';

    setConfirmModal({
      isOpen: true,
      title: `Bulk Update: ${newStatus.replace('_', ' ')}`,
      message: isCancel
        ? `You are about to cancel ${count} selected order(s). Inventory consignment reservations will be released in ${selectedCity}.`
        : `Transition ${count} selected order(s) to status "${newStatus.replace('_', ' ')}"?`,
      variant: isCancel ? 'danger' : 'primary',
      confirmLabel: isCancel ? 'Cancel Selected Orders' : 'Apply Bulk Status',
      isIrreversible: isCancel,
      affectedCount: count,
      affectedNames: selectedIds,
      action: async () => {
        try {
          const updatedCount = await ordersApi.bulkUpdateStatus(selectedIds, newStatus);
          setSelectedIds([]);
          loadOrders();
          loadSummary();
          setActionSuccessMessage(`Successfully updated ${updatedCount} orders to ${newStatus.replace('_', ' ')}.`);
          setTimeout(() => setActionSuccessMessage(null), 4000);
        } catch (err: any) {
          setActionErrorMessage(err.message || 'Bulk transition failed.');
          setTimeout(() => setActionErrorMessage(null), 5000);
        }
      },
    });
  };

  const handleConfirmModalAction = async () => {
    try {
      setIsConfirming(true);
      await confirmModal.action();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (e: any) {
      console.error(e);
      setActionErrorMessage(e.message || 'Action failed');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveTab('ALL');
    setPaymentFilter('ALL');
    setSortBy('placedAt');
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const pendingIncomingCount = summary.pendingOrders;

  return (
    <AdminLayout>
      <PageContainer
        title="Incoming Orders & Operational Dispatch"
        subtitle="Manage and process customer orders placed via mobile application across delivery hubs"
        breadcrumbs={[{ label: 'Core Operations' }, { label: 'Incoming Orders' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-sm">
              <i className="bi bi-bell-fill"></i>
              <span>{pendingIncomingCount} Incoming Awaiting Action</span>
            </span>
          </div>
        }
      >
        {/* Flash action messages */}
        {actionSuccessMessage && (
          <div
            className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionSuccessMessage}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setActionSuccessMessage(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {actionErrorMessage && (
          <div
            className="alert alert-danger alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
              <span className="fw-medium">{actionErrorMessage}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setActionErrorMessage(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* 4 Top Dynamic Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-3 h-100 shadow-sm border-0 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Total Orders</span>
                {isSummaryLoading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-8 fs-4"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold text-dark mb-0">{summary.totalOrders.toLocaleString()}</h3>
                )}
                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                  {selectedCity} operational hub
                </span>
              </div>
              <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary fs-4">
                <i className="bi bi-receipt"></i>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className={`ardab-card p-3 h-100 shadow-sm border-0 d-flex align-items-center justify-content-between ${
                summary.pendingOrders > 0 ? 'bg-danger bg-opacity-10 border border-danger' : ''
              }`}
            >
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="text-muted small fw-semibold text-uppercase">Pending Orders</span>
                  {summary.pendingOrders > 0 && (
                    <span className="badge bg-danger rounded-pill px-2" style={{ fontSize: '0.65rem' }}>
                      URGENT
                    </span>
                  )}
                </div>
                {isSummaryLoading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-8 fs-4"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold text-danger mb-0">{summary.pendingOrders.toLocaleString()}</h3>
                )}
                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                  Awaiting Super Admin review
                </span>
              </div>
              <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger fs-4">
                <i className="bi bi-hourglass-split"></i>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-3 h-100 shadow-sm border-0 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Processing Orders</span>
                {isSummaryLoading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-8 fs-4"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold text-primary mb-0">{summary.processingOrders.toLocaleString()}</h3>
                )}
                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                  Being packed at warehouses
                </span>
              </div>
              <div className="p-3 rounded-circle bg-info bg-opacity-10 text-info fs-4">
                <i className="bi bi-box-seam"></i>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-3 h-100 shadow-sm border-0 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Today&apos;s Orders</span>
                {isSummaryLoading ? (
                  <div className="placeholder-glow">
                    <span className="placeholder col-8 fs-4"></span>
                  </div>
                ) : (
                  <h3 className="fw-bold text-success mb-0">{summary.todayOrders.toLocaleString()}</h3>
                )}
                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                  Placed in the last 24h
                </span>
              </div>
              <div className="p-3 rounded-circle bg-success bg-opacity-10 text-success fs-4">
                <i className="bi bi-calendar-check"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Attention Banner */}
        {pendingIncomingCount > 0 && activeTab !== 'PENDING' && (
          <div
            className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
              borderLeft: '5px solid #d97706',
            }}
          >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="d-flex align-items-start gap-3">
                <div className="p-2 rounded-circle bg-warning bg-opacity-25 text-warning-emphasis fs-4">
                  <i className="bi bi-inbox-fill"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">
                    {pendingIncomingCount} Incoming Customer Order
                    {pendingIncomingCount > 1 ? 's' : ''} Require Super Admin Review
                  </h6>
                  <p className="text-muted small mb-0">
                    New consumer orders placed via mobile application need confirmation before consignment staging and seller stock release.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-warning fw-semibold px-4 text-nowrap align-self-start align-self-md-center shadow-sm"
                onClick={() => {
                  setActiveTab('PENDING');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Review Incoming Queue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Status Filter Tabs (Scrollable on mobile) */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            {ORDER_STATUS_TABS.map((tab) => {
              const isPendingTab = tab.value === 'PENDING';
              const badgeCount = tab.countKey ? summary[tab.countKey] : null;

              return (
                <button
                  key={tab.value}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 position-relative ${
                    activeTab === tab.value
                      ? 'btn-ardab-primary shadow-sm'
                      : 'btn-outline-secondary bg-white border'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  {tab.label}
                  {badgeCount !== null && badgeCount > 0 && (
                    <span
                      className={`ms-2 badge rounded-pill ${
                        isPendingTab ? 'bg-danger' : 'bg-secondary bg-opacity-50'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar & Advanced Filters */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6 col-lg-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by Order #, customer name, code, phone, product..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  aria-label="Search orders"
                />
              </div>
            </div>

            <div className="col-6 col-md-3 col-lg-2">
              <select
                className="form-select form-select-sm"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Filter by payment status"
              >
                <option value="ALL">Payment: All</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div className="col-6 col-md-3 col-lg-2">
              <select
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Sort orders"
              >
                <option value="placedAt">Date (Newest)</option>
                <option value="totalAmount">Total (Highest)</option>
                <option value="totalWeight">Weight (Heaviest)</option>
                <option value="orderNumber">Order #</option>
              </select>
            </div>

            <div className="col-12 col-lg-3 text-lg-end d-flex align-items-center justify-content-between justify-content-lg-end gap-2">
              <span className="text-muted small">
                Showing <strong className="text-dark">{orders.length}</strong> of{' '}
                <strong className="text-dark">{pagination.total}</strong> orders
              </span>
              {(searchTerm || paymentFilter !== 'ALL' || activeTab !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                  onClick={handleResetFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && canManage && (
          <div className="alert alert-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 py-2 px-3 shadow-sm rounded-3">
            <div className="d-flex align-items-center gap-2 fw-semibold small">
              <i className="bi bi-check2-square fs-6 text-primary"></i>
              <span>{selectedIds.length} order(s) selected</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-success px-3 d-flex align-items-center gap-1"
                onClick={() => promptBulkStatus('CONFIRMED')}
              >
                <i className="bi bi-check2-circle"></i> Bulk Confirm
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary px-3 d-flex align-items-center gap-1"
                onClick={() => promptBulkStatus('PROCESSING')}
              >
                <i className="bi bi-box-seam"></i> Bulk Process
              </button>
              <button
                type="button"
                className="btn btn-sm btn-info text-white px-3 d-flex align-items-center gap-1"
                onClick={() => promptBulkStatus('READY_FOR_DELIVERY')}
              >
                <i className="bi bi-truck"></i> Bulk Stage Delivery
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 d-flex align-items-center gap-1 bg-white"
                onClick={() => promptBulkStatus('CANCELLED')}
              >
                <i className="bi bi-x-circle"></i> Bulk Cancel
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

        {/* Desktop Orders Table */}
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
                      aria-label="Select all on current page"
                    />
                  </th>
                  <th>Order Number</th>
                  <th>Customer & Destination</th>
                  <th>Products & Sellers</th>
                  <th>Total & Weight</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : orders.length > 0 ? (
                <tbody>
                  {orders.map((order) => {
                    const isPending = order.orderStatus === 'PENDING';
                    const isConfirmed = order.orderStatus === 'CONFIRMED';
                    const isProcessing = order.orderStatus === 'PROCESSING';

                    return (
                      <tr
                        key={order.id}
                        className={
                          selectedIds.includes(order.id)
                            ? 'table-primary'
                            : isPending
                            ? 'table-warning bg-opacity-10'
                            : ''
                        }
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(order.id)}
                            onChange={() => handleSelectOne(order.id)}
                            aria-label={`Select order ${order.orderNumber || order.id}`}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-success font-monospace">{order.orderNumber || order.id}</span>
                            {isPending && (
                              <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                            {new Date(order.placedAt || order.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">
                            {order.customerName}
                            {order.customerCode && (
                              <span className="badge bg-light text-muted border ms-1 font-monospace" style={{ fontSize: '0.65rem' }}>
                                {order.customerCode}
                              </span>
                            )}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-geo-alt me-1 text-danger"></i>
                            {order.city} &bull; {order.deliveryZone}
                          </div>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">
                            {order.items.map((it) => it.productName).join(', ').slice(0, 38)}
                            {order.items.map((it) => it.productName).join(', ').length > 38 ? '...' : ''}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                            <i className="bi bi-shop me-1 text-primary"></i>
                            {order.items[0]?.sellerName || 'Direct Ardab Hub'}
                            {order.items.length > 1 && ` (+${order.items.length - 1} more)`}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{formatCurrency(order.totalEtb)}</div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            <span className="badge badge-neutral-soft">{formatWeight(order.totalWeightKg)}</span> &bull;{' '}
                            {order.items.length} item(s)
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                              {order.paymentMethod}
                            </span>
                            {order.paymentStatus === 'PAID' ? (
                              <i className="bi bi-check-circle-fill text-success" title="Payment Confirmed"></i>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning border border-warning-subtle" style={{ fontSize: '0.65rem' }}>
                                {order.paymentStatus}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`ardab-badge ${
                              order.orderStatus === 'DELIVERED'
                                ? 'badge-success-soft'
                                : order.orderStatus === 'IN_TRANSIT'
                                ? 'badge-info-soft'
                                : order.orderStatus === 'PROCESSING' || order.orderStatus === 'CONFIRMED'
                                ? 'badge-warning-soft'
                                : order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED'
                                ? 'badge-danger-soft'
                                : 'badge-neutral-soft'
                            }`}
                          >
                            {order.orderStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {canUpdateStatus && isPending && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success fw-semibold shadow-sm"
                                  title="Confirm and approve incoming order"
                                  onClick={() => executeUpdateStatus(order.id, 'CONFIRMED')}
                                >
                                  <i className="bi bi-check2-circle me-1"></i> Confirm
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger shadow-sm"
                                  title="Reject order"
                                  onClick={() => openReasonModal(order, 'REJECT')}
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              </>
                            )}
                            {canUpdateStatus && isConfirmed && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary fw-semibold shadow-sm"
                                title="Move to warehouse processing"
                                onClick={() => executeUpdateStatus(order.id, 'PROCESSING')}
                              >
                                <i className="bi bi-box-seam me-1"></i> Process
                              </button>
                            )}
                            {canUpdateStatus && isProcessing && (
                              <button
                                type="button"
                                className="btn btn-sm btn-info text-white fw-semibold shadow-sm"
                                title="Mark ready for trip dispatch"
                                onClick={() => executeUpdateStatus(order.id, 'READY_FOR_DELIVERY')}
                              >
                                <i className="bi bi-truck me-1"></i> Stage Delivery
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-light border shadow-sm"
                              title="Inspect full order, sellers, and timeline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <i className="bi bi-eye"></i> Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>

            {!isLoading && orders.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon="bi-inbox"
                  title="No orders found matching your criteria"
                  description="Try adjusting your search query, switching status tabs, or clearing your filters."
                  actionLabel="Reset Filters"
                  onAction={handleResetFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Responsive Orders Cards (d-lg-none) */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {isLoading ? (
            <div className="ardab-card p-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading incoming orders...
            </div>
          ) : orders.length > 0 ? (
            orders.map((order) => {
              const isPending = order.orderStatus === 'PENDING';
              return (
                <div
                  key={order.id}
                  className={`ardab-card p-3 shadow-sm ${
                    selectedIds.includes(order.id)
                      ? 'border-primary'
                      : isPending
                      ? 'border-warning border-2'
                      : ''
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => handleSelectOne(order.id)}
                        aria-label={`Select order ${order.orderNumber || order.id}`}
                      />
                      <span className="fw-bold text-success font-monospace">{order.orderNumber || order.id}</span>
                      {isPending && <span className="badge bg-danger">NEW</span>}
                    </div>
                    <span
                      className={`ardab-badge ${
                        order.orderStatus === 'DELIVERED'
                          ? 'badge-success-soft'
                          : order.orderStatus === 'IN_TRANSIT'
                          ? 'badge-info-soft'
                          : order.orderStatus === 'PROCESSING' || order.orderStatus === 'CONFIRMED'
                          ? 'badge-warning-soft'
                          : order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED'
                          ? 'badge-danger-soft'
                          : 'badge-neutral-soft'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="fw-semibold text-dark">
                      {order.customerName}
                      {order.customerCode && (
                        <span className="badge bg-light text-muted border ms-1 font-monospace" style={{ fontSize: '0.65rem' }}>
                          {order.customerCode}
                        </span>
                      )}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-geo-alt me-1 text-danger"></i>
                      {order.city} &bull; {order.deliveryZone}
                    </div>
                  </div>

                  {/* Items Summary & Seller */}
                  <div className="p-2 bg-light rounded-2 small mb-2">
                    <div className="text-dark fw-medium">
                      {order.items.map((it) => it.productName).join(', ')}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      Seller: {order.items[0]?.sellerName || 'Direct Hub'}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top mb-3">
                    <div>
                      <div className="fw-bold text-dark fs-6">{formatCurrency(order.totalEtb)}</div>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        {order.paymentMethod} &bull; {order.paymentStatus}
                      </span>
                    </div>
                    <span className="badge badge-neutral-soft">{formatWeight(order.totalWeightKg)}</span>
                  </div>

                  <div className="d-flex align-items-center gap-2 pt-2 border-top">
                    {canUpdateStatus && isPending && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-semibold flex-grow-1"
                        onClick={() => executeUpdateStatus(order.id, 'CONFIRMED')}
                      >
                        <i className="bi bi-check2-circle me-1"></i> Confirm
                      </button>
                    )}
                    {canUpdateStatus && order.orderStatus === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary fw-semibold flex-grow-1"
                        onClick={() => executeUpdateStatus(order.id, 'PROCESSING')}
                      >
                        <i className="bi bi-box-seam me-1"></i> Process
                      </button>
                    )}
                    {canUpdateStatus && order.orderStatus === 'PROCESSING' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-info text-white fw-semibold flex-grow-1"
                        onClick={() => executeUpdateStatus(order.id, 'READY_FOR_DELIVERY')}
                      >
                        <i className="bi bi-truck me-1"></i> Ready
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-light border flex-grow-1"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon="bi-inbox"
              title="No orders found matching your criteria"
              description="Try adjusting your search query, switching status tabs, or clearing your filters."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          )}
        </div>

        {/* Server-Side Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalRecords={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPagination((prev) => ({ ...prev, pageSize, page: 1 }))}
          className="mb-4"
        />

        {/* Modal: Order Details & Historical Snapshots */}
        {selectedOrder && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom py-3">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="modal-title fw-bold text-dark mb-0 font-monospace">
                        Order {selectedOrder.orderNumber || selectedOrder.id}
                      </h5>
                      <span
                        className={`ardab-badge ${
                          selectedOrder.orderStatus === 'DELIVERED'
                            ? 'badge-success-soft'
                            : selectedOrder.orderStatus === 'IN_TRANSIT'
                            ? 'badge-info-soft'
                            : selectedOrder.orderStatus === 'PENDING'
                            ? 'badge-danger-soft'
                            : selectedOrder.orderStatus === 'CANCELLED' || selectedOrder.orderStatus === 'REJECTED'
                            ? 'badge-danger-soft'
                            : 'badge-warning-soft'
                        }`}
                      >
                        {selectedOrder.orderStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-muted small">
                      {selectedOrder.city} Hub &bull; Placed on{' '}
                      {new Date(selectedOrder.placedAt || selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {/* Super Admin Control Quick Actions */}
                  {canManage && (
                    <div className="p-3 mb-4 rounded-3 border bg-light-subtle d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div>
                        <span className="small text-muted d-block">Order Operational Stage</span>
                        <strong className="text-dark">
                          Current Stage: {selectedOrder.orderStatus.replace('_', ' ')}
                        </strong>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {canUpdateStatus && selectedOrder.orderStatus === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success fw-semibold shadow-sm"
                              onClick={() => executeUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                            >
                              <i className="bi bi-check-circle me-1"></i> Confirm Incoming Order
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger shadow-sm"
                              onClick={() => openReasonModal(selectedOrder, 'REJECT')}
                            >
                              <i className="bi bi-x-circle me-1"></i> Reject Order
                            </button>
                          </>
                        )}
                        {canUpdateStatus && selectedOrder.orderStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary fw-semibold shadow-sm"
                            onClick={() => executeUpdateStatus(selectedOrder.id, 'PROCESSING')}
                          >
                            <i className="bi bi-box-seam me-1"></i> Send to Hub Processing
                          </button>
                        )}
                        {canUpdateStatus && selectedOrder.orderStatus === 'PROCESSING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-info text-white fw-semibold shadow-sm"
                            onClick={() => executeUpdateStatus(selectedOrder.id, 'READY_FOR_DELIVERY')}
                          >
                            <i className="bi bi-truck me-1"></i> Stage for Fleet Delivery
                          </button>
                        )}
                        {canCancel &&
                          selectedOrder.orderStatus !== 'DELIVERED' &&
                          selectedOrder.orderStatus !== 'CANCELLED' &&
                          selectedOrder.orderStatus !== 'REJECTED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openReasonModal(selectedOrder, 'CANCEL')}
                            >
                              <i className="bi bi-slash-circle me-1"></i> Cancel Order
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Customer, Payment, Weight & Destination Details */}
                  <div className="row g-3 p-3 bg-light rounded-3 border mb-4">
                    <div className="col-12 col-md-6">
                      <span className="text-muted small">Customer Profile</span>
                      <div className="fw-bold text-dark">{selectedOrder.customerName}</div>
                      <div className="text-muted small">
                        Phone: {selectedOrder.customerPhone}
                        {selectedOrder.customerCode && ` • Code: ${selectedOrder.customerCode}`}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small">Preserved Delivery Destination</span>
                      <div className="fw-semibold text-dark">
                        {selectedOrder.deliveryAddressSnapshot?.recipientName || selectedOrder.customerName} &bull;{' '}
                        {selectedOrder.deliveryAddressSnapshot?.phone || selectedOrder.customerPhone}
                      </div>
                      <div className="text-muted small">
                        {selectedOrder.deliveryAddressSnapshot?.addressLine || selectedOrder.deliveryAddress},{' '}
                        {selectedOrder.deliveryAddressSnapshot?.deliveryZone || selectedOrder.deliveryZone},{' '}
                        {selectedOrder.city}
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Payment Method</span>
                      <div className="fw-bold text-dark">{selectedOrder.paymentMethod}</div>
                      <span className="badge badge-success-soft">{selectedOrder.paymentStatus}</span>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Consignment Weight</span>
                      <div className="fw-bold text-dark fs-6">{formatWeight(selectedOrder.totalWeightKg)}</div>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        Max Fleet Capacity: {formatWeight(STANDARD_FLEET_CAPACITY_KG)}
                      </span>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Assigned Fleet Trip</span>
                      <div className="fw-bold text-dark">
                        {selectedOrder.assignedTripId || 'Awaiting Staging'}
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Assigned Driver</span>
                      <div className="fw-semibold text-dark">
                        {selectedOrder.assignedDriverName || 'Pending dispatch'}
                      </div>
                    </div>
                  </div>

                  {/* Customer Note if available */}
                  {selectedOrder.customerNote && (
                    <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded-3 mb-4">
                      <span className="fw-bold text-warning-emphasis small d-block mb-1">
                        <i className="bi bi-chat-left-text me-1"></i> Customer Note:
                      </span>
                      <p className="mb-0 text-dark small">{selectedOrder.customerNote}</p>
                    </div>
                  )}

                  {/* Historical Order Items Table with Snapshots */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-dark mb-2">
                      <i className="bi bi-bag-check me-2 text-success"></i>
                      Preserved Order Items (Historical Snapshot)
                    </h6>
                    <div className="border rounded-3 overflow-hidden">
                      <table className="table table-sm table-borderless mb-0">
                        <thead className="bg-light border-bottom">
                          <tr>
                            <th className="p-2 ps-3">Product Name</th>
                            <th className="p-2">Item Code</th>
                            <th className="p-2">Seller / Supplier</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-center">Weight</th>
                            <th className="p-2 text-end">Price</th>
                            <th className="p-2 text-end pe-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={item.id || idx} className="border-bottom">
                              <td className="p-2 ps-3 fw-semibold text-dark">{item.productName}</td>
                              <td className="p-2 font-monospace small text-muted">{item.itemCode || '-'}</td>
                              <td className="p-2">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                  <i className="bi bi-shop me-1"></i>
                                  {item.sellerName || 'Direct Ardab Hub'}
                                </span>
                              </td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-center">{formatWeight(item.unitWeightKg * item.quantity)}</td>
                              <td className="p-2 text-end">{formatCurrency(item.unitPriceEtb)}</td>
                              <td className="p-2 text-end pe-3 fw-bold">
                                {formatCurrency(item.totalPriceEtb)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-light">
                          <tr>
                            <td colSpan={6} className="p-2 text-end fw-semibold">
                              Subtotal:
                            </td>
                            <td className="p-2 text-end pe-3">{formatCurrency(selectedOrder.subtotalEtb)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="p-2 text-end fw-semibold">
                              Delivery Fee:
                            </td>
                            <td className="p-2 text-end pe-3">{formatCurrency(selectedOrder.deliveryFeeEtb)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="p-2 text-end fw-bold text-dark fs-6">
                              Grand Total:
                            </td>
                            <td className="p-2 text-end pe-3 fw-bold text-success fs-6">
                              {formatCurrency(selectedOrder.totalEtb)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Lifecycle Event Timeline */}
                  <div>
                    <h6 className="fw-bold text-dark mb-3">Lifecycle Event Timeline</h6>
                    {isLoadingActivities ? (
                      <div className="text-muted small">Loading chronological events...</div>
                    ) : orderActivities.length > 0 ? (
                      <div className="ps-2">
                        {orderActivities.map((event, idx) => (
                          <div key={event.id || idx} className="d-flex gap-3 mb-3 position-relative">
                            <div
                              className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 28, height: 28, fontSize: '0.75rem', zIndex: 1 }}
                            >
                              <i className="bi bi-check"></i>
                            </div>
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-dark small">{event.status.replace('_', ' ')}</span>
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  &bull; {new Date(event.timestamp).toLocaleString()}
                                </span>
                                <span className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>
                                  {event.actor}
                                </span>
                              </div>
                              <p className="text-muted small mb-0">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted small mb-0">No timeline events recorded yet.</p>
                    )}
                  </div>
                </div>

                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    {canUpdateStatus && selectedOrder.orderStatus === 'IN_TRANSIT' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => executeUpdateStatus(selectedOrder.id, 'DELIVERED')}
                      >
                        <i className="bi bi-check-circle me-1"></i> Mark Delivered
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ardab-outline"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reason Modal for Rejection / Cancellation */}
        {reasonModal.isOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <form onSubmit={handleSubmitReasonModal}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title fw-bold text-danger">
                      {reasonModal.actionType === 'REJECT' ? 'Reject Order' : 'Cancel Order'} &mdash;{' '}
                      {reasonModal.orderNumber}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body p-4">
                    <p className="text-muted small mb-3">
                      Please enter a mandatory explanation for this action. This will be recorded permanently in the operational audit trail and timeline.
                    </p>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Reason for {reasonModal.actionType === 'REJECT' ? 'Rejection' : 'Cancellation'} *
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        required
                        placeholder={
                          reasonModal.actionType === 'REJECT'
                            ? 'e.g. Out of stock at seller hub, customer unreachable'
                            : 'e.g. Customer requested cancellation, delivery route obstructed'
                        }
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReason || !actionReason.trim()}
                      className="btn btn-sm btn-danger px-3 fw-semibold"
                    >
                      {isSubmittingReason ? 'Submitting...' : 'Confirm Action'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
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
