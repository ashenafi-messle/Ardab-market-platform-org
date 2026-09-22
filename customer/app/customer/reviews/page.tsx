'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { reviewsApi } from '@/lib/api';

export default function CustomerReviewsPage() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Edit Modal State
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editAnonymous, setEditAnonymous] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchMyReviews = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await reviewsApi.getMyReviews({
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: activeStatus !== 'ALL' ? activeStatus : undefined,
      });

      if (res) {
        setReviews(res.items || []);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          }));
        }
      }
    } catch (err: any) {
      console.error('Error fetching customer reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, pagination.page, pagination.pageSize, activeStatus]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/customer/reviews');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyReviews();
    }
  }, [isAuthenticated, fetchMyReviews]);

  const handleOpenEdit = (rev: any) => {
    setEditingReview(rev);
    setEditRating(rev.rating || 5);
    setEditTitle(rev.title || '');
    setEditComment(rev.comment || '');
    setEditAnonymous(rev.isAnonymous || false);
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview?.id) return;

    setIsSubmittingEdit(true);
    setActionError(null);
    try {
      await reviewsApi.updateReview(editingReview.id, {
        rating: editRating,
        title: editTitle.trim() || undefined,
        comment: editComment.trim(),
        isAnonymous: editAnonymous,
      });

      setActionSuccess(t('review_submitted_success'));
      setEditingReview(null);
      await fetchMyReviews();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update review');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm(t('delete_review_confirm'))) return;

    try {
      await reviewsApi.deleteReview(reviewId);
      setActionSuccess(language === 'am' ? 'አስተያየትዎ በተሳካ ሁኔታ ተሰርዟል' : 'Review successfully deleted');
      await fetchMyReviews();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    }
  };

  if (authLoading || (loading && reviews.length === 0)) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success my-5" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/account" className="text-decoration-none text-muted">{t('my_account')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('my_reviews')}
          </li>
        </ol>
      </nav>

      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t('my_reviews')}</h2>
          <p className="text-muted small mb-0">{t('view_all_reviews_desc')}</p>
        </div>
        <Link href="/products" className="btn btn-outline-success btn-sm rounded-pill px-3">
          <i className="bi bi-box-seam me-1"></i> {t('discover_products')}
        </Link>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="alert alert-success alert-dismissible fade show rounded-4 py-2 px-3 small mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {actionSuccess}
          <button type="button" className="btn-close py-2" onClick={() => setActionSuccess(null)}></button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[
          { label: language === 'am' ? 'ሁሉም' : 'All Reviews', value: 'ALL' },
          { label: t('approved_published'), value: 'PUBLISHED' },
          { label: t('pending_moderation'), value: 'PENDING' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-medium ${
              activeStatus === tab.value ? 'btn-success text-white' : 'btn-light text-muted border'
            }`}
            onClick={() => {
              setActiveStatus(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="d-flex flex-column gap-3 mb-4">
          {reviews.map((rev) => {
            const product = rev.product;
            const productImage = product?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';

            return (
              <div key={rev.id} className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="row g-3 align-items-start">
                  {/* Product Thumbnail & Details */}
                  <div className="col-12 col-md-3 border-md-end">
                    <div className="d-flex align-items-center gap-3">
                      <img
                        src={productImage}
                        alt={product?.name || 'Product'}
                        className="rounded-3 object-fit-cover shadow-sm"
                        style={{ width: '64px', height: '64px' }}
                      />
                      <div>
                        {product ? (
                          <Link
                            href={`/product/${product.id}`}
                            className="fw-bold text-dark text-decoration-none hover-underline small d-block"
                          >
                            {product.name}
                          </Link>
                        ) : (
                          <span className="fw-bold text-dark small d-block">Marketplace Product</span>
                        )}
                        {product?.itemCode && (
                          <span className="badge bg-light text-muted border small mt-1" style={{ fontSize: '0.68rem' }}>
                            {product.itemCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Review Content & Admin Reply */}
                  <div className="col-12 col-md-9">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="text-warning">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              className={`bi ${star <= rev.rating ? 'bi-star-fill' : 'bi-star'} small`}
                            ></i>
                          ))}
                        </div>
                        <span className="text-muted small">
                          {rev.createdAt?.split('T')[0]}
                        </span>
                        {rev.isVerified && (
                          <span
                            className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 ms-1"
                            style={{ fontSize: '0.68rem' }}
                          >
                            <i className="bi bi-patch-check-fill me-1"></i>
                            {t('verified_purchase')}
                          </span>
                        )}
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="d-flex align-items-center gap-2">
                        {rev.status === 'PENDING' ? (
                          <span className="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle rounded-pill px-3 py-1 small">
                            <i className="bi bi-hourglass-split me-1"></i>
                            {t('pending_moderation')}
                          </span>
                        ) : rev.status === 'PUBLISHED' ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-3 py-1 small">
                            <i className="bi bi-patch-check-fill me-1"></i>
                            {t('approved_published')}
                          </span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1 small">
                            {rev.status}
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-pill px-2 py-0"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleOpenEdit(rev)}
                        >
                          <i className="bi bi-pencil me-1"></i> {t('edit_review')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleDeleteReview(rev.id)}
                        >
                          <i className="bi bi-trash me-1"></i> {t('delete_review')}
                        </button>
                      </div>
                    </div>

                    {rev.title && (
                      <h6 className="fw-bold text-dark mb-1 small">{rev.title}</h6>
                    )}
                    <p className="text-muted small mb-0" style={{ whiteSpace: 'pre-line' }}>
                      {rev.comment}
                    </p>

                    {/* Official Sub Admin Response */}
                    {rev.adminReply && (
                      <div className="mt-3 p-3 bg-light rounded-3 border-start border-3 border-success">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <i className="bi bi-reply-fill text-success"></i>
                          <strong className="small text-success">
                            {rev.responderName || t('admin_response')}
                          </strong>
                          {rev.repliedAt && (
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {rev.repliedAt.split('T')[0]}
                            </span>
                          )}
                        </div>
                        <p className="small text-muted mb-0">{rev.adminReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 text-center py-5 bg-white">
          <i className="bi bi-chat-square-dots text-muted display-4 mb-3"></i>
          <h4 className="fw-bold text-dark mb-1">{t('no_reviews_yet')}</h4>
          <p className="text-muted small mb-4">{t('not_purchased_to_review')}</p>
          <div>
            <Link href="/products" className="btn btn-fresh rounded-pill px-4">
              {t('discover_products')}
            </Link>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark mb-0">
                  {t('edit_review')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingReview(null)}
                  aria-label="Close"
                ></button>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div className="modal-body p-4">
                  {actionError && (
                    <div className="alert alert-danger py-2 small mb-3">{actionError}</div>
                  )}

                  {/* Rating Selector */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark d-block">
                      {t('rating')} (1–5 {t('stars')})
                    </label>
                    <div className="d-flex gap-2 text-warning fs-3" role="radiogroup">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="btn p-0 border-0 text-warning fs-3 focus-ring focus-ring-success"
                          onClick={() => setEditRating(star)}
                          role="radio"
                          aria-checked={editRating === star}
                        >
                          <i className={`bi ${star <= editRating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}></i>
                        </button>
                      ))}
                      <span className="text-dark small align-self-center ms-2 fw-semibold">
                        {editRating} / 5
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-3">
                    <label htmlFor="edit-rev-title" className="form-label small fw-semibold text-dark">
                      {t('review_title')}
                    </label>
                    <input
                      type="text"
                      id="edit-rev-title"
                      className="form-control rounded-3"
                      maxLength={120}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  {/* Comment */}
                  <div className="mb-3">
                    <label htmlFor="edit-rev-comment" className="form-label small fw-semibold text-dark">
                      {t('your_comment')} <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="edit-rev-comment"
                      className="form-control rounded-3"
                      rows={4}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      required
                      minLength={3}
                      maxLength={2000}
                    ></textarea>
                    <div className="d-flex justify-content-between text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                      <span>Min 3 characters</span>
                      <span>{editComment.length}/2000</span>
                    </div>
                  </div>

                  {/* Anonymous */}
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="edit-rev-anon"
                      className="form-check-input"
                      checked={editAnonymous}
                      onChange={(e) => setEditAnonymous(e.target.checked)}
                    />
                    <label htmlFor="edit-rev-anon" className="form-check-label small text-muted">
                      {t('anonymous_review')}
                    </label>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-3"
                    onClick={() => setEditingReview(null)}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || editComment.trim().length < 3}
                    className="btn btn-fresh rounded-pill px-4"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {t('saving')}
                      </>
                    ) : (
                      t('update_review')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
