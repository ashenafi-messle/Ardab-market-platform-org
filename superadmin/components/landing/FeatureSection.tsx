'use client';

import React from 'react';

const FEATURES = [
  {
    icon: 'bi-shop',
    color: 'icon-box-green',
    title: 'Smart Marketplace',
    description:
      'Curated Ethiopian staple foods, grains, teff, coffee, honey, and cooking oils with exact unit weights and regional availability.',
  },
  {
    icon: 'bi-receipt-cutoff',
    color: 'icon-box-teal',
    title: 'Centralized Orders',
    description:
      '8-stage transparent order lifecycle with automated Telebirr and CBE Birr payment reconciliation and dispatch coordination.',
  },
  {
    icon: 'bi-truck',
    color: 'icon-box-info',
    title: '5,000 KG Fleet Capacity',
    description:
      'Ardab owns and operates dedicated 5-tonne cargo vehicles. Load optimization ensures high utilization and zero empty runs.',
  },
  {
    icon: 'bi-geo-alt',
    color: 'icon-box-warning',
    title: 'City-Based Operations',
    description:
      'Localized logistics hubs in Gondar, Bahir Dar, and Addis Ababa with tiered neighborhood zones and structured delivery fees.',
  },
  {
    icon: 'bi-people',
    color: 'icon-box-green',
    title: 'Internal Logistics Staff',
    description:
      'Full-time employed drivers and warehouse staff with dedicated vehicle assignments, performance tracking, and high safety standards.',
  },
  {
    icon: 'bi-graph-up',
    color: 'icon-box-teal',
    title: 'Business & Financial Telemetry',
    description:
      'Real-time revenue monitoring, vehicle capacity utilization metrics, city-by-city performance analytics, and audit logs.',
  },
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-5 py-lg-6 bg-white border-top border-bottom">
      <div className="container py-4">
        <div className="text-center max-w-700 mx-auto mb-5">
          <span className="badge badge-success-soft mb-2">OPERATIONAL CAPABILITIES</span>
          <h2 className="display-6 fw-bold text-dark mb-3">
            Designed for Modern Ethiopian Commerce
          </h2>
          <p className="text-muted lead fs-6">
            A single, centralized management platform connecting marketplace inventory, 
            customer demand, and Ardab&apos;s heavy-duty 5,000 KG delivery fleet.
          </p>
        </div>

        <div className="row g-4">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="col-md-6 col-lg-4">
              <div className="ardab-card ardab-card-hover h-100 p-4">
                <div className={`ardab-icon-box ${feat.color} mb-3`}>
                  <i className={`bi ${feat.icon}`}></i>
                </div>
                <h3 className="h5 fw-bold text-dark mb-2">{feat.title}</h3>
                <p className="text-muted small mb-0">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
