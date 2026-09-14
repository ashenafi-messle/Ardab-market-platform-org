'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="py-5 py-lg-6" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, var(--ardab-background) 100%)' }}>
      <div className="container py-4">
        <div className="row align-items-center g-5">
          {/* Left Column: Heading & CTAs */}
          <div className="col-lg-7 text-center text-lg-start">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-3 rounded-pill bg-white border shadow-sm">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle p-1"
                style={{ width: 24, height: 24, overflow: 'hidden' }}
              >
                <Image src="/logo.jpg" alt="Logo" width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="badge" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.7rem' }}>ETHIOPIA</span>
              <span className="small text-muted">Gondar &bull; Bahir Dar &bull; Addis Ababa</span>
            </div>

            <h1 className="display-4 fw-bold text-dark mb-3 lh-sm">
              <span style={{ color: '#dc2626' }}>Ardab</span>{' '}
              <span style={{ color: '#00873e' }}>Market</span>.{' '}
              <span className="text-dark">Smarter Delivery.</span>
            </h1>

            <p className="lead text-muted mb-4 pe-lg-4" style={{ fontSize: '1.15rem' }}>
              Ardab Market is Ethiopia&apos;s city-based smart marketplace and delivery platform. 
              We connect digital marketplace operations with centralized logistics management, 
              delivering with our owned 5,000 KG capacity fleet to power modern Ethiopian trade.
            </p>

            <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center justify-content-lg-start gap-3">
              <Link href="/login" className="btn btn-ardab-primary btn-lg px-4 py-3 d-flex align-items-center gap-2">
                <i className="bi bi-shield-lock-fill"></i>
                <span>Super Admin Portal</span>
              </Link>
              <a href="#features" className="btn btn-ardab-outline btn-lg px-4 py-3 d-flex align-items-center gap-2">
                <span>Explore Platform Capabilities</span>
                <i className="bi bi-arrow-down"></i>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="row g-3 mt-4 pt-3 border-top text-start">
              <div className="col-4">
                <div className="fw-bold fs-4 text-dark">5,000 KG</div>
                <div className="text-muted small">Standard Vehicle Capacity</div>
              </div>
              <div className="col-4">
                <div className="fw-bold fs-4 text-dark">3 Hubs</div>
                <div className="text-muted small">Gondar, Bahir Dar, Addis Ababa</div>
              </div>
              <div className="col-4">
                <div className="fw-bold fs-4 text-dark">98.7%</div>
                <div className="text-muted small">On-Time Delivery Rate</div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Operational Card */}
          <div className="col-lg-5">
            <div className="ardab-card shadow-md p-4 position-relative border">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="ardab-icon-box icon-box-green" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                    <i className="bi bi-speedometer2"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Central Dispatch Telemetry</div>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>Live Operational Sync</span>
                  </div>
                </div>
                <span className="badge badge-success-soft">ACTIVE TRIPS</span>
              </div>

              {/* Sample Active Trip Preview */}
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-dark">Trip TRP-1042</span>
                  <span className="badge badge-info-soft">IN TRANSIT</span>
                </div>
                <div className="text-muted small mb-2">Vehicle ARD-001 &bull; Driver Bekele T.</div>

                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Load Capacity</span>
                  <span className="fw-semibold text-dark">4,350 KG / 5,000 KG (87%)</span>
                </div>
                <div className="ardab-progress mb-2">
                  <div className="ardab-progress-bar bg-success" style={{ width: '87%' }}></div>
                </div>

                <div className="d-flex justify-content-between small text-muted">
                  <span>12 Consolidated Orders</span>
                  <span className="text-success fw-medium">Arada Central Zone</span>
                </div>
              </div>

              {/* City Multi-Hub Tags */}
              <div className="row g-2">
                <div className="col-4">
                  <div className="p-2 border rounded-3 text-center bg-white">
                    <div className="fw-bold text-dark small">Gondar</div>
                    <span className="badge badge-success-soft" style={{ fontSize: '0.65rem' }}>Active Hub</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 text-center bg-white">
                    <div className="fw-bold text-dark small">Bahir Dar</div>
                    <span className="badge badge-success-soft" style={{ fontSize: '0.65rem' }}>Active Hub</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 text-center bg-white">
                    <div className="fw-bold text-dark small">Addis Ababa</div>
                    <span className="badge badge-success-soft" style={{ fontSize: '0.65rem' }}>Active Hub</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
