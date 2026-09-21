'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

export function CustomerHeader() {
  const { lang, setLang, t } = useLanguage();
  const { customer, isAuthenticated, selectedCity, setSelectedCity, logout } = useCustomerAuth();
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();

  const cities = ['Gondar', 'Bahir Dar', 'Addis Ababa', 'Hawassa', 'Mekelle', 'Dire Dawa'];

  return (
    <header className="sticky-top shadow-sm bg-white border-bottom">
      {/* Top Banner with Trust & City selector */}
      <div className="bg-light py-1 border-bottom d-none d-md-block" style={{ fontSize: '0.825rem' }}>
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3 text-muted">
            <span>
              <i className="bi bi-truck text-success me-1"></i>
              {t('marketplace.features.fleetDesc', 'Ardab Dedicated 5000kg Delivery Fleet')}
            </span>
            <span>|</span>
            <span>
              <i className="bi bi-shield-check text-success me-1"></i>
              {t('marketplace.features.qualityTitle', '100% Quality Guaranteed')}
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* City Selector */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-link text-decoration-none dropdown-toggle p-0 text-dark fw-semibold"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-geo-alt-fill text-success me-1"></i>
                {selectedCity}
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li><h6 className="dropdown-header">{t('common.nav.city', 'Delivery Hub')}</h6></li>
                {cities.map((city) => (
                  <li key={city}>
                    <button
                      className={`dropdown-item ${selectedCity === city ? 'active' : ''}`}
                      onClick={() => setSelectedCity(city)}
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Language Switcher */}
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn btn-sm ${lang === 'am' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                onClick={() => setLang('am')}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                አማርኛ
              </button>
              <button
                type="button"
                className={`btn btn-sm ${lang === 'en' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                onClick={() => setLang('en')}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container py-2 py-md-3">
        <div className="row align-items-center g-2">
          {/* Brand Logo */}
          <div className="col-auto">
            <Link href="/" className="navbar-brand d-flex align-items-center text-decoration-none">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 me-2 shadow-sm object-fit-cover"
                style={{
                  width: '42px',
                  height: '42px',
                }}
              />
              <div>
                <span className="fw-bolder fs-4 text-dark letter-spacing-tight d-block line-height-1">
                  ARDAB<span className="text-success">.</span>
                </span>
                <span className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                  {t('common.brand.name', 'Market')}
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Category / About Navigation Links (Desktop) */}
          <div className="col-auto d-none d-lg-flex align-items-center gap-3 ms-2">
            <Link href="/products" className="text-decoration-none text-dark fw-semibold small hover-success">
              {t('products', 'Products')}
            </Link>
            <Link href="/categories" className="text-decoration-none text-dark fw-semibold small hover-success">
              {t('categories', 'Categories')}
            </Link>
            <Link href="/about" className="text-decoration-none text-dark fw-semibold small hover-success">
              {t('about', 'About')}
            </Link>
          </div>

          {/* Search Form (Desktop & Tablet) */}
          <div className="col d-none d-md-block">
            <form action="/search" method="GET" className="position-relative">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted ps-3">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  name="q"
                  className="form-control bg-light border-start-0 py-2 ps-1"
                  placeholder={t('common.nav.search', 'Search products, categories, brands...')}
                  aria-label="Search"
                />
                <button className="btn btn-fresh-primary px-4" type="submit">
                  {t('common.actions.filter', 'Search')}
                </button>
              </div>
            </form>
          </div>

          {/* User Quick Actions */}
          <div className="col-auto ms-auto d-flex align-items-center gap-2 gap-md-3">
            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="btn btn-light rounded-circle position-relative p-2 text-dark"
              title={t('common.nav.wishlist', 'Wishlist')}
              style={{ width: '42px', height: '42px' }}
            >
              <i className="bi bi-heart fs-5"></i>
              {wishlistCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="btn btn-light rounded-circle position-relative p-2 text-dark"
              title={t('common.nav.cart', 'Cart')}
              style={{ width: '42px', height: '42px' }}
            >
              <i className="bi bi-cart3 fs-5"></i>
              {itemCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Profile / Account Action */}
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-1">
                <Link
                  href="/account"
                  className="btn btn-light rounded-pill px-3 d-flex align-items-center gap-2 text-decoration-none"
                  title={t('common.nav.account', 'My Account')}
                >
                  <i className="bi bi-person-circle text-success fs-5"></i>
                  <span className="fw-semibold text-dark d-none d-sm-inline" style={{ maxWidth: '120px' }}>
                    {customer?.fullName}
                  </span>
                </Link>

                {/* Dropdown toggle for secondary options (Orders, Wishlist, Logout) */}
                <div className="dropdown">
                  <button
                    className="btn btn-light rounded-circle p-2 text-muted"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    title="Account Menu"
                    style={{ width: '36px', height: '36px' }}
                  >
                    <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem' }}></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                    <li>
                      <div className="px-3 py-1">
                        <div className="fw-bold">{customer?.fullName}</div>
                        <div className="small text-muted">{customer?.email || customer?.phone}</div>
                      </div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" href="/account">
                        <i className="bi bi-person me-2 text-success"></i>{t('common.nav.account', 'My Account')}
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" href="/orders">
                        <i className="bi bi-box-seam me-2"></i>{t('orders.orders.title', 'Orders')}
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" href="/wishlist">
                        <i className="bi bi-heart me-2"></i>{t('common.nav.wishlist', 'Wishlist')}
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={logout}>
                        <i className="bi bi-box-arrow-right me-2"></i>{t('common.nav.logout', 'Logout')}
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link
                  href="/account"
                  className="btn btn-light rounded-circle p-2 text-dark d-flex align-items-center justify-content-center"
                  title={t('common.nav.account', 'Account')}
                  style={{ width: '42px', height: '42px' }}
                >
                  <i className="bi bi-person fs-5"></i>
                </Link>
                <Link href="/login" className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold d-none d-sm-flex align-items-center gap-1">
                  <i className="bi bi-box-arrow-in-right"></i>
                  <span>{t('common.nav.signIn', 'Sign In')}</span>
                </Link>
                <Link href="/signup" className="btn btn-fresh btn-sm rounded-pill px-3 fw-bold d-none d-sm-flex align-items-center gap-1 shadow-sm">
                  <i className="bi bi-person-plus"></i>
                  <span>{t('common.nav.signUp', 'Sign Up')}</span>
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Mobile Search Input (Visible only on mobile) */}
        <div className="d-block d-md-none mt-2">
          <form action="/search" method="GET">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                name="q"
                className="form-control bg-light border-start-0"
                placeholder={t('common.nav.search', 'Search products...')}
              />
            </div>
          </form>
          {/* Mobile Fast Links */}
          <div className="d-flex align-items-center gap-2 mt-2 overflow-x-auto pb-1" style={{ whiteSpace: 'nowrap' }}>
            <Link href="/products" className="badge bg-light text-dark text-decoration-none py-2 px-3 rounded-pill fw-normal">
              {t('products', 'Products')}
            </Link>
            <Link href="/categories" className="badge bg-light text-dark text-decoration-none py-2 px-3 rounded-pill fw-normal">
              {t('categories', 'Categories')}
            </Link>
            <Link href="/about" className="badge bg-light text-dark text-decoration-none py-2 px-3 rounded-pill fw-normal">
              <i className="bi bi-info-circle me-1 text-success"></i>
              {t('about', 'About')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CustomerHeader;
