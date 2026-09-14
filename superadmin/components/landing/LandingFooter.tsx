'use client';

import React from 'react';
import Link from 'next/link';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function LandingFooter() {
  return (
    <footer className="py-5 bg-white border-top">
      <div className="container">
        <div className="row g-4 align-items-center justify-content-between">
          <div className="col-md-6 text-center text-md-start">
            <div className="mb-2">
              <ArdabLogo size={36} textSize="fs-5" href="/" />
            </div>
            <p className="text-muted small mb-0">
              City-based smart marketplace and delivery platform in Ethiopia. 
              Connecting trade, technology, and centralized fleet operations in Gondar, Bahir Dar, and Addis Ababa.
            </p>
          </div>

          <div className="col-md-5 text-center text-md-end">
            <div className="d-flex align-items-center justify-content-center justify-content-md-end gap-3 mb-2">
              <Link href="/login" className="btn btn-sm btn-ardab-outline">
                Admin Login
              </Link>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              &copy; {new Date().getFullYear()} Ardab Market Platform. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
