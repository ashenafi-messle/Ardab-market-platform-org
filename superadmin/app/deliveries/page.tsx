'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { deliveriesApi } from '@/lib/api';
import {
  Delivery,
  DeliveryStatus,
  DeliverySummaryMetrics,
  DeliveryTimelineEvent,
  AvailableTrip,
} from '@/types/delivery';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { STANDARD_FLEET_CAPACITY_KG, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

const DELIVERY_STATUS_TABS: { label: string; value: DeliveryStatus | 'ALL'; countKey?: keyof DeliverySummaryMetrics }[] = [
  { label: 'All Deliveries', value: 'ALL', countKey: 'totalDeliveries' },
  { label: 'Pending Preparation', value: 'PENDING', countKey: 'pendingDeliveries' },
  { label: 'Ready for Trip', value: 'READY_FOR_ASSIGNMENT', countKey: 'readyDeliveries' },
  { label: 'Trip Assigned', value: 'ASSIGNED', countKey: 'assignedDeliveries' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY', countKey: 'outForDelivery' },
  { label: 'Delivered', value: 'DELIVERED', countKey: 'deliveredToday' },
  { label: 'Failed Attempts', value: 'FAILED', countKey: 'failedDeliveries' },
  { label: 'Cancelled', value: 'CANCELLED', countKey: 'cancelledDeliveries' },
];

const FAILURE_REASON_OPTIONS = [
  'Customer unavailable at destination',
  'Incorrect delivery address or contact number',
  'Customer refused delivery consignment',
  'Severe vehicle mechanical breakdown',
  'Adverse weather or road blockage',
  'Other operational constraint',
];

const CANCELLATION_REASON_OPTIONS = [
  'Order cancelled by customer',
  'Consignment items damaged prior to dispatch',
  'Duplicate delivery dispatch entry',
  'Customer requested change of fulfillment date',
  'Delivery route unreachable',
  'Other administrative cancellation',
];

export default function DeliveriesPage() {
  const { user, selectedCity } = useAuth();

  // Deliveries and Pagination state
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [zoneFilter, setZoneFilter] = useState('All Zones');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Summary Metrics
  const [summary, setSummary] = useState<DeliverySummaryMetrics>({
    totalDeliveries: 0,
    pendingDeliveries: 0,
    readyDeliveries: 0,
    assignedDeliveries: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    failedDeliveries: 0,
    cancelledDeliveries: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Selection & Details Drawer
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<DeliveryTimelineEvent[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Status & Feedback messages
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Trip Assignment Modal
  const [isAssignTripModalOpen, setIsAssignTripModalOpen] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<AvailableTrip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [assigningDelivery, setAssigningDelivery] = useState<Delivery | null>(null);

  // Failure & Cancellation Modals
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    deliveryId: string;
    deliveryNumber: string;
    actionType: 'FAIL' | 'CANCEL';
  }>({
    isOpen: false,
    deliveryId: '',
    deliveryNumber: '',
    actionType: 'FAIL',
  });
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Generic Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationVariant;
    confirmLabel?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Permissions
  const canView = hasPermission(user?.role, 'deliveries:view');
  const canAssign = hasPermission(user?.role, 'deliveries:assign');
  const canUpdateStatus = hasPermission(user?.role, 'deliveries:update_status');

  // Load KPI summary metrics
  const loadSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const data = await deliveriesApi.getSummary(selectedCity);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load delivery summary metrics:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [selectedCity]);

  // Load paginated deliveries list
  const loadDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await deliveriesApi.list({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
        city: selectedCity,
        deliveryZone: zoneFilter,
        status: activeTab === 'ALL' ? undefined : activeTab,
        sortBy,
        sortOrder,
      });
      setDeliveries(res.items);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || res.items.length,
        totalPages: res.pagination?.totalPages || 1,
      }));
    } catch (err: any) {
      console.error('Failed to load deliveries:', err);
      setActionErrorMessage(err.message || 'Unable to load deliveries.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, selectedCity, zoneFilter, activeTab, sortBy, sortOrder]);

  // Initial load and filter change hooks
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  // Reset page to 1 on filter or search change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, selectedCity, zoneFilter, activeTab]);

  // Load timeline events when delivery details open
  const openDeliveryDetails = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsLoadingTimeline(true);
    try {
      const activities = await deliveriesApi.getActivity(delivery.id);
      setTimelineEvents(activities);
    } catch (err) {
      console.error('Failed to load timeline events:', err);
      setTimelineEvents([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Toast message dismiss timer
  useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  useEffect(() => {
    if (actionErrorMessage) {
      const timer = setTimeout(() => setActionErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionErrorMessage]);

  // Actions Handlers
  const handlePrepareDelivery = async (delivery: Delivery) => {
    try {
      setIsProcessingAction(true);
      const updated = await deliveriesApi.prepare(delivery.id);
      setActionSuccessMessage(`Delivery ${delivery.deliveryNumber} is now marked Ready for Trip Assignment.`);
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
      if (selectedDelivery?.id === delivery.id) setSelectedDelivery(updated);
      loadSummary();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to prepare delivery.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openAssignTripModal = async (delivery: Delivery) => {
    setAssigningDelivery(delivery);
    setSelectedTripId('');
    setIsAssignTripModalOpen(true);
    setIsLoadingTrips(true);
    try {
      const trips = await deliveriesApi.getAvailableTrips(delivery.city);
      setAvailableTrips(trips);
    } catch (err) {
      console.error('Failed to fetch available trips:', err);
      setAvailableTrips([]);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const submitAssignTrip = async () => {
    if (!assigningDelivery || !selectedTripId) return;
    try {
      setIsProcessingAction(true);
      const updated = await deliveriesApi.assignTrip(assigningDelivery.id, selectedTripId);
      setActionSuccessMessage(`Delivery ${assigningDelivery.deliveryNumber} successfully assigned to Trip.`);
      setDeliveries((prev) => prev.map((d) => (d.id === assigningDelivery.id ? updated : d)));
      if (selectedDelivery?.id === assigningDelivery.id) setSelectedDelivery(updated);
      setIsAssignTripModalOpen(false);
      loadSummary();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to assign delivery to trip.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDispatchDelivery = async (delivery: Delivery) => {
    try {
      setIsProcessingAction(true);
      const updated = await deliveriesApi.dispatch(delivery.id);
      setActionSuccessMessage(`Delivery ${delivery.deliveryNumber} dispatched and is Out for Delivery.`);
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
      if (selectedDelivery?.id === delivery.id) setSelectedDelivery(updated);
      loadSummary();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to dispatch delivery.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const promptCompleteDelivery = (delivery: Delivery) => {
    setConfirmModal({
      isOpen: true,
      title: `Confirm Delivery Fulfillment`,
      message: `Are you sure you want to mark ${delivery.deliveryNumber} as delivered? The customer consignment will be registered as fulfilled and the associated order will be updated to Delivered.`,
      variant: 'success',
      confirmLabel: 'Confirm Delivery Fulfilled',
      action: async () => {
        try {
          setIsProcessingAction(true);
          const updated = await deliveriesApi.complete(delivery.id);
          setActionSuccessMessage(`Delivery ${delivery.deliveryNumber} completed successfully.`);
          setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
          if (selectedDelivery?.id === delivery.id) setSelectedDelivery(updated);
          loadSummary();
        } catch (err: any) {
          setActionErrorMessage(err.message || 'Failed to complete delivery.');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  const openFailModal = (delivery: Delivery) => {
    setReasonModal({
      isOpen: true,
      deliveryId: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      actionType: 'FAIL',
    });
    setSelectedReason(FAILURE_REASON_OPTIONS[0]);
    setAdditionalNotes('');
  };

  const openCancelModal = (delivery: Delivery) => {
    setReasonModal({
      isOpen: true,
      deliveryId: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      actionType: 'CANCEL',
    });
    setSelectedReason(CANCELLATION_REASON_OPTIONS[0]);
    setAdditionalNotes('');
  };

  const submitReasonAction = async () => {
    if (!reasonModal.deliveryId || !selectedReason) return;
    try {
      setIsProcessingAction(true);
      let updated: Delivery;
      if (reasonModal.actionType === 'FAIL') {
        updated = await deliveriesApi.fail(reasonModal.deliveryId, selectedReason, additionalNotes);
        setActionSuccessMessage(`Delivery ${reasonModal.deliveryNumber} recorded as Failed.`);
      } else {
        updated = await deliveriesApi.cancel(reasonModal.deliveryId, selectedReason);
        setActionSuccessMessage(`Delivery ${reasonModal.deliveryNumber} has been Cancelled.`);
      }
      setDeliveries((prev) => prev.map((d) => (d.id === reasonModal.deliveryId ? updated : d)));
      if (selectedDelivery?.id === reasonModal.deliveryId) setSelectedDelivery(updated);
      setReasonModal((prev) => ({ ...prev, isOpen: false }));
      loadSummary();
    } catch (err: any) {
      setActionErrorMessage(err.message || `Failed to ${reasonModal.actionType.toLowerCase()} delivery.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Helper for Status Badge Styling
  const renderStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge bg-warning text-dark px-2 py-1">Pending Prep</span>;
      case 'READY_FOR_ASSIGNMENT':
        return <span className="badge bg-info text-dark px-2 py-1">Ready for Trip</span>;
      case 'ASSIGNED':
        return <span className="badge bg-primary px-2 py-1">Trip Assigned</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge bg-indigo text-white px-2 py-1" style={{ backgroundColor: '#6f42c1' }}>Out for Delivery</span>;
      case 'DELIVERED':
        return <span className="badge bg-success px-2 py-1">Delivered</span>;
      case 'FAILED':
        return <span className="badge bg-danger px-2 py-1">Failed Attempt</span>;
      case 'CANCELLED':
        return <span className="badge bg-secondary px-2 py-1">Cancelled</span>;
      default:
        return <span className="badge bg-light text-dark px-2 py-1">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Fleet Deliveries Fulfillment"
        subtitle="Operational order fulfillment monitoring &bull; Vehicle consolidation and destination execution"
        breadcrumbs={[{ label: 'Fleet' }, { label: 'Deliveries' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 bg-white border"
              onClick={() => {
                loadSummary();
                loadDeliveries();
              }}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
            <span className="badge badge-success-soft d-none d-md-inline-block">
              <i className="bi bi-shield-check me-1"></i> Authoritative Fulfillment
            </span>
          </div>
        }
      >
        {/* Toast Feedback Messages */}
        {actionSuccessMessage && (
          <div className="alert alert-success alert-dismissible fade show shadow-sm d-flex align-items-center gap-2 mb-3" role="alert">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <div>{actionSuccessMessage}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setActionSuccessMessage(null)}></button>
          </div>
        )}

        {actionErrorMessage && (
          <div className="alert alert-danger alert-dismissible fade show shadow-sm d-flex align-items-center gap-2 mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
            <div>{actionErrorMessage}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setActionErrorMessage(null)}></button>
          </div>
        )}

        {/* Dynamic KPI Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Total Deliveries</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {isSummaryLoading ? '...' : summary.totalDeliveries}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>All-time created</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Pending Prep</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-warning">
                  {isSummaryLoading ? '...' : summary.pendingDeliveries}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>Awaiting packaging</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Ready for Trip</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-info">
                  {isSummaryLoading ? '...' : summary.readyDeliveries}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>Unassigned to run</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Out for Delivery</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-primary">
                  {isSummaryLoading ? '...' : summary.outForDelivery}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>In vehicle transit</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Delivered Today</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-success">
                  {isSummaryLoading ? '...' : summary.deliveredToday}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>Fulfillment success</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Failed Attempts</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-danger">
                  {isSummaryLoading ? '...' : summary.failedDeliveries}
                </h3>
              </div>
              <div className="text-muted mt-2 small" style={{ fontSize: '0.75rem' }}>Exception issues</div>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-3 d-flex gap-2 flex-wrap border-bottom pb-3">
          {DELIVERY_STATUS_TABS.map((tab) => {
            const count = tab.countKey ? summary[tab.countKey] : null;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 ${
                  isActive ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                <span>{tab.label}</span>
                {count !== null && (
                  <span
                    className={`badge rounded-pill ms-1 ${
                      isActive ? 'bg-white text-success' : 'bg-light text-dark'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {isSummaryLoading ? '...' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter and Search Toolbar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-6 col-lg-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search delivery #, order #, customer, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary border"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Zone Filter */}
            <div className="col-6 col-md-3 col-lg-3">
              <select
                className="form-select form-select-sm"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="All Zones">All Delivery Zones</option>
                <option value="Arada Central">Arada Central</option>
                <option value="Maraki Campus Zone">Maraki Campus Zone</option>
                <option value="Azezo West">Azezo West</option>
                <option value="Piazza Commercial">Piazza Commercial</option>
                <option value="Autopark Logistics Zone">Autopark Logistics Zone</option>
                <option value="Central Zone">Central Zone</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="col-6 col-md-3 col-lg-3">
              <div className="d-flex align-items-center gap-1">
                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="createdAt">Sort by Date</option>
                  <option value="deliveryNumber">Delivery Number</option>
                  <option value="scheduledAt">Scheduled Time</option>
                  <option value="status">Status</option>
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary bg-white border px-2"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <i className={`bi bi-sort-${sortOrder === 'asc' ? 'down' : 'up'}`}></i>
                </button>
              </div>
            </div>

            {/* Results Count & Reset */}
            <div className="col-12 col-lg-1 text-lg-end text-muted small">
              {pagination.total} total
            </div>
          </div>
        </div>

        {/* Deliveries Display: Desktop Table (>768px) & Mobile Cards (<768px) */}
        {isLoading ? (
          <div className="ardab-card p-0 mb-4 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <TableSkeleton rows={6} columns={8} />
              </table>
            </div>
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon="bi-truck"
            title={debouncedSearch || activeTab !== 'ALL' || zoneFilter !== 'All Zones' ? 'No matching deliveries found' : 'No deliveries in system'}
            description={
              debouncedSearch || activeTab !== 'ALL' || zoneFilter !== 'All Zones'
                ? 'Try adjusting your search criteria or filter tags.'
                : 'Customer incoming orders will generate authoritative fulfillment delivery records automatically.'
            }
            actionLabel={(debouncedSearch || activeTab !== 'ALL' || zoneFilter !== 'All Zones') ? 'Clear Filters' : undefined}
            onAction={
              (debouncedSearch || activeTab !== 'ALL' || zoneFilter !== 'All Zones')
                ? () => {
                    setSearchTerm('');
                    setActiveTab('ALL');
                    setZoneFilter('All Zones');
                  }
                : undefined
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '13%' }}>Delivery #</th>
                      <th style={{ width: '12%' }}>Order</th>
                      <th style={{ width: '15%' }}>Customer</th>
                      <th style={{ width: '15%' }}>Destination</th>
                      <th style={{ width: '12%' }}>Trip / Logistics</th>
                      <th style={{ width: '10%' }}>Weight</th>
                      <th style={{ width: '11%' }}>Status</th>
                      <th style={{ width: '12%' }} className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-semibold text-dark font-monospace">{delivery.deliveryNumber}</span>
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {new Date(delivery.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td>
                          <div className="fw-medium text-dark font-monospace">
                            {delivery.order?.orderNumber || '—'}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {delivery.order?.totalAmount ? formatCurrency(delivery.order.totalAmount) : ''}
                          </div>
                        </td>

                        <td>
                          <div className="fw-medium text-dark text-truncate" style={{ maxWidth: '140px' }}>
                            {delivery.recipientName}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {delivery.recipientPhone}
                          </div>
                        </td>

                        <td>
                          <div className="text-dark small fw-medium">
                            {delivery.city} &bull; {delivery.deliveryZone || 'Zone'}
                          </div>
                          <div className="text-muted text-truncate small" style={{ maxWidth: '160px', fontSize: '0.75rem' }}>
                            {delivery.addressLine}
                          </div>
                        </td>

                        <td>
                          {delivery.trip ? (
                            <div>
                              <span className="badge bg-light text-dark border font-monospace">
                                {delivery.trip.tripNumber}
                              </span>
                              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                {delivery.trip.vehicle?.plateNumber || 'Truck'} &bull; {delivery.trip.driver?.fullName?.split(' ')[0] || 'Driver'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted small fst-italic">Unassigned</span>
                          )}
                        </td>

                        <td>
                          <div className="small text-dark fw-medium">
                            {formatWeight(delivery.order?.totalWeight || 0)}
                          </div>
                          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                            {delivery.order?.itemCount || 0} item(s)
                          </div>
                        </td>

                        <td>{renderStatusBadge(delivery.status)}</td>

                        <td className="text-end pe-3">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            {/* View Details Button */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary p-1 px-2 border"
                              onClick={() => openDeliveryDetails(delivery)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>

                            {/* State Specific Operations */}
                            {delivery.status === 'PENDING' && canUpdateStatus && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary p-1 px-2"
                                onClick={() => handlePrepareDelivery(delivery)}
                                disabled={isProcessingAction}
                                title="Prepare for Trip Assignment"
                              >
                                <i className="bi bi-check2-circle me-1"></i> Prepare
                              </button>
                            )}

                            {delivery.status === 'READY_FOR_ASSIGNMENT' && canAssign && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success p-1 px-2"
                                onClick={() => openAssignTripModal(delivery)}
                                disabled={isProcessingAction}
                                title="Assign to Consolidated Trip"
                              >
                                <i className="bi bi-truck me-1"></i> Assign Trip
                              </button>
                            )}

                            {delivery.status === 'ASSIGNED' && canUpdateStatus && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info p-1 px-2"
                                onClick={() => handleDispatchDelivery(delivery)}
                                disabled={isProcessingAction}
                                title="Dispatch Run (Out for Delivery)"
                              >
                                <i className="bi bi-send me-1"></i> Dispatch
                              </button>
                            )}

                            {delivery.status === 'OUT_FOR_DELIVERY' && canUpdateStatus && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success p-1 px-2"
                                  onClick={() => promptCompleteDelivery(delivery)}
                                  disabled={isProcessingAction}
                                  title="Mark Delivered"
                                >
                                  <i className="bi bi-check-lg"></i> Complete
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger p-1 px-2"
                                  onClick={() => openFailModal(delivery)}
                                  disabled={isProcessingAction}
                                  title="Record Failed Delivery"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </>
                            )}

                            {/* Cancellation (if not terminal) */}
                            {['PENDING', 'READY_FOR_ASSIGNMENT', 'ASSIGNED'].includes(delivery.status) && canUpdateStatus && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-1 px-2 border-0"
                                onClick={() => openCancelModal(delivery)}
                                disabled={isProcessingAction}
                                title="Cancel Delivery"
                              >
                                <i className="bi bi-trash text-danger"></i>
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

            {/* Mobile Cards Layout (<768px, exactly 320, 360, 375, 390, 414, 430px responsive) */}
            <div className="d-lg-none d-flex flex-column gap-3 mb-4">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="ardab-card p-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="fw-bold font-monospace text-dark">{delivery.deliveryNumber}</span>
                    {renderStatusBadge(delivery.status)}
                  </div>

                  <div className="small mb-1">
                    <span className="text-muted">Order: </span>
                    <span className="fw-medium font-monospace text-dark">{delivery.order?.orderNumber || '—'}</span>
                  </div>

                  <div className="small mb-1">
                    <span className="text-muted">Customer: </span>
                    <span className="fw-semibold text-dark">{delivery.recipientName}</span>
                    <span className="text-muted ms-1">({delivery.recipientPhone})</span>
                  </div>

                  <div className="small mb-1">
                    <span className="text-muted">Destination: </span>
                    <span className="text-dark">{delivery.city} &bull; {delivery.deliveryZone || 'Zone'}</span>
                  </div>

                  <div className="small mb-2 text-truncate text-muted" style={{ fontSize: '0.78rem' }}>
                    {delivery.addressLine}
                  </div>

                  <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-3 small">
                    <div>
                      <span className="text-muted">Trip: </span>
                      <span className="fw-medium text-dark">{delivery.trip?.tripNumber || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-muted">Weight: </span>
                      <span className="fw-bold text-dark">{formatWeight(delivery.order?.totalWeight || 0)}</span>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary flex-grow-1"
                      onClick={() => openDeliveryDetails(delivery)}
                    >
                      <i className="bi bi-eye me-1"></i> View Details
                    </button>

                    {delivery.status === 'PENDING' && canUpdateStatus && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary flex-grow-1"
                        onClick={() => handlePrepareDelivery(delivery)}
                        disabled={isProcessingAction}
                      >
                        <i className="bi bi-check2-circle me-1"></i> Prepare
                      </button>
                    )}

                    {delivery.status === 'READY_FOR_ASSIGNMENT' && canAssign && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success flex-grow-1"
                        onClick={() => openAssignTripModal(delivery)}
                        disabled={isProcessingAction}
                      >
                        <i className="bi bi-truck me-1"></i> Assign Trip
                      </button>
                    )}

                    {delivery.status === 'ASSIGNED' && canUpdateStatus && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info flex-grow-1"
                        onClick={() => handleDispatchDelivery(delivery)}
                        disabled={isProcessingAction}
                      >
                        <i className="bi bi-send me-1"></i> Dispatch
                      </button>
                    )}

                    {delivery.status === 'OUT_FOR_DELIVERY' && canUpdateStatus && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-success flex-grow-1"
                          onClick={() => promptCompleteDelivery(delivery)}
                          disabled={isProcessingAction}
                        >
                          <i className="bi bi-check-lg me-1"></i> Complete
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => openFailModal(delivery)}
                          disabled={isProcessingAction}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>
                    )}

                    {['PENDING', 'READY_FOR_ASSIGNMENT', 'ASSIGNED'].includes(delivery.status) && canUpdateStatus && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openCancelModal(delivery)}
                        disabled={isProcessingAction}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted small">
                Showing {deliveries.length} of {pagination.total} deliveries
              </div>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalRecords={pagination.total}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                onPageSizeChange={(sz) => setPagination((prev) => ({ ...prev, pageSize: sz, page: 1 }))}
              />
            </div>
          </>
        )}

        {/* DELIVERY DETAILS DRAWER / MODAL */}
        {selectedDelivery && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
            tabIndex={-1}
            onClick={() => setSelectedDelivery(null)}
          >
            <div
              className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-light border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold font-monospace d-flex align-items-center gap-2">
                      <span>{selectedDelivery.deliveryNumber}</span>
                      {renderStatusBadge(selectedDelivery.status)}
                    </h5>
                    <span className="text-muted small">
                      Created on {new Date(selectedDelivery.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedDelivery(null)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {/* SECTION 1: DELIVERY & ORDER SUMMARY */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded h-100">
                        <div className="fw-bold text-dark small mb-2 text-uppercase tracking-wider">
                          <i className="bi bi-receipt me-1 text-primary"></i> Order Information
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Order #: </span>
                          <span className="fw-semibold font-monospace text-dark">{selectedDelivery.order?.orderNumber || '—'}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Order Total: </span>
                          <span className="fw-bold text-success">
                            {selectedDelivery.order?.totalAmount ? formatCurrency(selectedDelivery.order.totalAmount) : '—'}
                          </span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Consignment Weight: </span>
                          <span className="fw-bold text-dark">
                            {formatWeight(selectedDelivery.order?.totalWeight || 0)}
                          </span>
                        </div>
                        <div className="small">
                          <span className="text-muted">Payment Status: </span>
                          <span className="badge bg-secondary-soft text-dark">
                            {selectedDelivery.order?.paymentStatus || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded h-100">
                        <div className="fw-bold text-dark small mb-2 text-uppercase tracking-wider">
                          <i className="bi bi-geo-alt me-1 text-danger"></i> Destination Snapshot
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Recipient: </span>
                          <span className="fw-semibold text-dark">{selectedDelivery.recipientName}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Phone: </span>
                          <span className="text-dark">{selectedDelivery.recipientPhone}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Zone: </span>
                          <span className="text-dark">{selectedDelivery.city} &bull; {selectedDelivery.deliveryZone || 'Standard'}</span>
                        </div>
                        <div className="small">
                          <span className="text-muted">Address: </span>
                          <span className="text-dark">{selectedDelivery.addressLine}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: TRIP & FLEET ALLOCATION */}
                  <div className="p-3 border rounded mb-4">
                    <div className="fw-bold text-dark small mb-2 text-uppercase tracking-wider">
                      <i className="bi bi-truck me-1 text-success"></i> Fleet Journey & Trip Allocation
                    </div>
                    {selectedDelivery.trip ? (
                      <div className="row g-2 small">
                        <div className="col-6 col-md-3">
                          <span className="text-muted d-block">Trip Run</span>
                          <span className="fw-bold font-monospace text-dark">{selectedDelivery.trip.tripNumber}</span>
                        </div>
                        <div className="col-6 col-md-3">
                          <span className="text-muted d-block">Vehicle</span>
                          <span className="fw-medium text-dark">
                            {selectedDelivery.trip.vehicle?.plateNumber || '—'}
                          </span>
                        </div>
                        <div className="col-6 col-md-3">
                          <span className="text-muted d-block">Assigned Driver</span>
                          <span className="fw-medium text-dark">
                            {selectedDelivery.trip.driver?.fullName || '—'}
                          </span>
                        </div>
                        <div className="col-6 col-md-3">
                          <span className="text-muted d-block">Trip Load Utilization</span>
                          <span className="fw-bold text-dark">
                            {formatWeight(selectedDelivery.trip.totalWeightKg)} / {formatWeight(selectedDelivery.trip.maxCapacityKg)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small fst-italic">
                        No fleet vehicle trip currently assigned. Ready to be consolidated into a 5,000 KG capacity run.
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: ORDER ITEMS SNAPSHOT */}
                  {selectedDelivery.order?.items && selectedDelivery.order.items.length > 0 && (
                    <div className="mb-4">
                      <div className="fw-bold text-dark small mb-2 text-uppercase tracking-wider">
                        <i className="bi bi-boxes me-1 text-secondary"></i> Package Contents
                      </div>
                      <div className="table-responsive border rounded">
                        <table className="table table-sm mb-0 align-middle">
                          <thead className="table-light small">
                            <tr>
                              <th>Product</th>
                              <th>Item Code</th>
                              <th className="text-center">Qty</th>
                              <th className="text-end">Unit Price</th>
                              <th className="text-end">Weight</th>
                              <th className="text-end pe-2">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="small">
                            {selectedDelivery.order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="fw-medium text-dark">{item.productName}</td>
                                <td className="font-monospace text-muted small">{item.itemCode}</td>
                                <td className="text-center">{item.quantity} {item.unit}</td>
                                <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                                <td className="text-end">{formatWeight(item.totalWeight)}</td>
                                <td className="text-end pe-2 fw-semibold">{formatCurrency(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SECTION 4: ACTIVITY TIMELINE */}
                  <div>
                    <div className="fw-bold text-dark small mb-2 text-uppercase tracking-wider">
                      <i className="bi bi-clock-history me-1 text-primary"></i> Lifecycle Timeline
                    </div>
                    {isLoadingTimeline ? (
                      <div className="text-muted small">Loading timeline...</div>
                    ) : timelineEvents.length === 0 ? (
                      <div className="text-muted small fst-italic">No activity logged yet.</div>
                    ) : (
                      <div className="position-relative ps-3 border-start ms-2 py-1">
                        {timelineEvents.map((event, idx) => (
                          <div key={event.id || idx} className="position-relative mb-3">
                            <span
                              className="position-absolute translate-middle rounded-circle bg-success"
                              style={{ left: '-13px', top: '10px', width: '8px', height: '8px' }}
                            ></span>
                            <div className="d-flex justify-content-between align-items-baseline">
                              <span className="fw-bold small text-dark">{event.action}</span>
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                              {event.description} &bull; <span className="fst-italic">{event.actor}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSelectedDelivery(null)}
                  >
                    Close
                  </button>

                  {selectedDelivery.status === 'PENDING' && canUpdateStatus && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handlePrepareDelivery(selectedDelivery)}
                      disabled={isProcessingAction}
                    >
                      Prepare for Trip
                    </button>
                  )}

                  {selectedDelivery.status === 'READY_FOR_ASSIGNMENT' && canAssign && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => openAssignTripModal(selectedDelivery)}
                      disabled={isProcessingAction}
                    >
                      Assign to Trip
                    </button>
                  )}

                  {selectedDelivery.status === 'ASSIGNED' && canUpdateStatus && (
                    <button
                      type="button"
                      className="btn btn-sm btn-info text-white"
                      onClick={() => handleDispatchDelivery(selectedDelivery)}
                      disabled={isProcessingAction}
                    >
                      Dispatch Consignment
                    </button>
                  )}

                  {selectedDelivery.status === 'OUT_FOR_DELIVERY' && canUpdateStatus && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => openFailModal(selectedDelivery)}
                        disabled={isProcessingAction}
                      >
                        Record Failure
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => promptCompleteDelivery(selectedDelivery)}
                        disabled={isProcessingAction}
                      >
                        Mark Delivered
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRIP ASSIGNMENT MODAL */}
        {isAssignTripModalOpen && assigningDelivery && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
            tabIndex={-1}
            onClick={() => setIsAssignTripModalOpen(false)}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold fs-6">
                    Assign {assigningDelivery.deliveryNumber} to Fleet Trip
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsAssignTripModalOpen(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="p-2 bg-light rounded small mb-3">
                    <div>
                      <span className="text-muted">Destination City: </span>
                      <span className="fw-bold text-dark">{assigningDelivery.city}</span>
                    </div>
                    <div>
                      <span className="text-muted">Delivery Weight: </span>
                      <span className="fw-bold text-dark">{formatWeight(assigningDelivery.order?.totalWeight || 0)}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">
                      Select Available Journey Run (Max 5,000 KG)
                    </label>
                    {isLoadingTrips ? (
                      <div className="text-muted small">Searching available vehicle runs...</div>
                    ) : availableTrips.length === 0 ? (
                      <div className="alert alert-warning small mb-0">
                        No active runs scheduled in {assigningDelivery.city}. Please create or dispatch a trip in Fleet Trips.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {availableTrips.map((trip) => {
                          const deliveryWeight = Number(assigningDelivery.order?.totalWeight || 0);
                          const willExceedCapacity = deliveryWeight > trip.remainingCapacityKg;
                          return (
                            <label
                              key={trip.id}
                              className={`d-flex justify-content-between align-items-center p-3 border rounded cursor-pointer ${
                                selectedTripId === trip.id ? 'border-primary bg-primary-soft' : ''
                              } ${willExceedCapacity ? 'opacity-50' : ''}`}
                              style={{ cursor: willExceedCapacity ? 'not-allowed' : 'pointer' }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="radio"
                                  name="tripSelection"
                                  value={trip.id}
                                  checked={selectedTripId === trip.id}
                                  onChange={() => setSelectedTripId(trip.id)}
                                  disabled={willExceedCapacity}
                                />
                                <div>
                                  <div className="fw-bold font-monospace text-dark">{trip.tripNumber}</div>
                                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                    {trip.vehiclePlate} ({trip.vehicleModel}) &bull; {trip.driverName}
                                  </div>
                                </div>
                              </div>

                              <div className="text-end small">
                                <div className="fw-bold text-dark">
                                  {formatWeight(trip.currentLoadKg)} / {formatWeight(trip.capacityKg)}
                                </div>
                                <div className={willExceedCapacity ? 'text-danger fw-bold' : 'text-success'}>
                                  {willExceedCapacity ? 'Exceeds Capacity' : `${formatWeight(trip.remainingCapacityKg)} left`}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsAssignTripModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submitAssignTrip}
                    disabled={!selectedTripId || isProcessingAction}
                  >
                    {isProcessingAction ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STRUCTURED REASON MODAL (FAIL / CANCEL) */}
        {reasonModal.isOpen && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
            tabIndex={-1}
            onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold fs-6">
                    {reasonModal.actionType === 'FAIL' ? 'Record Failed Delivery' : 'Cancel Delivery'} - {reasonModal.deliveryNumber}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">
                      Structured Reason <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    >
                      {(reasonModal.actionType === 'FAIL' ? FAILURE_REASON_OPTIONS : CANCELLATION_REASON_OPTIONS).map(
                        (r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Operational Notes / Details</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Add specific context, driver remarks, or customer contact notes..."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${reasonModal.actionType === 'FAIL' ? 'btn-warning' : 'btn-danger'}`}
                    onClick={submitReasonAction}
                    disabled={!selectedReason || isProcessingAction}
                  >
                    {isProcessingAction ? 'Submitting...' : reasonModal.actionType === 'FAIL' ? 'Confirm Failure' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REUSABLE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={async () => {
            setIsConfirming(true);
            try {
              await confirmModal.action();
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            } finally {
              setIsConfirming(false);
            }
          }}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          isLoading={isConfirming}
        />
      </PageContainer>
    </AdminLayout>
  );
}
