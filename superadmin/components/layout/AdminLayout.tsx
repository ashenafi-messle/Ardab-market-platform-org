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
      </div>
    </div>
  );
}
