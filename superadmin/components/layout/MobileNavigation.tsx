'use client';

import React from 'react';
import AdminSidebar from './AdminSidebar';
import ArdabLogo from '@/components/common/ArdabLogo';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Offcanvas Drawer */}
      <div
        className="position-fixed top-0 start-0 h-100 bg-white shadow-lg d-flex flex-column"
        style={{
          width: '280px',
          maxWidth: '85vw',
          zIndex: 1050,
          animation: 'slideIn 0.25s ease-out',
        }}
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
          <ArdabLogo size={34} textSize="fs-6" />
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>

        <div className="flex-grow-1 overflow-y-auto">
          <AdminSidebar onItemClick={onClose} />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
