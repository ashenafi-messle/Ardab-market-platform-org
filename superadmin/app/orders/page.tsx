'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/lib/api';
import { Order, OrderStatus } from '@/types/order';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

const ORDER_STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Incoming Queue (Pending)', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Ready for Delivery', value: 'READY_FOR_DELIVERY' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function OrdersPage() {
  const { user, selectedCity } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Confirmation modal state
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

  useEffect(() => {
    let isMounted = true;
    ordersApi
      .getAll(selectedCity, activeTab)
      .then((res) => {
        if (isMounted) setOrders(res);
      })
      .catch((e) => {
        console.error('Failed to load orders:', e);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, activeTab]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.deliveryZone.toLowerCase().includes(q) ||
        o.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            (it.sellerName && it.sellerName.toLowerCase().includes(q))
        );
      return matchesSearch;
    });
  }, [orders, debouncedSearch]);

  // Paginated records
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize]);

  // Select all / one handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedOrders.map((o) => o.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedOrders.map((o) => o.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedIds.includes(o.id));

  // Order status update logic
  const executeUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await ordersApi.updateStatus(orderId, newStatus);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(updated);
    }
    setActionSuccessMessage(`Order ${orderId} transitioned to ${newStatus.replace('_', ' ')}.`);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  // Prompt single cancellation or sensitive transition
  const promptUpdateStatus = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
      setConfirmModal({
        isOpen: true,
        title: `Cancel Order ${order.id}`,
        message: `Are you sure you want to cancel order ${order.id} for ${order.customerName}? Commodity allocations will be returned to the supplier merchant inventory in ${order.city}.`,
        variant: 'danger',
        confirmLabel: 'Yes, Cancel Order',
        isIrreversible: true,
        affectedCount: 1,
        affectedNames: [`${order.id} - ${order.customerName} (${order.totalEtb} ETB)`],
        action: async () => {
          await executeUpdateStatus(order.id, 'CANCELLED');
        },
      });
    } else {
      executeUpdateStatus(order.id, newStatus);
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
        ? `You are about to cancel ${count} selected order(s). This will abort consignment staging and notify assigned logistics hubs in ${selectedCity}.`
        : `Transition ${count} selected order(s) to status "${newStatus.replace('_', ' ')}"?`,
      variant: isCancel ? 'danger' : 'primary',
      confirmLabel: isCancel ? 'Cancel Selected Orders' : 'Apply Bulk Status',
      isIrreversible: isCancel,
      affectedCount: count,
      affectedNames: selectedIds,
      action: async () => {
        await ordersApi.bulkUpdateStatus(selectedIds, newStatus);
        setOrders((prev) =>
          prev.map((o) =>
            selectedIds.includes(o.id)
              ? {
                  ...o,
                  orderStatus: newStatus,
                  timeline: [
                    ...o.timeline,
                    {
                      status: newStatus,
                      timestamp: 'Just now',
                      description: `Bulk transitioned to ${newStatus} by Super Admin`,
                      actor: 'Super Admin',
                    },
                  ],
                }
              : o
          )
        );
        setSelectedIds([]);
        setActionSuccessMessage(`Successfully updated ${count} orders to ${newStatus.replace('_', ' ')}.`);
        setTimeout(() => setActionSuccessMessage(null), 3500);
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

  const pendingIncomingCount = orders.filter(
    (o) => o.orderStatus === 'PENDING' && (selectedCity === 'All Cities' || o.city === selectedCity)
  ).length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveTab('ALL');
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Incoming Orders & Lifecycle Control"
        subtitle="Review, approve, and direct incoming orders across sellers and delivery dispatch"
        breadcrumbs={[{ label: 'Core Operations' }, { label: 'Incoming Orders' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-bell-fill"></i>
              <span>{pendingIncomingCount} Incoming Awaiting Action</span>
            </span>
          </div>
        }
      >
        {/* Flash action message */}
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

        {/* Incoming Orders Attention Banner */}
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
                    New orders placed via the platform need confirmation before assignment to logistics
                    hubs and seller stock release.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-warning fw-semibold px-4 text-nowrap align-self-start align-self-md-center shadow-sm"
                onClick={() => setActiveTab('PENDING')}
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
                    setCurrentPage(1);
                  }}
                >
                  {tab.label}
                  {isPendingTab && pendingIncomingCount > 0 && (
                    <span className="ms-2 badge rounded-pill bg-danger">{pendingIncomingCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar & City Counter */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by Order ID, customer, phone, destination zone, product, or seller..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search orders"
                />
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end">
              <span className="text-muted small">
                Showing <strong className="text-dark">{filteredOrders.length}</strong> orders in{' '}
                <strong className="text-dark">{selectedCity}</strong>
              </span>
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

        {/* Orders Table (Desktop) */}
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
                  <th>Order ID</th>
                  <th>Customer & Destination</th>
                  <th>Products & Sellers</th>
                  <th>Weight & Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end">Admin Controls</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : paginatedOrders.length > 0 ? (
                <tbody>
                  {paginatedOrders.map((order) => {
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
                            aria-label={`Select order ${order.id}`}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-success">{order.id}</span>
                            {isPending && (
                              <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                            {order.createdAt.split('T')[0]}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{order.customerName}</div>
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
                            Seller: {order.items[0]?.sellerName || 'Direct Ardab Hub'}
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
                            {order.paymentStatus === 'PAID' && (
                              <i className="bi bi-check-circle-fill text-success" title="Payment Confirmed"></i>
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
                                : order.orderStatus === 'CANCELLED'
                                ? 'badge-danger-soft'
                                : 'badge-neutral-soft'
                            }`}
                          >
                            {order.orderStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {canManage && isPending && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success fw-semibold shadow-sm"
                                title="Confirm and approve incoming order"
                                onClick={() => executeUpdateStatus(order.id, 'CONFIRMED')}
                              >
                                <i className="bi bi-check2-circle me-1"></i> Confirm
                              </button>
                            )}
                            {canManage && isConfirmed && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary fw-semibold shadow-sm"
                                title="Move to warehouse processing"
                                onClick={() => executeUpdateStatus(order.id, 'PROCESSING')}
                              >
                                <i className="bi bi-box-seam me-1"></i> Process
                              </button>
                            )}
                            {canManage && isProcessing && (
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

            {!isLoading && paginatedOrders.length === 0 && (
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

        {/* Orders Mobile Cards */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {isLoading ? (
            <div className="ardab-card p-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading orders...
            </div>
          ) : paginatedOrders.length > 0 ? (
            paginatedOrders.map((order) => {
              const isPending = order.orderStatus === 'PENDING';
              return (
                <div
                  key={order.id}
                  className={`ardab-card p-3 ${
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
                        aria-label={`Select order ${order.id}`}
                      />
                      <span className="fw-bold text-success">{order.id}</span>
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
                          : order.orderStatus === 'CANCELLED'
                          ? 'badge-danger-soft'
                          : 'badge-neutral-soft'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="fw-semibold text-dark">{order.customerName}</div>
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
                      Seller: {order.items[0]?.sellerName || 'Ardab Direct Hub'}
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
                    {canManage && isPending && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-semibold flex-grow-1"
                        onClick={() => executeUpdateStatus(order.id, 'CONFIRMED')}
                      >
                        <i className="bi bi-check2-circle me-1"></i> Confirm
                      </button>
                    )}
                    {canManage && order.orderStatus === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary fw-semibold flex-grow-1"
                        onClick={() => executeUpdateStatus(order.id, 'PROCESSING')}
                      >
                        <i className="bi bi-box-seam me-1"></i> Process
                      </button>
                    )}
                    {canManage && order.orderStatus === 'PROCESSING' && (
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

        {/* Server-ready Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredOrders.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />

        {/* Modal: Order Details & Full Lifecycle Timeline */}
        {selectedOrder && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        Order Details &mdash; {selectedOrder.id}
                      </h5>
                      <span
                        className={`ardab-badge ${
                          selectedOrder.orderStatus === 'DELIVERED'
                            ? 'badge-success-soft'
                            : selectedOrder.orderStatus === 'IN_TRANSIT'
                            ? 'badge-info-soft'
                            : selectedOrder.orderStatus === 'PENDING'
                            ? 'badge-danger-soft'
                            : 'badge-warning-soft'
                        }`}
                      >
                        {selectedOrder.orderStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-muted small">
                      {selectedOrder.city} Hub &bull; Zone: {selectedOrder.deliveryZone}
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
                        <span className="small text-muted d-block">Order Control Phase</span>
                        <strong className="text-dark">
                          Current Stage: {selectedOrder.orderStatus.replace('_', ' ')}
                        </strong>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedOrder.orderStatus === 'PENDING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success fw-semibold shadow-sm"
                            onClick={() => executeUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                          >
                            <i className="bi bi-check-circle me-1"></i> Confirm Incoming Order
                          </button>
                        )}
                        {selectedOrder.orderStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary fw-semibold shadow-sm"
                            onClick={() => executeUpdateStatus(selectedOrder.id, 'PROCESSING')}
                          >
                            <i className="bi bi-box-seam me-1"></i> Send to Hub Processing
                          </button>
                        )}
                        {selectedOrder.orderStatus === 'PROCESSING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-info text-white fw-semibold shadow-sm"
                            onClick={() => executeUpdateStatus(selectedOrder.id, 'READY_FOR_DELIVERY')}
                          >
                            <i className="bi bi-box-arrow-up-right me-1"></i> Stage for Fleet Delivery
                          </button>
                        )}
                        {selectedOrder.orderStatus !== 'DELIVERED' &&
                          selectedOrder.orderStatus !== 'CANCELLED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => promptUpdateStatus(selectedOrder, 'CANCELLED')}
                            >
                              <i className="bi bi-x-circle me-1"></i> Cancel Order
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Customer & Address Details */}
                  <div className="row g-3 p-3 bg-light rounded-3 border mb-4">
                    <div className="col-12 col-md-6">
                      <span className="text-muted small">Customer Name & Contact</span>
                      <div className="fw-bold text-dark">{selectedOrder.customerName}</div>
                      <div className="text-muted small">{selectedOrder.customerPhone}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small">Delivery Address</span>
                      <div className="fw-semibold text-dark">{selectedOrder.deliveryAddress}</div>
                      <div className="text-muted small">
                        {selectedOrder.deliveryZone}, {selectedOrder.city}
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Payment Gateway</span>
                      <div className="fw-bold text-dark">{selectedOrder.paymentMethod}</div>
                      <span className="badge badge-success-soft">{selectedOrder.paymentStatus}</span>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small">Consignment Weight</span>
                      <div className="fw-bold text-dark fs-6">{formatWeight(selectedOrder.totalWeightKg)}</div>
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

                  {/* Order Items Table with Seller / Supplier Attribution */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-dark mb-2">
                      <i className="bi bi-bag-check me-2 text-success"></i>
                      Ordered Items &amp; Product Owners (Sellers)
                    </h6>
                    <div className="border rounded-3 overflow-hidden">
                      <table className="table table-sm table-borderless mb-0">
                        <thead className="bg-light border-bottom">
                          <tr>
                            <th className="p-2 ps-3">Product Name</th>
                            <th className="p-2">Owner / Seller (Supplier)</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-center">Weight</th>
                            <th className="p-2 text-end">Price</th>
                            <th className="p-2 text-end pe-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item) => (
                            <tr key={item.productId} className="border-bottom">
                              <td className="p-2 ps-3 fw-semibold text-dark">{item.productName}</td>
                              <td className="p-2">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                  <i className="bi bi-shop me-1"></i>
                                  {item.sellerName || 'Direct Ardab Hub'}
                                </span>
                              </td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-center">{formatWeight(item.unitWeightKg)}</td>
                              <td className="p-2 text-end">{formatCurrency(item.unitPriceEtb)}</td>
                              <td className="p-2 text-end pe-3 fw-bold">
                                {formatCurrency(item.totalPriceEtb)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-light">
                          <tr>
                            <td colSpan={5} className="p-2 text-end fw-semibold">
                              Delivery Fee:
                            </td>
                            <td className="p-2 text-end pe-3">{formatCurrency(selectedOrder.deliveryFeeEtb)}</td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="p-2 text-end fw-bold text-dark fs-6">
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

                  {/* Operational Timeline */}
                  <div>
                    <h6 className="fw-bold text-dark mb-3">Lifecycle Event Timeline</h6>
                    <div className="ps-2">
                      {selectedOrder.timeline.map((event, idx) => (
                        <div key={idx} className="d-flex gap-3 mb-3 position-relative">
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
                                &bull; {event.timestamp}
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
                  </div>
                </div>

                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    {canManage &&
                      selectedOrder.orderStatus !== 'DELIVERED' &&
                      selectedOrder.orderStatus !== 'CANCELLED' && (
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
