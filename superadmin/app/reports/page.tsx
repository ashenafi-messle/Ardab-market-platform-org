'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { reportsApi } from '@/lib/api';
import { SalesByCity, SalesByCategory, OperationalPerformance } from '@/types/report';

export default function ReportsPage() {
  const [salesCity, setSalesCity] = useState<SalesByCity[]>([]);
  const [salesCat, setSalesCat] = useState<SalesByCategory[]>([]);
  const [perf, setPerf] = useState<OperationalPerformance | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      reportsApi.getSalesByCity(),
      reportsApi.getSalesByCategory(),
      reportsApi.getOperationalPerformance(),
    ]).then(([cRes, catRes, pRes]) => {
      if (isMounted) {
        setSalesCity(cRes);
        setSalesCat(catRes);
        setPerf(pRes);
      }
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminLayout>
      <PageContainer
        title="Operational Analytics & Reports"
        subtitle="Regional market demand, delivery success metrics, and 5,000 KG fleet capacity utilization"
        breadcrumbs={[{ label: 'Business' }, { label: 'Reports & Analytics' }]}
      >
        {/* Core Operational KPIs */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Delivery Success Rate</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-success">
                  {perf?.deliverySuccessRate || 98.7}%
                </h3>
                <span className="badge badge-success-soft">Exceptional</span>
              </div>
              <div className="text-muted small mt-1">Verified doorstep handovers</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Avg. Delivery Dispatch Time</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {perf?.avgDeliveryTimeMinutes || 42} min
                </h3>
                <span className="badge badge-info-soft">-6m vs target</span>
              </div>
              <div className="text-muted small mt-1">Order confirmation to vehicle departure</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Fleet Capacity Utilization</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {perf?.fleetCapacityUtilization || 86.4}%
                </h3>
                <span className="badge badge-success-soft">High Efficiency</span>
              </div>
              <div className="text-muted small mt-1">5,000 KG truck load optimization</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Customer MoM Growth</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-success">
                  +{perf?.customerGrowthRate || 15.8}%
                </h3>
                <span className="badge badge-success-soft">Monthly Active</span>
              </div>
              <div className="text-muted small mt-1">Organic Ethiopian merchant adoption</div>
            </div>
          </div>
        </div>

        {/* Sales by City (Gondar, Bahir Dar, Addis Ababa) */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">Sales & Fulfillment by City</h2>
                  <span className="text-muted small">Regional revenue share</span>
                </div>
                <span className="badge badge-success-soft">3 Active Hubs</span>
              </div>

              <div className="d-flex flex-column gap-3">
                {salesCity.map((item) => (
                  <div key={item.city} className="p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-dark">{item.city} Regional Hub</strong>
                      <span className="fw-bold text-dark">
                        {(item.revenueEtb / 1000000).toFixed(2)}M ETB
                      </span>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                      <span>{item.orderCount} Orders fulfilled</span>
                      <span className="text-success fw-medium">
                        {item.deliveredPercentage}% success
                      </span>
                    </div>
                    <div className="ardab-progress">
                      <div
                        className="ardab-progress-bar bg-success"
                        style={{ width: `${item.deliveredPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sales by Category & Weight Delivered */}
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">Marketplace Commodity Breakdown</h2>
                  <span className="text-muted small">Tonnage delivered via 5,000 KG fleet</span>
                </div>
                <span className="badge badge-info-soft">By Weight (KG)</span>
              </div>

              <div className="d-flex flex-column gap-3">
                {salesCat.map((cat) => (
                  <div key={cat.category} className="mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-medium text-dark">{cat.category}</span>
                      <span className="text-muted">
                        <strong className="text-dark">{(cat.weightSoldKg / 1000).toFixed(1)} Tonnes</strong> ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="ardab-progress mb-1">
                      <div
                        className="ardab-progress-bar bg-teal"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: 'var(--ardab-teal)',
                        }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-end text-muted" style={{ fontSize: '0.7rem' }}>
                      Revenue: {(cat.revenueEtb / 1000).toFixed(0)}k ETB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
