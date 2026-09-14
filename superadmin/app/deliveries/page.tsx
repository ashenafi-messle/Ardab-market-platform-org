'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { fleetApi } from '@/lib/api';
import { Trip, TripStatus } from '@/types/trip';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatWeight, formatCapacity } from '@/lib/formatters';
import { STANDARD_FLEET_CAPACITY_KG, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

const DELIVERY_STATUS_FILTERS: { label: string; value: TripStatus | 'ALL' }[] = [
  { label: 'All Deliveries', value: 'ALL' },
  { label: 'In Transit', value: 'IN_PROGRESS' },
  { label: 'Loading at Hub', value: 'LOADING' },
  { label: 'Ready for Trip', value: 'READY' },
  { label: 'Completed', value: 'COMPLETED' },
];

export default function DeliveriesPage() {
  const { user, selectedCity } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeFilter, setActiveFilter] = useState<TripStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationVariant;
    action: () => Promise<void>;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const canManageDeliveries = hasPermission(user?.role, 'deliveries:update_status');

  useEffect(() => {
    let isMounted = true;
    fleetApi
      .getTrips(selectedCity, activeFilter)
      .then((res) => {
        if (isMounted) setTrips(res);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, activeFilter]);

  const executeUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    try {
      const updated = await fleetApi.updateTripStatus(tripId, newStatus);
      setTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));
      if (selectedTrip && selectedTrip.id === tripId) {
        setSelectedTrip(updated);
      }
      setActionMessage(`Delivery run ${tripId} status updated to ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const promptStatusChange = (trip: Trip, newStatus: TripStatus) => {
    const isDispatch = newStatus === 'IN_PROGRESS';
    const isComplete = newStatus === 'COMPLETED';

    setConfirmModal({
      isOpen: true,
      title: isDispatch ? `Dispatch Run ${trip.id}` : `Complete Delivery Run ${trip.id}`,
      message: isDispatch
        ? `Confirm departure of ${trip.vehicleRegistration} driven by ${trip.driverName} carrying ${formatWeight(trip.currentLoadKg)} consignment to zones: ${trip.deliveryZones.join(', ')}?`
        : `Mark delivery run ${trip.id} as completed? All ${trip.orderCount} customer deliveries will be marked fulfilled.`,
      variant: isComplete ? 'success' : 'primary',
      confirmLabel: isDispatch ? 'Dispatch Trip' : 'Mark Completed',
      action: async () => {
        await executeUpdateStatus(trip.id, newStatus);
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

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.vehicleRegistration.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.deliveryZones.some((z) => z.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [trips, debouncedSearch]);

  // Paginated records
  const totalPages = Math.ceil(filteredTrips.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTrips = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, safePage, pageSize]);

  const activeDeliveriesCount = trips.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'LOADING'
  ).length;

  const inTransitLoadKg = trips
    .filter((t) => t.status === 'IN_PROGRESS')
    .reduce((sum, t) => sum + t.currentLoadKg, 0);

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilter('ALL');
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Deliveries Management & Live Tracking"
        subtitle={`Manage and monitor delivery runs, destination zones, ${formatWeight(STANDARD_FLEET_CAPACITY_KG)} fleet capacity, and driver fulfillment`}
        breadcrumbs={[{ label: 'Core Operations' }, { label: 'Deliveries' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-truck"></i>
              <span>{activeDeliveriesCount} Active Delivery Runs</span>
            </span>
          </div>
        }
      >
        {/* Flash action message */}
        {actionMessage && (
          <div
            className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionMessage}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setActionMessage(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* Deliveries Overview KPI Row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Active Deliveries</span>
              <div className="fs-3 fw-bold text-dark">{activeDeliveriesCount}</div>
              <span className="badge badge-success-soft mt-1">Live En Route</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">In-Transit Freight Load</span>
              <div className="fs-3 fw-bold text-primary">{formatWeight(inTransitLoadKg)}</div>
              <span className="text-muted small">{formatWeight(STANDARD_FLEET_CAPACITY_KG)} Fleet Trucks</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">On-Time Fulfillment</span>
              <div className="fs-3 fw-bold text-success">98.8%</div>
              <span className="badge badge-info-soft mt-1">SLA Compliant</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Regional Scope</span>
              <div className="fs-3 fw-bold text-dark">{selectedCity}</div>
              <span className="text-muted small">Hub Delivery Terminals</span>
            </div>
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div className="overflow-x-auto pb-1">
            <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
              {DELIVERY_STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 ${
                    activeFilter === f.value
                      ? 'btn-ardab-primary shadow-sm'
                      : 'btn-outline-secondary bg-white border'
                  }`}
                  onClick={() => {
                    setActiveFilter(f.value);
                    setCurrentPage(1);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="d-flex gap-2 align-items-center align-self-end align-self-md-auto">
            <span className="text-muted small d-none d-sm-inline">Layout:</span>
            <div className="btn-group btn-group-sm bg-white border rounded-pill p-1 shadow-sm">
              <button
                type="button"
                className={`btn btn-sm rounded-pill ${
                  viewMode === 'cards' ? 'btn-ardab-primary' : 'btn-light border-0'
                }`}
                onClick={() => setViewMode('cards')}
                title="Cards View"
              >
                <i className="bi bi-grid-fill me-1"></i> Cards
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill ${
                  viewMode === 'table' ? 'btn-ardab-primary' : 'btn-light border-0'
                }`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <i className="bi bi-table me-1"></i> Table
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search deliveries by Trip ID (TRP-XXXX), vehicle, driver, or destination zone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search deliveries"
                />
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end">
              <span className="text-muted small">
                Showing <strong className="text-dark">{filteredTrips.length}</strong> delivery runs in {selectedCity}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode: Cards Grid */}
        {viewMode === 'cards' ? (
          <div className="row g-3 mb-4">
            {isLoading ? (
              <div className="col-12 text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                Loading delivery runs...
              </div>
            ) : paginatedTrips.length === 0 ? (
              <div className="col-12">
                <EmptyState
                  icon="bi-truck"
                  title="No delivery runs found"
                  description="No active trips match your selected status filter or search keywords."
                  actionLabel="Reset Filters"
                  onAction={handleResetFilters}
                />
              </div>
            ) : (
              paginatedTrips.map((trip) => (
                <div key={trip.id} className="col-12 col-md-6 col-xl-4">
                  <div className="ardab-card h-100 p-4 shadow-sm position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <div>
                        <span className="fw-bold text-dark fs-6">{trip.id}</span>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-clock me-1"></i>
                          {trip.startTime || trip.createdTime}
                        </div>
                      </div>
                      <span
                        className={`ardab-badge ${
                          trip.status === 'COMPLETED'
                            ? 'badge-success-soft'
                            : trip.status === 'IN_PROGRESS'
                            ? 'badge-info-soft'
                            : 'badge-warning-soft'
                        }`}
                      >
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Driver & Vehicle */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between text-muted small mb-1">
                        <span>Assigned Vehicle:</span>
                        <strong className="text-dark">{trip.vehicleRegistration}</strong>
                      </div>
                      <div className="d-flex justify-content-between text-muted small mb-1">
                        <span>Driver Name:</span>
                        <span className="fw-semibold text-dark">{trip.driverName}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted small mb-1">
                        <span>Regional Hub:</span>
                        <span className="text-dark">{trip.pickupHub}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted small">
                        <span>Orders in Consignment:</span>
                        <span className="fw-bold text-success">{trip.orderCount} orders</span>
                      </div>
                    </div>

                    {/* 5,000 KG Capacity Model Progress Bar */}
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <div className="d-flex justify-content-between align-items-center small mb-1">
                        <span className="text-muted">Load Capacity</span>
                        <span className="fw-bold text-dark">
                          {formatCapacity(trip.currentLoadKg, STANDARD_FLEET_CAPACITY_KG)}
                        </span>
                      </div>
                      <div className="ardab-progress mb-2" style={{ height: 8 }}>
                        <div
                          className="ardab-progress-bar bg-success"
                          style={{ width: `${trip.utilizationPercentage}%` }}
                        ></div>
                      </div>
                      <div
                        className="d-flex justify-content-between text-muted"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <span>{formatWeight(trip.remainingCapacityKg)} remaining</span>
                        <span className="fw-medium text-dark">{trip.city} Hub</span>
                      </div>
                    </div>

                    {/* Destination Zones */}
                    <div className="mb-3">
                      <span className="text-muted small d-block mb-1">Destination Zones:</span>
                      <div className="d-flex gap-1 flex-wrap">
                        {trip.deliveryZones.map((z) => (
                          <span
                            key={z}
                            className="badge badge-info-soft"
                            style={{ fontSize: '0.72rem' }}
                          >
                            <i className="bi bi-geo-alt me-1"></i>
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                      {canManageDeliveries && trip.status === 'LOADING' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-info text-white fw-semibold"
                          onClick={() => promptStatusChange(trip, 'IN_PROGRESS')}
                        >
                          <i className="bi bi-send me-1"></i> Dispatch Trip
                        </button>
                      )}
                      {canManageDeliveries && trip.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-semibold"
                          onClick={() => promptStatusChange(trip, 'COMPLETED')}
                        >
                          <i className="bi bi-check-all me-1"></i> Complete Trip
                        </button>
                      )}
                      {trip.status === 'COMPLETED' && (
                        <span className="text-muted small">
                          <i className="bi bi-check-circle-fill text-success me-1"></i> Completed
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-light border ms-auto"
                        onClick={() => setSelectedTrip(trip)}
                      >
                        Trip Details &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* View Mode: Table */
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Vehicle & Driver</th>
                    <th>City & Pickup Hub</th>
                    <th>Load ({formatWeight(STANDARD_FLEET_CAPACITY_KG)} Max)</th>
                    <th>Destination Zones</th>
                    <th>Status</th>
                    <th className="text-end">Manage</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : paginatedTrips.length > 0 ? (
                  <tbody>
                    {paginatedTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td>
                          <span className="fw-bold text-success">{trip.id}</span>
                          <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                            {trip.orderCount} orders
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{trip.driverName}</div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {trip.vehicleRegistration}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{trip.city}</div>
                          <div
                            className="text-muted small text-truncate"
                            style={{ maxWidth: 180, fontSize: '0.75rem' }}
                          >
                            {trip.pickupHub}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{formatWeight(trip.currentLoadKg)}</div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {trip.utilizationPercentage}% full
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap" style={{ maxWidth: 200 }}>
                            {trip.deliveryZones.map((z) => (
                              <span
                                key={z}
                                className="badge badge-info-soft"
                                style={{ fontSize: '0.7rem' }}
                              >
                                {z}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`ardab-badge ${
                              trip.status === 'COMPLETED'
                                ? 'badge-success-soft'
                                : trip.status === 'IN_PROGRESS'
                                ? 'badge-info-soft'
                                : 'badge-warning-soft'
                            }`}
                          >
                            {trip.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {canManageDeliveries && trip.status === 'LOADING' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-info text-white fw-semibold"
                                onClick={() => promptStatusChange(trip, 'IN_PROGRESS')}
                                title="Dispatch Run"
                              >
                                <i className="bi bi-send"></i>
                              </button>
                            )}
                            {canManageDeliveries && trip.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success fw-semibold"
                                onClick={() => promptStatusChange(trip, 'COMPLETED')}
                                title="Complete Run"
                              >
                                <i className="bi bi-check-all"></i>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              onClick={() => setSelectedTrip(trip)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i> Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : null}
              </table>

              {!isLoading && paginatedTrips.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    icon="bi-truck"
                    title="No delivery runs found"
                    description="No active trips match your selected status filter or search keywords."
                    actionLabel="Reset Filters"
                    onAction={handleResetFilters}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Server-ready Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredTrips.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />

        {/* Modal: Trip Details */}
        {selectedTrip && (
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
                      Delivery Run &mdash; {selectedTrip.id}
                    </h5>
                    <span className="text-muted small">
                      {selectedTrip.city} Hub &bull; {selectedTrip.vehicleRegistration} &bull; Driver:{' '}
                      {selectedTrip.driverName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedTrip(null)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {/* Status & Capacity Card */}
                  <div className="p-3 bg-light rounded-3 border mb-4">
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <span className="text-muted small d-block">Run Status</span>
                        <span
                          className={`ardab-badge ${
                            selectedTrip.status === 'COMPLETED'
                              ? 'badge-success-soft'
                              : selectedTrip.status === 'IN_PROGRESS'
                              ? 'badge-info-soft'
                              : 'badge-warning-soft'
                          }`}
                        >
                          {selectedTrip.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="col-6 col-md-3">
                        <span className="text-muted small d-block">Consignment Weight</span>
                        <strong className="text-dark fs-6">
                          {formatWeight(selectedTrip.currentLoadKg)}
                        </strong>
                      </div>
                      <div className="col-6 col-md-3">
                        <span className="text-muted small d-block">Fleet Max Capacity</span>
                        <strong className="text-primary fs-6">
                          {formatWeight(STANDARD_FLEET_CAPACITY_KG)}
                        </strong>
                      </div>
                      <div className="col-6 col-md-3">
                        <span className="text-muted small d-block">Utilization</span>
                        <strong className="text-success fs-6">
                          {selectedTrip.utilizationPercentage}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Destination Zones */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-dark mb-2">
                      <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                      Target Delivery Zones
                    </h6>
                    <div className="d-flex gap-2 flex-wrap">
                      {selectedTrip.deliveryZones.map((z) => (
                        <span key={z} className="badge bg-white text-dark border p-2 shadow-sm">
                          <i className="bi bi-pin-map me-1 text-primary"></i>
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Consignment Orders in this trip */}
                  <div>
                    <h6 className="fw-bold text-dark mb-2">
                      <i className="bi bi-box-seam text-primary me-2"></i>
                      Consignment Orders ({selectedTrip.orderIds.length})
                    </h6>
                    <div className="table-responsive border rounded-3">
                      <table className="table table-sm table-hover mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th className="p-2 ps-3">Order ID</th>
                            <th className="p-2">Hub Action</th>
                            <th className="p-2 text-end pe-3">Consignment Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrip.orderIds.map((ordId) => (
                            <tr key={ordId}>
                              <td className="p-2 ps-3 fw-bold text-success">{ordId}</td>
                              <td className="p-2">
                                <span className="badge badge-success-soft">Staged in Truck</span>
                              </td>
                              <td className="p-2 text-end pe-3">
                                <span className="text-muted small">Assigned &bull; In Route</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    {canManageDeliveries && selectedTrip.status === 'LOADING' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-info text-white"
                        onClick={() => promptStatusChange(selectedTrip, 'IN_PROGRESS')}
                      >
                        <i className="bi bi-send me-1"></i> Dispatch Trip Now
                      </button>
                    )}
                    {canManageDeliveries && selectedTrip.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => promptStatusChange(selectedTrip, 'COMPLETED')}
                      >
                        <i className="bi bi-check-all me-1"></i> Mark Trip Completed
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ardab-outline"
                    onClick={() => setSelectedTrip(null)}
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
          isLoading={isConfirming}
          onConfirm={handleConfirmModalAction}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </PageContainer>
    </AdminLayout>
  );
}
