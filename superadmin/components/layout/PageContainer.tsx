'use client';

import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageContainer({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className="w-100">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0" style={{ fontSize: '0.8rem' }}>
            <li className="breadcrumb-item">
              <Link href="/dashboard" className="text-muted text-decoration-none">
                <i className="bi bi-house-door me-1"></i>Home
              </Link>
            </li>
            {breadcrumbs.map((b, idx) => (
              <li
                key={b.label}
                className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}
                aria-current={idx === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {b.href && idx !== breadcrumbs.length - 1 ? (
                  <Link href={b.href} className="text-muted text-decoration-none">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-dark fw-medium">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Page Title & Actions Row */}
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark">{title}</h1>
          {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
        </div>
        {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {/* Main Page Content Body */}
      {children}
    </div>
  );
}
