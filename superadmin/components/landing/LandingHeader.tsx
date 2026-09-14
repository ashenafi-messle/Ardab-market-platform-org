'use client';

import React from 'react';
import Link from 'next/link';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function LandingHeader() {
  return (
    <header className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
      <div className="container">
        {/* Brand */}
        <ArdabLogo size={44} textSize="fs-4" href="/" subtitle="ETHIOPIA PLATFORM" />

        {/* Action Button */}
        <div className="d-flex align-items-center gap-3">
          <Link href="/login" className="btn btn-ardab-primary d-flex align-items-center gap-2">
            <i className="bi bi-shield-lock"></i>
            <span>Admin Login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
