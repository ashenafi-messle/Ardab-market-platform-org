'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supportApi } from '@/lib/api';
import { SupportCategory, CustomerOrderOption, SupportTicketPriority } from '@/types/support';

function NewSupportRequestContent() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAmharic = language === 'am';

  // Form State
  const [subject, setSubject] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>('NORMAL');
  const [message, setMessage] = useState('');

  // Auxiliary data
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [recentOrders, setRecentOrders] = useState<CustomerOrderOption[]>([]);
  const [loadingAux, setLoadingAux] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/support/new');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load active categories & customer's recent orders
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingAux(true);
      try {
        const [catsRes, ordersRes] = await Promise.all([
          supportApi.getCategories().catch(() => []),
          isAuthenticated ? supportApi.getRecentOrders().catch(() => []) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setCategories(Array.isArray(catsRes) ? catsRes : []);
          setRecentOrders(Array.isArray(ordersRes) ? ordersRes : []);

          // Pre-select category from query param if provided
          const queryCat = searchParams.get('category');
          if (queryCat && Array.isArray(catsRes)) {
            const found = catsRes.find((c) => c.id === queryCat || c.name === queryCat);
            if (found) {
              setCategoryId(found.id);
            }
          }

          // Pre-select order from query param if provided
          const queryOrder = searchParams.get('orderId');
          if (queryOrder) {
            setOrderId(queryOrder);
          }
        }
      } catch (err) {
        console.error('Failed to load auxiliary data:', err);
      } finally {
        if (isMounted) setLoadingAux(false);
      }
    }

    if (isAuthenticated) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, searchParams]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors: Record<string, string> = {};
    if (!subject.trim()) {
      errors.subject = isAmharic ? 'እባክዎ የጥያቄዎን ርዕስ ያስገቡ' : 'Subject is required';
    } else if (subject.trim().length < 3) {
      errors.subject = isAmharic ? 'ርዕስ ቢያንስ 3 ፊደላት መሆን አለበት' : 'Subject must be at least 3 characters';
    }

    if (!message.trim()) {
      errors.message = isAmharic ? 'እባክዎ የመልዕክትዎን ዝርዝር ያስገቡ' : 'Message is required';
    } else if (message.trim().length < 2) {
      errors.message = isAmharic ? 'መልዕክት ቢያንስ 2 ፊደላት መሆን አለበት' : 'Message must be at least 2 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        categoryId: categoryId || null,
        orderId: orderId || null,
        priority,
      };

      const res = await supportApi.createRequest(payload);
      if (res && (res.id || res.ticketNumber)) {
        router.push(`/support/requests/${res.ticketNumber || res.id}`);
      } else {
        router.push('/support/requests');
      }
    } catch (err: any) {
      console.error('Support ticket submission failed:', err);
      setErrorMessage(
        err?.message || (isAmharic ? 'ጥያቄውን ማቅረብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to submit request. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-4 py-lg-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">
              {t('home', 'Home')}
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/support" className="text-decoration-none text-muted">
              {t('support', 'Support')}
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/support/requests" className="text-decoration-none text-muted">
              {t('my_support_requests', 'My Requests')}
            </Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('new_support_request', 'New Request')}
          </li>
        </ol>
      </nav>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-9 col-xl-8">
          {/* Header */}
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link
              href="/support"
              className="btn btn-light rounded-circle p-2 text-dark shadow-sm"
              style={{ width: '40px', height: '40px' }}
              title="Back"
            >
              <i className="bi bi-arrow-left fs-5"></i>
            </Link>
            <div>
              <h1 className="h3 fw-bold mb-1 text-dark">
                {t('new_support_request', 'New Support Request')}
              </h1>
              <p className="text-muted small mb-0">
                {t('new_support_request_subtitle', 'Describe your issue and our team will get back to you promptly')}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
            {errorMessage && (
              <div className="alert alert-danger border-0 rounded-3 d-flex align-items-center gap-2 mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <div className="small">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Category Selection */}
              <div className="mb-4">
                <label htmlFor="categoryId" className="form-label fw-semibold text-dark small">
                  {t('category', 'Category')}
                </label>
                <select
                  id="categoryId"
                  className="form-select rounded-3 py-2"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isSubmitting || loadingAux}
                >
                  <option value="">{isAmharic ? '— ምድብ ይምረጡ (አጠቃላይ) —' : '— Select a category (General) —'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="form-text small">
                  {isAmharic ? 'ጥያቄዎ የሚመለከተውን መስክ ይምረጡ' : 'Select the department best suited for your inquiry'}
                </div>
              </div>

              {/* Related Order (Optional) */}
              <div className="mb-4">
                <label htmlFor="orderId" className="form-label fw-semibold text-dark small">
                  {t('select_order_optional', 'Related Order (Optional)')}
                </label>
                <select
                  id="orderId"
                  className="form-select rounded-3 py-2"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  disabled={isSubmitting || loadingAux}
                >
                  <option value="">{t('no_order_related', 'Not related to a specific order')}</option>
                  {recentOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.orderNumber || ord.id.slice(0, 8)} ({ord.status} - {ord.totalAmount} ETB)
                    </option>
                  ))}
                </select>
                <div className="form-text small">
                  {isAmharic
                    ? 'ጉዳዩ ከአንድ የተወሰነ ትዕዛዝ ጋር የተያያዘ ከሆነ እዚህ ይምረጡ'
                    : 'If your issue is related to an existing delivery or order, select it here'}
                </div>
              </div>

              {/* Priority Selector */}
              <div className="mb-4">
                <label className="form-label fw-semibold text-dark small d-block">
                  {t('priority', 'Priority')}
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as SupportTicketPriority[]).map((p) => {
                    const isSelected = priority === p;
                    const label = t(`priority_${p.toLowerCase()}`, p);
                    let badgeClass = 'btn-outline-secondary';
                    if (isSelected) {
                      if (p === 'URGENT') badgeClass = 'btn-danger text-white';
                      else if (p === 'HIGH') badgeClass = 'btn-warning text-dark';
                      else badgeClass = 'btn-success text-white';
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 fw-semibold ${badgeClass}`}
                        onClick={() => setPriority(p)}
                        disabled={isSubmitting}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label htmlFor="subject" className="form-label fw-semibold text-dark small">
                  {t('subject', 'Subject')} <span className="text-danger">*</span>
                </label>
                <input
                  id="subject"
                  type="text"
                  className={`form-control rounded-3 py-2 ${fieldErrors.subject ? 'is-invalid' : ''}`}
                  placeholder={t('enter_subject', 'Brief summary of your inquiry...')}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: '' }));
                  }}
                  maxLength={200}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.subject && (
                  <div className="invalid-feedback small">{fieldErrors.subject}</div>
                )}
                <div className="d-flex justify-content-between form-text small">
                  <span>{isAmharic ? 'የጉዳዩ አጭር እና ግልጽ ርዕስ' : 'Keep it short and descriptive'}</span>
                  <span>{subject.length}/200</span>
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label htmlFor="message" className="form-label fw-semibold text-dark small">
                  {t('message', 'Message')} <span className="text-danger">*</span>
                </label>
                <textarea
                  id="message"
                  className={`form-control rounded-3 py-2 ${fieldErrors.message ? 'is-invalid' : ''}`}
                  rows={6}
                  placeholder={t('enter_message', 'Describe your issue or inquiry in detail...')}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (fieldErrors.message) setFieldErrors((prev) => ({ ...prev, message: '' }));
                  }}
                  maxLength={5000}
                  disabled={isSubmitting}
                  required
                ></textarea>
                {fieldErrors.message && (
                  <div className="invalid-feedback small">{fieldErrors.message}</div>
                )}
                <div className="d-flex justify-content-between form-text small">
                  <span>{isAmharic ? 'የሚያስፈልግዎትን እርዳታ በዝርዝር ይግለጹ' : 'Please provide as much relevant detail as possible'}</span>
                  <span>{message.length}/5000</span>
                </div>
              </div>

              {/* Submit & Cancel Actions */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-3 pt-3 border-top">
                <Link
                  href="/support"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  tabIndex={isSubmitting ? -1 : 0}
                >
                  {isAmharic ? 'ይቅር' : 'Cancel'}
                </Link>

                <button
                  type="submit"
                  className="btn btn-fresh rounded-pill px-5 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>{t('submitting', 'Submitting...')}</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill"></i>
                      <span>{t('send_request', 'Send Request')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSupportRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-5 text-center">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <NewSupportRequestContent />
    </Suspense>
  );
}

