'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { fleetApi } from '@/lib/api';
import { Vehicle } from '@/types/vehicle';

export default function VehiclesPage() {
  const { selectedCity } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    fleetApi.getVehicles(selectedCity).then((res) => {
      if (isMounted) setVehicles(res);
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    return true;
  });

  const totalFleetCapacity = vehicles.reduce((sum, v) => sum + v.capacityKg, 0);
  const totalFleetLoad = vehicles.reduce((sum, v) => sum + v.currentLoadKg, 0);
  const avgUtilization = totalFleetCapacity > 0 ? Math.round((totalFleetLoad / totalFleetCapacity) * 100) : 0;

  return (
    <AdminLayout>
      <PageContainer
        title="Fleet Vehicle Capacity Management"
        subtitle="Ardab-owned heavy cargo fleet &bull; 5,000 KG standard capacity per vehicle model"
        breadcrumbs={[{ label: 'Fleet' }, { label: 'Vehicles' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-success-soft">Company Owned Fleet</span>
            <Link href="/trips" className="btn btn-sm btn-ardab-primary">
              <i className="bi bi-plus-circle me-1"></i> New Trip Run
            </Link>
          </div>
        }
      >
        {/* Fleet KPI Metric Bar */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3">
              <span className="text-muted small">Active Fleet Count</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">{vehicles.length} Trucks</h3>
                <span className="badge badge-success-soft">5,000 KG each</span>
              </div>
              <div className="text-muted small mt-1">Operating in {selectedCity}</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3">
              <span className="text-muted small">Total Weight Capacity</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {(totalFleetCapacity / 1000).toFixed(0)} Metric Tonnes
                </h3>
                <span className="badge badge-info-soft">{totalFleetCapacity.toLocaleString()} KG</span>
              </div>
              <div className="text-muted small mt-1">
                Active load: {totalFleetLoad.toLocaleString()} KG
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3">
              <span className="text-muted small">Fleet Utilization Rate</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-success">{avgUtilization}%</h3>
                <span className="badge badge-success-soft">Optimal efficiency</span>
              </div>
              <div className="text-muted small mt-1">
                {(totalFleetCapacity - totalFleetLoad).toLocaleString()} KG remaining buffer
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-4 d-flex gap-2 flex-wrap">
          {['ALL', 'ON_TRIP', 'LOADING', 'AVAILABLE', 'MAINTENANCE'].map((status) => (
            <button
              key={status}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                statusFilter === status
                  ? 'btn-ardab-primary'
                  : 'btn-outline-secondary bg-white border'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Vehicle Cards Grid - Strictly highlighting 5,000 KG capacity model */}
        <div className="row g-4 mb-4">
          {filteredVehicles.map((v) => (
            <div key={v.id} className="col-12 col-md-6 col-xl-4">
              <div className="ardab-card ardab-card-hover h-100 p-4">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-dark fs-5">{v.id}</span>
                      <span className="badge bg-light text-dark border">{v.city}</span>
                    </div>
                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      {v.registrationNumber} &bull; {v.model}
                    </span>
                  </div>
                  <span
                    className={`ardab-badge ${
                      v.status === 'ON_TRIP'
                        ? 'badge-info-soft'
                        : v.status === 'LOADING'
                        ? 'badge-warning-soft'
                        : v.status === 'AVAILABLE'
                        ? 'badge-success-soft'
                        : 'badge-danger-soft'
                    }`}
                  >
                    {v.status.replace('_', ' ')}
                  </span>
                </div>

                {/* 5,000 KG Capacity Box */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="d-flex justify-content-between align-items-center small mb-1">
                    <span className="text-muted fw-medium">Capacity Model:</span>
                    <strong className="text-dark">
                      {v.currentLoadKg.toLocaleString()} KG / {v.capacityKg.toLocaleString()} KG
                    </strong>
                  </div>
                  <div className="ardab-progress mb-2">
                    <div
                      className={`ardab-progress-bar ${
                        v.utilizationPercentage > 85
                          ? 'bg-success'
                          : v.utilizationPercentage > 50
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                      style={{ width: `${v.utilizationPercentage}%` }}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                    <span className="fw-bold text-dark">{v.utilizationPercentage}% utilized</span>
                    <span>{v.remainingCapacityKg.toLocaleString()} KG remaining</span>
                  </div>
                </div>

                {/* Driver & Location Specs */}
                <div className="mb-3 small">
                  <div className="d-flex justify-content-between text-muted mb-1">
                    <span>Assigned Driver:</span>
                    <span className="fw-semibold text-dark">
                      {v.assignedDriverName || 'No Driver Assigned'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted mb-1">
                    <span>Active Trip ID:</span>
                    <span className="text-success fw-medium">
                      {v.currentTripId || 'Stationed at Depot'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted mb-1">
                    <span>Current Route:</span>
                    <span className="text-dark text-truncate" style={{ maxWidth: '180px' }}>
                      {v.currentLocation}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted">
                    <span>Fuel Level:</span>
                    <span className="fw-medium text-dark">{v.fuelLevelPercentage}%</span>
                  </div>
                </div>

                {/* Footer Maintenance Information */}
                <div className="pt-2 border-top d-flex justify-content-between align-items-center text-muted small" style={{ fontSize: '0.75rem' }}>
                  <span>Next Service: {v.nextMaintenanceDate}</span>
                  <Link href="/trips" className="text-success fw-semibold text-decoration-none">
                    View Trips &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
