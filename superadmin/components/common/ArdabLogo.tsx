'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ArdabLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  subtitle?: string;
  badgeType?: 'super' | 'sub' | 'none';
  href?: string;
  className?: string;
  light?: boolean;
}

export default function ArdabLogo({
  size = 40,
  showText = true,
  textSize = 'fs-5',
  subtitle,
  badgeType,
  href,
  className = '',
  light = false,
}: ArdabLogoProps) {
  const content = (
    <div className={`d-inline-flex align-items-center gap-2 text-decoration-none ${className}`}>
      {/* Monogram Logo Emblem Container */}
      <div
        className="d-flex align-items-center justify-content-center bg-white rounded-3 shadow-sm border p-1"
        style={{
          width: size,
          height: size,
          minWidth: size,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <Image
          src="/logo.jpg"
          alt="Ardab Market Monogram Logo"
          width={size}
          height={size}
          priority
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Brand Text Styled According to Logo Monogram (Red & Green) */}
      {showText && (
        <div className="d-flex flex-column text-start lh-1">
          <div className={`fw-bold ${textSize} mb-0`} style={{ letterSpacing: '-0.3px' }}>
            <span style={{ color: '#dc2626', fontWeight: 800 }}>Ardab</span>{' '}
            <span style={{ color: '#00873e', fontWeight: 800 }}>Market</span>
          </div>
          {badgeType === 'sub' && (
            <span
              className="badge mt-1 badge-info-soft align-self-start"
              style={{ fontSize: '0.65rem', padding: '0.16rem 0.45rem' }}
            >
              SUB ADMIN PORTAL
            </span>
          )}
          {badgeType === 'super' && (
            <span
              className="badge mt-1 badge-success-soft align-self-start"
              style={{ fontSize: '0.65rem', padding: '0.16rem 0.45rem' }}
            >
              SUPER ADMIN PORTAL
            </span>
          )}
          {!badgeType && subtitle && (
            <span
              className={`small mt-1 ${light ? 'text-white-50' : 'text-muted'}`}
              style={{ fontSize: '0.68rem', letterSpacing: '0.6px', fontWeight: 600 }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="text-decoration-none d-inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
