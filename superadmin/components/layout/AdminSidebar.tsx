'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ArdabLogo from '@/components/common/ArdabLogo';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

// Super Admin 5 Core Functions Navigation
export const SUPER_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'bi-speedometer2' },
    ],
  },
  {
    groupTitle: 'MARKETPLACE',
    items: [
      { label: 'Products', href: '/products', icon: 'bi-box-seam' },
      { label: 'Suppliers', href: '/suppliers', icon: 'bi-building-gear', badge: 'Registered' },
    ],
  },
  {
    groupTitle: 'OPERATIONS',
    items: [
      { label: 'Customers', href: '/customers', icon: 'bi-people' },
      { label: 'Incoming Orders', href: '/orders', icon: 'bi-receipt', badge: 'Incoming' },
      { label: 'Deliveries', href: '/deliveries', icon: 'bi-truck-front' },
    ],
  },
];

// Sub Admin 4 Core Functions Navigation
export const SUB_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: 'MAIN',
    items: [
      { label: 'Sub Admin Dashboard', href: '/subadmin/dashboard', icon: 'bi-speedometer2' },
    ],
  },
  {
    groupTitle: 'MARKETPLACE TAXONOMY',
    items: [
      { label: 'Product Categories', href: '/subadmin/categories', icon: 'bi-diagram-3', badge: 'Tree' },
    ],
  },
  {
    groupTitle: 'CLIENT CARE',
    items: [
      { label: 'Customer Support', href: '/subadmin/support', icon: 'bi-headset', badge: 'Queue' },
      { label: 'Feedback Management', href: '/subadmin/feedback', icon: 'bi-chat-square-heart', badge: 'Reviews' },
    ],
  },
  {
    groupTitle: 'SYSTEM & SECURITY',
    items: [
      { label: 'Security & Super Admins', href: '/subadmin/security', icon: 'bi-shield-lock-check', badge: 'Admins' },
      { label: 'Maintenance Management', href: '/subadmin/maintenance', icon: 'bi-wrench-adjustable', badge: 'Active' },
    ],
  },
];

interface AdminSidebarProps {
  onItemClick?: () => void;
}

export default function AdminSidebar({ onItemClick }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isSubAdmin = user?.role === 'SUB_ADMIN' || pathname.startsWith('/subadmin');
  const activeNavGroups = isSubAdmin ? SUB_ADMIN_NAV_GROUPS : SUPER_ADMIN_NAV_GROUPS;

  return (
    <div className="d-flex flex-column h-100">
      {/* Brand Header */}
      <div className="p-3 px-4 d-flex align-items-center justify-content-between border-bottom" style={{ height: 'var(--ardab-header-height)' }}>
        <ArdabLogo
          size={42}
          href={isSubAdmin ? '/subadmin/dashboard' : '/dashboard'}
          badgeType={isSubAdmin ? 'sub' : 'super'}
        />
      </div>

      {/* Navigation Links */}
      <div className="flex-grow-1 overflow-y-auto py-2">
        {activeNavGroups.map((group) => (
          <div key={group.groupTitle} className="mb-2">
            <div className="sidebar-section-title">{group.groupTitle}</div>
            {group.items.map((item) => {
              const isDashboard = item.href === '/dashboard' || item.href === '/subadmin/dashboard';
              const isActive = isDashboard ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={`sidebar-nav-link text-decoration-none ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="flex-grow-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`badge ${
                        item.badge === 'Queue' || item.badge === 'Incoming'
                          ? 'badge-warning-soft'
                          : item.badge === 'All Over' || item.badge === 'Live'
                          ? 'badge-info-soft'
                          : 'badge-success-soft'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Role Switcher or Mode Bar */}
      <div className="p-3 mx-3 mb-3 ardab-card-sm border rounded-3 bg-light">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span className="fw-semibold text-dark small" style={{ fontSize: '0.75rem' }}>
            {isSubAdmin ? 'Sub Admin Active' : 'Super Admin Active'}
          </span>
          <span className={`badge ${isSubAdmin ? 'badge-info-soft' : 'badge-success-soft'}`} style={{ fontSize: '0.65rem' }}>
            {isSubAdmin ? '4 Modules' : '5 Modules'}
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-center pt-1 border-top" style={{ fontSize: '0.72rem' }}>
          <span className="text-muted">Portal View:</span>
          {isSubAdmin ? (
            <Link href="/dashboard" className="text-success fw-semibold text-decoration-none">
              Super Admin &rarr;
            </Link>
          ) : (
            <Link href="/subadmin/dashboard" className="text-info fw-semibold text-decoration-none">
              Sub Admin &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
