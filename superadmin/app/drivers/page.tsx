'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { fleetApi } from '@/lib/api';
import { Driver } from '@/types/driver';

export default function DriversPage() {
  const { selectedCity } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    fleetApi.getDrivers(selectedCity).then((res) => {
      if (isMounted) setDrivers(res);
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const filteredDrivers = drivers.filter((d) => {
    return (
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <AdminLayout>
      <PageContainer
        title="Logistics Staff & Drivers"
        subtitle="Full-time Ardab logistics personnel &bull; Vehicle assignments & delivery performance"
        breadcrumbs={[{ label: 'Fleet' }, { label: 'Drivers' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-success-soft">Directly Employed Staff</span>
          </div>
        }
      >
        {/* Search */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search drivers by name, phone (+251...), or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6 d-flex align-items-center justify-content-md-end text-muted small">
              Showing {filteredDrivers.length} internal logistics drivers
            </div>
          </div>
        </div>

        {/* Drivers Grid */}
        <div className="row g-4">
          {filteredDrivers.map((driver) => (
            <div key={driver.id} className="col-12 col-md-6 col-xl-4">
              <div className="ardab-card ardab-card-hover h-100 p-4">
                <div className="d-flex align-items-start justify-content-between mb-3 pb-2 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{ width: 44, height: 44, backgroundColor: 'var(--ardab-green)' }}
                    >
                      {driver.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="h6 fw-bold text-dark mb-0">{driver.name}</h3>
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        ID: {driver.id} &bull; {driver.city} Hub
                      </span>
                    </div>
                  </div>
                  <span
                    className={`ardab-badge ${
                      driver.status === 'ON_TRIP'
                        ? 'badge-info-soft'
                        : driver.status === 'ACTIVE'
                        ? 'badge-success-soft'
                        : 'badge-neutral-soft'
                    }`}
                  >
                    {driver.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Assigned Vehicle & Current Trip */}
                <div className="p-3 bg-light rounded-3 border mb-3 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Assigned Truck:</span>
                    <strong className="text-dark">
                      {driver.assignedVehicleReg ? `${driver.assignedVehicleReg} (${driver.assignedVehicleId})` : 'Standby'}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Active Trip:</span>
                    <span className="fw-semibold text-success">
                      {driver.currentTripId || 'No active trip'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Contact:</span>
                    <span className="text-dark fw-medium">{driver.phone}</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="row g-2 text-center mb-3">
                  <div className="col-4">
                    <div className="p-2 border rounded-2 bg-white">
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED</div>
                      <div className="fw-bold text-dark">{driver.completedDeliveriesCount}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded-2 bg-white">
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>ACTIVE RUNS</div>
                      <div className="fw-bold text-success">{driver.activeDeliveriesCount}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded-2 bg-white">
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>ON-TIME</div>
                      <div className="fw-bold text-primary">{driver.onTimeDeliveryRate}%</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted small" style={{ fontSize: '0.75rem' }}>
                  <span>Rating: <strong className="text-dark">&starf; {driver.rating}</strong></span>
                  <Link href="/trips" className="text-success fw-semibold text-decoration-none">
                    View Trip Logs &rarr;
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
