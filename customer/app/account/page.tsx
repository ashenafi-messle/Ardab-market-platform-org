'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function AccountPage() {
  const { customer, isAuthenticated, logout, loading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-person-lock display-2 text-muted mb-3"></i>
          <h4>{t('login_required_title')}</h4>
          <p className="text-muted mb-4">{t('login_required_desc')}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link href="/login" className="btn btn-fresh rounded-pill px-4">
              {t('login')}
            </Link>
            <Link href="/signup" className="btn btn-outline-secondary rounded-pill px-4">
              {t('register')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = customer?.fullName || customer?.user?.fullName || customer?.user?.email?.split('@')[0] || 'Customer';
  const email = customer?.user?.email || customer?.email || '';
  const phone = customer?.phone || customer?.user?.phone || '';
  const city = customer?.city || 'Addis Ababa';

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('my_account')}
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center">
            <div
              className="rounded-circle bg-success text-white mx-auto d-flex align-items-center justify-content-center fs-1 fw-bold mb-3 shadow"
              style={{ width: '80px', height: '80px' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <h4 className="fw-bold mb-1">{displayName}</h4>
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 small mb-3">
              {t('verified_customer')}
            </span>
            <div className="text-muted small mb-4">{email}</div>

            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="btn btn-outline-danger w-100 rounded-pill"
            >
              <i className="bi bi-box-arrow-right me-2"></i> {t('logout')}
            </button>
          </div>
        </div>

        {/* Details & Quick Links */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-person-lines-fill text-success me-2"></i>
              {t('profile_information')}
            </h5>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('display_name')}</label>
                <div className="fw-bold text-dark">{displayName}</div>
                <small className="text-muted fst-italic">({t('derived_from_email')})</small>
              </div>

              <div className="col-md-6">
                <label className="text-muted small d-block">{t('email')}</label>
                <div className="fw-bold text-dark">{email}</div>
              </div>

              <div className="col-md-6">
                <label className="text-muted small d-block">{t('phone')}</label>
                <div className="fw-bold text-dark">{phone || '—'}</div>
              </div>

              <div className="col-md-6">
                <label className="text-muted small d-block">{t('city')}</label>
                <div className="fw-bold text-dark">{city}</div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-sm-6 col-lg-3">
              <Link href="/orders" className="text-decoration-none">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 hover-elevate transition-all">
                  <i className="bi bi-bag-check text-success display-5 mb-2"></i>
                  <h5 className="fw-bold text-dark mb-1">{t('my_orders')}</h5>
                  <small className="text-muted">{t('view_all_orders_desc')}</small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-lg-3">
              <Link href="/wishlist" className="text-decoration-none">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 hover-elevate transition-all">
                  <i className="bi bi-heart text-danger display-5 mb-2"></i>
                  <h5 className="fw-bold text-dark mb-1">{t('wishlist')}</h5>
                  <small className="text-muted">{t('view_saved_items_desc')}</small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-lg-3">
              <Link href="/customer/reviews" className="text-decoration-none">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 hover-elevate transition-all">
                  <i className="bi bi-star-fill text-warning display-5 mb-2"></i>
                  <h5 className="fw-bold text-dark mb-1">{t('my_reviews')}</h5>
                  <small className="text-muted">{t('view_all_reviews_desc')}</small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-lg-3">
              <Link href="/support" className="text-decoration-none">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 hover-elevate transition-all">
                  <i className="bi bi-headset text-primary display-5 mb-2"></i>
                  <h5 className="fw-bold text-dark mb-1">{t('customer_support', 'Customer Support')}</h5>
                  <small className="text-muted">{t('contact_support_desc', 'Connect directly with Ardab support')}</small>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
