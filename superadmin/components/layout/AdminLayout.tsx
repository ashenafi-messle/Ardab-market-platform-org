'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import MobileNavigation from './MobileNavigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="ardab-app-layout">
      {/* Desktop Persistent Sidebar */}
      <aside className="ardab-sidebar d-none d-lg-flex">
        <AdminSidebar />
      </aside>

      {/* Mobile Offcanvas Navigation */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="ardab-main-wrapper">
        <AdminHeader onToggleMobileMenu={() => setIsMobileNavOpen(true)} />
        <main className="ardab-content">{children}</main>
        <footer className="py-2 px-4 border-top bg-white d-flex flex-column flex-sm-row align-items-center justify-content-between text-muted small mt-auto" style={{ fontSize: '0.75rem' }}>
          <div>&copy; {new Date().getFullYear()} Ardab Market Platform. All rights reserved.</div>
          <div className="fw-semibold text-secondary">Powered by Ardab Tech Solutions S.C.</div>
        </footer>
      </div>
    </div>
  );
}
