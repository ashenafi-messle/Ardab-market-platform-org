'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supportApi } from '@/lib/api';
import { SupportCategory } from '@/types/support';

export default function SupportLandingPage() {
  const { isAuthenticated } = useCustomerAuth();
  const { t, language } = useLanguage();

  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAmharic = language === 'am';

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supportApi.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load support categories:', err);
      setError(err?.message || t('error_loading_support', 'We could not load support categories.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Common support areas with visual icons and descriptions
  const commonTopics = [
    {
      icon: 'bi-truck',
      iconBg: 'bg-primary-subtle text-primary',
      title: isAmharic ? 'የትዕዛዝ ክትትልና ማድረሻ' : 'Orders & Delivery',
      desc: isAmharic
        ? 'የትዕዛዝዎን ሁኔታ፣ የማድረሻ ሰዓት እና የአሽከርካሪ መረጃ ይከታተሉ'
        : 'Track your shipment status, estimated arrival, and dispatch updates',
      link: '/orders',
      ctaText: isAmharic ? 'ትዕዛዞችን ይመልከቱ' : 'View Orders',
    },
    {
      icon: 'bi-wallet2',
      iconBg: 'bg-success-subtle text-success',
      title: isAmharic ? 'ክፍያ እና ደረሰኝ' : 'Payments & Invoicing',
      desc: isAmharic
        ? 'የቴሌብር፣ ሲቢኢ ብር እና የባንክ ክፍያዎች መረጃ እና ማረጋገጫ'
        : 'Telebirr, CBE Birr, and mobile money payment support and receipts',
      link: '/support/new',
      ctaText: isAmharic ? 'ድጋፍ ይጠይቁ' : 'Get Help',
    },
    {
      icon: 'bi-shield-check',
      iconBg: 'bg-warning-subtle text-warning',
      title: isAmharic ? 'የጥራት ማረጋገጫና ተመላሽ' : 'Quality Guarantee & Returns',
      desc: isAmharic
        ? '100% ጥራት ያለው ምርት ዋስትና እና የተበላሸ ምርት ተመላሽ ሂደት'
        : '100% genuine products guarantee and easy returns assistance',
      link: '/support/new',
      ctaText: isAmharic ? 'ጥያቄ ያቅርቡ' : 'Report Issue',
    },
    {
      icon: 'bi-person-badge',
      iconBg: 'bg-info-subtle text-info',
      title: isAmharic ? 'የመለያ እና የከተማ መረጃ' : 'Account & Delivery Hub',
      desc: isAmharic
        ? 'የመለያ ቅንብሮች፣ የከተማ መረጣ እና የደንበኛ ማረጋገጫ'
        : 'Manage your profile, city preferences, and verified status',
      link: '/account',
      ctaText: isAmharic ? 'መለያዬን ክፈት' : 'Manage Account',
    },
  ];

  return (
    <div className="container py-4 py-lg-5">
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">
              {t('home', 'Home')}
            </Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('help_center', 'Help Center')}
          </li>
        </ol>
      </nav>

      {/* Hero Banner */}
      <div className="card border-0 rounded-4 shadow-sm bg-gradient p-4 p-md-5 mb-5 text-white" style={{ background: 'linear-gradient(135deg, #198754 0%, #0d5a36 100%)' }}>
        <div className="row align-items-center g-4">
          <div className="col-lg-8">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white bg-opacity-25 text-white small mb-3">
              <i className="bi bi-headset"></i>
              <span>{t('customer_support', 'Customer Support')}</span>
            </div>
            <h1 className="display-6 fw-bold mb-3">
              {isAmharic ? 'እንዴት ልንረዳዎ እንችላለን?' : 'How can we help you today?'}
            </h1>
            <p className="lead mb-4 text-white-50" style={{ fontSize: '1.05rem', maxWidth: '650px' }}>
              {t('help_center_subtitle', 'Have questions or need assistance? We are here to help you every step of the way.')}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/support/new" className="btn btn-light text-success fw-bold rounded-pill px-4 py-2 shadow-sm">
                <i className="bi bi-plus-circle me-2"></i>
                {t('new_support_request', 'New Support Request')}
              </Link>
              {isAuthenticated && (
                <Link href="/support/requests" className="btn btn-outline-light rounded-pill px-4 py-2">
                  <i className="bi bi-ticket-perforated me-2"></i>
                  {t('my_support_requests', 'My Support Requests')}
                </Link>
              )}
            </div>
          </div>
          <div className="col-lg-4 text-center d-none d-lg-block">
            <i className="bi bi-chat-heart display-1 text-white opacity-50"></i>
          </div>
        </div>
      </div>

      {/* Common Support Topics Grid */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="h4 fw-bold mb-1 text-dark">
              {t('quick_help_areas', 'Common Support Areas')}
            </h2>
            <p className="text-muted small mb-0">
              {isAmharic ? 'በተደጋጋሚ ለሚነሱ ጥያቄዎች እና ፈጣን እርዳታዎች' : 'Quick access to frequently needed services and assistance'}
            </p>
          </div>
        </div>

        <div className="row g-3 g-md-4">
          {commonTopics.map((topic, index) => (
            <div key={index} className="col-12 col-sm-6 col-lg-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-4 transition-all hover-elevate">
                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3 ${topic.iconBg}`} style={{ width: '56px', height: '56px' }}>
                  <i className={`bi ${topic.icon} fs-4`}></i>
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">{topic.title}</h3>
                <p className="text-muted small mb-4 flex-grow-1">{topic.desc}</p>
                <Link href={topic.link} className="btn btn-sm btn-outline-success rounded-pill align-self-start fw-semibold">
                  {topic.ctaText} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Backend Categories Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="h4 fw-bold mb-1 text-dark">
              {t('support_categories', 'Support Categories')}
            </h2>
            <p className="text-muted small mb-0">
              {isAmharic ? 'በአርዳብ ገበያ የሚሰጡ ይፋዊ የድጋፍ መስኮች' : 'Official support categories configured by Ardab operations team'}
            </p>
          </div>
          <Link href="/support/new" className="btn btn-sm btn-fresh rounded-pill px-3">
            <i className="bi bi-pencil-square me-1"></i>
            {t('new_support_request', 'Open Ticket')}
          </Link>
        </div>

        {loading ? (
          <div className="row g-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="col-12 col-sm-6 col-md-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center placeholder-glow">
                  <div className="placeholder col-4 mx-auto rounded-circle mb-3" style={{ height: '48px' }}></div>
                  <div className="placeholder col-8 mx-auto mb-2"></div>
                  <div className="placeholder col-6 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-light">
            <i className="bi bi-exclamation-triangle text-warning display-5 mb-2"></i>
            <p className="text-muted mb-3">{error}</p>
            <div>
              <button onClick={loadCategories} className="btn btn-sm btn-outline-success rounded-pill px-4">
                {t('retry', 'Try again')}
              </button>
            </div>
          </div>
        ) : categories.length > 0 ? (
          <div className="row g-3">
            {categories.map((cat) => (
              <div key={cat.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <Link
                  href={`/support/new?category=${encodeURIComponent(cat.id)}`}
                  className="text-decoration-none"
                >
                  <div className="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-elevate transition-all">
                    <div
                      className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: '52px', height: '52px' }}
                    >
                      <i className="bi bi-chat-square-text fs-4"></i>
                    </div>
                    <h4 className="h6 fw-bold text-dark mb-1">{cat.name}</h4>
                    <p className="text-muted small mb-0 line-clamp-2">
                      {cat.description || (isAmharic ? 'የቀጥታ የድጋፍ አገልግሎት' : 'Direct support assistance')}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-light">
            <p className="text-muted mb-0">{isAmharic ? 'ምንም ምድቦች አልተገኙም።' : 'No active categories found.'}</p>
          </div>
        )}
      </div>

      {/* Authenticated Customer Quick Access / Action Banner */}
      <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-light mb-5">
        <div className="row align-items-center g-4">
          <div className="col-md-8">
            <h3 className="h4 fw-bold text-dark mb-2">
              {isAmharic ? 'ቀደም ሲል ያቀረቡት የድጋፍ ጥያቄ አለዎት?' : 'Already have an ongoing support inquiry?'}
            </h3>
            <p className="text-muted mb-0">
              {t('my_support_requests_subtitle', 'Track your support conversations, tickets, and staff replies here in real time.')}
            </p>
          </div>
          <div className="col-md-4 text-md-end">
            <Link href="/support/requests" className="btn btn-fresh rounded-pill px-4 py-2 shadow-sm">
              <i className="bi bi-journal-text me-2"></i>
              {t('my_support_requests', 'My Support Requests')}
            </Link>
          </div>
        </div>
      </div>

      {/* Support Hours & Operational Info Card */}
      <div className="card border-0 shadow-sm rounded-4 p-4">
        <div className="row g-4 text-center text-md-start">
          <div className="col-12 col-md-4 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-success bg-opacity-10 text-success p-3">
              <i className="bi bi-clock-history fs-4"></i>
            </div>
            <div>
              <div className="fw-bold text-dark">{isAmharic ? 'የስራ ሰዓታት' : 'Support Hours'}</div>
              <small className="text-muted">{t('support_hours_info', 'Ardab Customer Support is active 7 days a week.')}</small>
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3">
              <i className="bi bi-geo-alt fs-4"></i>
            </div>
            <div>
              <div className="fw-bold text-dark">{isAmharic ? 'ዋና ማዕከል' : 'Operations Hub'}</div>
              <small className="text-muted">Gondar, Bahir Dar & Addis Ababa, Ethiopia</small>
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-info bg-opacity-10 text-info p-3">
              <i className="bi bi-shield-check fs-4"></i>
            </div>
            <div>
              <div className="fw-bold text-dark">{isAmharic ? 'ደህንነት የተረጋገጠ' : 'Safe & Encrypted'}</div>
              <small className="text-muted">{isAmharic ? 'ሁሉም ውይይቶች በምስጢር የተጠበቁ ናቸው' : 'All messages are private and securely verified'}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
