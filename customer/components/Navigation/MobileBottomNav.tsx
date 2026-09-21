'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { itemCount } = useCart();

  const navItems = [
    { href: '/', icon: 'bi-house-door-fill', label: t('common.nav.home', 'Home') },
    { href: '/categories', icon: 'bi-grid-fill', label: t('common.nav.categories', 'Categories') },
    { href: '/search', icon: 'bi-search', label: t('common.actions.filter', 'Search') },
    { href: '/cart', icon: 'bi-cart3', label: t('common.nav.cart', 'Cart'), badge: itemCount },
    { href: '/account', icon: 'bi-person-fill', label: t('common.nav.account', 'Account') },
  ];

  return (
    <nav className="mobile-bottom-nav d-md-none">
      <div className="container-fluid px-2">
        <div className="row g-0 text-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.href} className="col">
                <Link
                  href={item.href}
                  className={`mobile-nav-item position-relative ${isActive ? 'active text-success' : ''}`}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
