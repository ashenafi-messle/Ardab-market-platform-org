'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { fleetApi } from '@/lib/api';
import { Trip, TripStatus } from '@/types/trip';

export default function TripsPage() {
  const { selectedCity } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'ALL'>('ALL');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    let isMounted = true;
    fleetApi.getTrips(selectedCity, statusFilter).then((res) => {
      if (isMounted) setTrips(res);
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity, statusFilter]);

  return (
    <AdminLayout>
      <PageContainer
        title="Fleet Trips Dispatch"
        subtitle="Multi-order consolidation journeys &bull; 5,000 KG truck capacity optimization and route execution"
        breadcrumbs={[{ label: 'Fleet' }, { label: 'Trips' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-info-soft">Multi-Order Batching</span>
          </div>
        }
      >
        {/* Status Filter Tabs */}
        <div className="mb-4 d-flex gap-2 flex-wrap">
          {['ALL', 'IN_PROGRESS', 'LOADING', 'READY', 'COMPLETED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                statusFilter === st
                  ? 'btn-ardab-primary'
                  : 'btn-outline-secondary bg-white border'
              }`}
              onClick={() => setStatusFilter(st as TripStatus | 'ALL')}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Trips Table (Desktop) */}
        <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden">
          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Vehicle & Driver</th>
                  <th>Hub & City</th>
                  <th>Orders</th>
                  <th>Load / 5,000 KG</th>
                  <th>Delivery Zones</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td>
                      <span className="fw-bold text-dark">{trip.id}</span>
                      <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        {trip.createdTime}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">
                        {trip.vehicleRegistration} ({trip.vehicleId})
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {trip.driverName} &bull; {trip.driverPhone}
                      </div>
                    </td>
                    <td>
                      <div className="text-dark fw-medium">{trip.city}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {trip.pickupHub}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info-soft fs-6">
                        {trip.orderCount} orders
                      </span>
                    </td>
                    <td style={{ minWidth: '180px' }}>
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>{trip.currentLoadKg.toLocaleString()} KG</span>
                        <span className="fw-semibold text-dark">{trip.utilizationPercentage}%</span>
                      </div>
                      <div className="ardab-progress mb-1">
                        <div
                          className="ardab-progress-bar bg-success"
                          style={{ width: `${trip.utilizationPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {trip.remainingCapacityKg.toLocaleString()} KG remaining
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {trip.deliveryZones.map((z) => (
                          <span
                            key={z}
                            className="badge bg-light text-dark border"
                            style={{ fontSize: '0.65rem' }}
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
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => setSelectedTrip(trip)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trips Cards (Mobile) */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {trips.map((trip) => (
            <div key={trip.id} className="ardab-card p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark fs-6">{trip.id}</span>
                <span
                  className={`ardab-badge ${
                    trip.status === 'COMPLETED'
                      ? 'badge-success-soft'
                      : trip.status === 'IN_PROGRESS'
                      ? 'badge-info-soft'
                      : 'badge-warning-soft'
                  }`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {trip.status.replace('_', ' ')}
                </span>
              </div>

              <div className="text-dark fw-medium small mb-1">
                {trip.vehicleRegistration} &bull; {trip.driverName}
              </div>
              <div className="text-muted small mb-3" style={{ fontSize: '0.75rem' }}>
                {trip.city} Hub &bull; {trip.orderCount} Orders Consolidated
              </div>

              {/* 5000 KG capacity bar */}
              <div className="p-2 bg-light rounded-3 border mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Load (5,000 KG Model)</span>
                  <span className="fw-bold text-dark">
                    {trip.currentLoadKg.toLocaleString()} KG ({trip.utilizationPercentage}%)
                  </span>
                </div>
                <div className="ardab-progress mb-1">
                  <div
                    className="ardab-progress-bar bg-success"
                    style={{ width: `${trip.utilizationPercentage}%` }}
                  ></div>
                </div>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {trip.remainingCapacityKg.toLocaleString()} KG buffer remaining
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <span className="text-muted small">{trip.startTime || trip.createdTime}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setSelectedTrip(trip)}
                >
                  Trip Breakdown &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>

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
                    <h5 className="modal-title fw-bold text-dark">
                      Consolidated Trip Run &mdash; {selectedTrip.id}
                    </h5>
                    <span className="text-muted small">
                      {selectedTrip.city} Central Hub Distribution
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedTrip(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <span className="text-muted small">Vehicle Details</span>
                        <div className="fw-bold text-dark">{selectedTrip.vehicleRegistration}</div>
                        <div className="text-muted small">Truck ID: {selectedTrip.vehicleId}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <span className="text-muted small">Assigned Driver</span>
                        <div className="fw-bold text-dark">{selectedTrip.driverName}</div>
                        <div className="text-muted small">Phone: {selectedTrip.driverPhone}</div>
                      </div>
                    </div>
                  </div>

                  {/* 5,000 KG Capacity Model Stats */}
                  <div className="p-3 border rounded-3 bg-white mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-dark">5,000 KG Trip Capacity Model</span>
                      <span className="badge badge-success-soft">
                        {selectedTrip.utilizationPercentage}% FULL
                      </span>
                    </div>
                    <div className="row g-2 text-center mb-2">
                      <div className="col-4">
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted small" style={{ fontSize: '0.7rem' }}>CURRENT LOAD</span>
                          <div className="fw-bold text-dark">{selectedTrip.currentLoadKg} KG</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted small" style={{ fontSize: '0.7rem' }}>MAX CAPACITY</span>
                          <div className="fw-bold text-dark">5,000 KG</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted small" style={{ fontSize: '0.7rem' }}>REMAINING</span>
                          <div className="fw-bold text-success">{selectedTrip.remainingCapacityKg} KG</div>
                        </div>
                      </div>
                    </div>
                    <div className="ardab-progress">
                      <div
                        className="ardab-progress-bar bg-success"
                        style={{ width: `${selectedTrip.utilizationPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <h6 className="fw-bold text-dark mb-2">
                      Consolidated Orders in Journey ({selectedTrip.orderCount})
                    </h6>
                    <div className="d-flex gap-2 flex-wrap mb-3">
                      {selectedTrip.orderIds.map((oid) => (
                        <Link
                          key={oid}
                          href="/orders"
                          className="badge bg-light text-dark border p-2 text-decoration-none"
                        >
                          <i className="bi bi-receipt me-1 text-success"></i>
                          {oid}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h6 className="fw-bold text-dark mb-2">Destination Delivery Zones</h6>
                    <div className="d-flex gap-1 flex-wrap">
                      {selectedTrip.deliveryZones.map((z) => (
                        <span key={z} className="badge badge-info-soft">
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-ardab-outline btn-sm"
                    onClick={() => setSelectedTrip(null)}
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
