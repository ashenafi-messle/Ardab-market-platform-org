'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { feedbackApi } from '@/lib/api';
import {
  FeedbackItem,
  FeedbackMetrics,
  FeedbackType,
  FeedbackStatus,
  FeedbackSentiment,
  FeedbackModerationAction,
} from '@/types/feedback';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

const TYPE_TABS: { label: string; value: FeedbackType | 'ALL'; icon: string }[] = [
  { label: 'All Reviews', value: 'ALL', icon: 'bi-grid' },
  { label: 'Commodities & Products', value: 'PRODUCT', icon: 'bi-box-seam' },
  { label: 'Deliveries & Logistics', value: 'DELIVERY', icon: 'bi-truck' },
  { label: 'Platform & App', value: 'PLATFORM', icon: 'bi-laptop' },
  { label: 'Supplier Handover', value: 'SUPPLIER', icon: 'bi-building' },
];

export default function FeedbackManagementPage() {
  const { user, selectedCity } = useAuth();

  // Permissions
  const canRespond = hasPermission(user?.role, 'feedback:respond');
  const canModerate = hasPermission(user?.role, 'feedback:moderate');
  const canManageReports = hasPermission(user?.role, 'feedback:manage_reports');

  // List & Pagination State
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  // Filter & Search State
  const [activeType, setActiveType] = useState<FeedbackType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'ALL'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<FeedbackSentiment | 'ALL'>('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [inspectItem, setInspectItem] = useState<FeedbackItem | null>(null);
  const [replyTarget, setReplyTarget] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [moderateTarget, setModerateTarget] = useState<FeedbackItem | null>(null);
  const [moderateAction, setModerateAction] = useState<FeedbackModerationAction>('PUBLISH');
  const [moderateReason, setModerateReason] = useState('');

  // Async action feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Fetch reputation & metrics
  const loadMetrics = useCallback(async () => {
    try {
      setIsMetricsLoading(true);
      const met = await feedbackApi.getMetrics(selectedCity);
      setMetrics(met);
    } catch (err: any) {
      console.error('Failed to load feedback metrics:', err);
    } finally {
      setIsMetricsLoading(false);
    }
  }, [selectedCity]);

  // Fetch paginated feedback list
  const loadFeedbackList = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, unknown> = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        city: selectedCity,
        sortBy,
        sortOrder,
      };

      if (activeType !== 'ALL') params.type = activeType;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (ratingFilter !== 'ALL') params.rating = ratingFilter;
      if (sentimentFilter !== 'ALL') params.sentiment = sentimentFilter;
      if (verifiedOnly) params.isVerified = 'true';
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const result = await feedbackApi.getList(params);
      setFeedbackList(result.data);
      setPagination({
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      });
    } catch (err: any) {
      console.error('Failed to load feedback list:', err);
      showNotification(err?.message || 'Failed to fetch reviews and ratings', true);
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    selectedCity,
    sortBy,
    sortOrder,
    activeType,
    statusFilter,
    ratingFilter,
    sentimentFilter,
    verifiedOnly,
    debouncedSearch,
  ]);

  // Load metrics on city change
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Load feedback list when any filter, pagination or search changes
  useEffect(() => {
    loadFeedbackList();
  }, [loadFeedbackList]);

  // Handle Quick Status Update
  const handleUpdateStatus = async (id: string, status: FeedbackStatus, reason?: string) => {
    try {
      setIsSubmitting(true);
      const updated = await feedbackApi.updateStatus(id, status, reason);
      setFeedbackList((prev) => prev.map((f) => (f.id === id ? updated : f)));
      if (inspectItem?.id === id) setInspectItem(updated);
      showNotification(`Feedback status updated to ${status}.`);
      loadMetrics();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update feedback status', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Official Response
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget || !replyText.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await feedbackApi.replyToFeedback(replyTarget.id, replyText.trim());
      setFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (inspectItem?.id === updated.id) setInspectItem(updated);
      setReplyTarget(null);
      setReplyText('');
      showNotification('Official administrative response published successfully.');
      loadMetrics();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to publish response', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Moderation Action
  const handleModerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderateTarget) return;

    try {
      setIsSubmitting(true);
      const updated = await feedbackApi.moderate(moderateTarget.id, moderateAction, moderateReason.trim());
      setFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (inspectItem?.id === updated.id) setInspectItem(updated);
      setModerateTarget(null);
      setModerateReason('');
      showNotification(`Feedback successfully moderated with action "${moderateAction}".`);
      loadMetrics();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to moderate feedback', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setActiveType('ALL');
    setSearchTerm('');
    setStatusFilter('ALL');
    setRatingFilter('ALL');
    setSentimentFilter('ALL');
    setVerifiedOnly(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const renderStarRating = (rating: number) => {
    const full = Math.min(Math.max(rating, 0), 5);
    const empty = 5 - full;
    return (
      <span className="text-warning text-nowrap" aria-label={`${rating} out of 5 stars`}>
        {'★'.repeat(full)}
        <span className="text-muted opacity-25">{'★'.repeat(empty)}</span>
      </span>
    );
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Feedback & Reputation Management"
        subtitle="Manage customer commodity reviews, driver delivery ratings, and publish auditable administrative responses"
        breadcrumbs={[{ label: 'Sub Admin' }, { label: 'Feedback Management' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-sm">
              <i className="bi bi-star-fill text-warning-emphasis"></i>
              <span className="fw-semibold">
                {metrics ? `${metrics.averageRating.toFixed(2)} Avg Rating` : 'Loading...'}
              </span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 bg-white shadow-sm"
              onClick={() => {
                loadMetrics();
                loadFeedbackList();
              }}
              title="Refresh feedback stream"
              disabled={isLoading || isMetricsLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
          </div>
        }
      >
        {/* Flash Notifications */}
        {actionSuccess && (
          <div
            className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionSuccess}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setActionSuccess(null)}
            ></button>
          </div>
        )}

        {actionError && (
          <div
            className="alert alert-danger alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
              <span className="fw-medium">{actionError}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setActionError(null)}
            ></button>
          </div>
        )}

        {/* Feedback Metrics & Reputation KPIs */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100 shadow-sm">
              <span className="text-muted small d-block mb-1">Average Satisfaction</span>
              <div className="fs-3 fw-bold text-dark d-flex align-items-center gap-2">
                {metrics?.averageRating.toFixed(2) ?? '4.85'}
                <span className="text-warning fs-4">★</span>
              </div>
              <span className="badge badge-success-soft mt-1">Out of 5.0 Stars</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100 shadow-sm">
              <span className="text-muted small d-block mb-1">Net Promoter Score (NPS)</span>
              <div className="fs-3 fw-bold text-success">
                {metrics ? (metrics.netPromoterScore >= 0 ? `+${metrics.netPromoterScore}` : metrics.netPromoterScore) : '+86'}
              </div>
              <span className="text-muted small">
                {metrics && metrics.netPromoterScore >= 70 ? 'World-Class Standard' : 'Good Client Loyalty'}
              </span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100 shadow-sm">
              <span className="text-muted small d-block mb-1">Sentiment Distribution</span>
              <div className="fs-3 fw-bold text-primary">
                {metrics?.positivePercentage ?? 92}%
              </div>
              <span className="text-muted small">
                {metrics?.neutralPercentage ?? 6}% Neutral &bull; {metrics?.negativePercentage ?? 2}% Negative
              </span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100 shadow-sm">
              <span className="text-muted small d-block mb-1">Total Reviews Tracked</span>
              <div className="fs-3 fw-bold text-dark">
                {metrics?.totalReviews ?? pagination.total}
              </div>
              <span className="text-muted small">
                Verified Orders &bull; {selectedCity} Hub
              </span>
            </div>
          </div>
        </div>

        {/* Category Type Tabs */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-2 ${
                  activeType === tab.value
                    ? 'btn-ardab-primary shadow-sm text-white'
                    : 'btn-outline-secondary bg-white border'
                }`}
                onClick={() => {
                  setActiveType(tab.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="ardab-card p-3 mb-4 shadow-sm">
          <div className="row g-2 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search author, title, product, delivery or keywords..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-sm position-absolute end-0 top-50 translate-middle-y me-2 text-muted border-0 p-0"
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as FeedbackStatus | 'ALL');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Filter by review status"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="PUBLISHED">Published</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FLAGGED">Flagged</option>
                <option value="HIDDEN">Hidden</option>
                <option value="UNDER_REVIEW">Under Review</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={ratingFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setRatingFilter(val === 'ALL' ? 'ALL' : Number(val));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Filter by star rating"
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars (★★★★★)</option>
                <option value="4">4 Stars (★★★★☆)</option>
                <option value="3">3 Stars (★★★☆☆)</option>
                <option value="2">2 Stars (★★☆☆☆)</option>
                <option value="1">1 Star (★☆☆☆☆)</option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={sentimentFilter}
                onChange={(e) => {
                  setSentimentFilter(e.target.value as FeedbackSentiment | 'ALL');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Filter by sentiment"
              >
                <option value="ALL">All Sentiments</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="NEGATIVE">Negative</option>
              </select>
            </div>

            {/* Sort & Verified Toggle */}
            <div className="col-6 col-md-2 d-flex align-items-center justify-content-between gap-2">
              <div className="form-check form-switch m-0" title="Only show verified order reviews">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="verifiedOnlySwitch"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                />
                <label className="form-check-label small text-muted text-nowrap" htmlFor="verifiedOnlySwitch">
                  Verified
                </label>
              </div>

              {(searchTerm || statusFilter !== 'ALL' || ratingFilter !== 'ALL' || sentimentFilter !== 'ALL' || verifiedOnly) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger border-0 p-1"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Cards Stream */}
        {isLoading ? (
          <div className="ardab-card p-5 text-center text-muted shadow-sm">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading reviews...</span>
            </div>
            <p className="mb-0">Loading customer reviews and satisfaction data...</p>
          </div>
        ) : feedbackList.length === 0 ? (
          <EmptyState
            icon="bi-chat-square-dots"
            title="No reviews found"
            description={
              searchTerm || statusFilter !== 'ALL' || ratingFilter !== 'ALL' || activeType !== 'ALL'
                ? 'No customer reviews match your active filter criteria. Try resetting or broadening your filters.'
                : `No reviews recorded yet for ${selectedCity}. Reviews will appear as customers rate products and deliveries.`
            }
            actionLabel={
              searchTerm || statusFilter !== 'ALL' || ratingFilter !== 'ALL' || activeType !== 'ALL'
                ? 'Reset Filters'
                : undefined
            }
            onAction={handleResetFilters}
          />
        ) : (
          <div className="d-flex flex-column gap-3 mb-4">
            {feedbackList.map((item) => {
              const hasReplies = (item.responses && item.responses.length > 0) || item.adminReply;
              const hasReports = item.reports && item.reports.length > 0;

              return (
                <div key={item.id} className="ardab-card p-4 shadow-sm border">
                  {/* Top Bar: Stars, Badges, Header */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className="fs-5">{renderStarRating(item.rating)}</span>
                        <span className="badge badge-neutral-soft px-2 py-1" style={{ fontSize: '0.75rem' }}>
                          {item.type}
                        </span>
                        <span
                          className={`badge ${
                            item.sentiment === 'POSITIVE'
                              ? 'badge-success-soft'
                              : item.sentiment === 'NEGATIVE'
                              ? 'badge-danger-soft'
                              : 'badge-warning-soft'
                          } px-2 py-1`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {item.sentiment}
                        </span>
                        {item.isVerified && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 d-inline-flex align-items-center gap-1">
                            <i className="bi bi-patch-check-fill"></i>
                            <span>Verified Order</span>
                          </span>
                        )}
                        {hasReports && (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 d-inline-flex align-items-center gap-1">
                            <i className="bi bi-flag-fill"></i>
                            <span>{item.reports?.length} Flagged</span>
                          </span>
                        )}
                      </div>

                      <h5 className="fw-bold text-dark mb-1">{item.title}</h5>

                      <div className="text-muted small d-flex flex-wrap align-items-center gap-1">
                        <span>By</span>
                        <strong className="text-dark">{item.authorName}</strong>
                        <span className="badge bg-light text-dark border">
                          {item.authorRole}
                        </span>
                        <span>&bull;</span>
                        <i className="bi bi-geo-alt"></i>
                        <span>{item.city}</span>
                        <span>&bull;</span>
                        <span>Target:</span>
                        <strong className="text-dark">{item.targetEntityName}</strong>
                      </div>
                    </div>

                    <div className="text-sm-end text-muted small">
                      <div>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      <span
                        className={`badge ${
                          item.status === 'PUBLISHED' || item.status === 'REVIEWED'
                            ? 'badge-success-soft'
                            : item.status === 'FLAGGED' || item.status === 'REJECTED'
                            ? 'badge-danger-soft'
                            : item.status === 'HIDDEN'
                            ? 'badge-neutral-soft'
                            : 'badge-info-soft'
                        } mt-1`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer Review Body */}
                  <p className="text-dark small mb-3 p-3 bg-light rounded-3 border">
                    &ldquo;{item.comment}&rdquo;
                  </p>

                  {/* Administrative Replies Stream */}
                  {item.responses && item.responses.length > 0 ? (
                    <div className="mb-3 d-flex flex-column gap-2">
                      {item.responses.map((resp) => (
                        <div
                          key={resp.id}
                          className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary-subtle"
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-primary small d-flex align-items-center gap-1">
                              <i className="bi bi-reply-fill"></i>
                              <span>
                                {resp.responderType === 'SUBADMIN'
                                  ? 'Official Sub Admin Response'
                                  : resp.responderType === 'ADMIN'
                                  ? 'Super Admin Response'
                                  : 'Vendor Response'}
                              </span>
                              {resp.responderName && <span className="text-muted fw-normal">({resp.responderName})</span>}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {new Date(resp.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-dark small mb-0">{resp.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : item.adminReply ? (
                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary-subtle mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-primary small d-flex align-items-center gap-1">
                          <i className="bi bi-reply-fill"></i>
                          <span>Official Sub Admin Response</span>
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {item.repliedAt ? new Date(item.repliedAt).toLocaleDateString() : 'Published'}
                        </span>
                      </div>
                      <p className="text-dark small mb-0">{item.adminReply}</p>
                    </div>
                  ) : null}

                  {/* Action Buttons Row */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center pt-2 border-top gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                        onClick={() => setInspectItem(item)}
                      >
                        <i className="bi bi-eye"></i>
                        <span>Inspect Review</span>
                      </button>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2">
                      {canRespond && (
                        <button
                          type="button"
                          className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                          onClick={() => {
                            setReplyTarget(item);
                            setReplyText(item.adminReply || '');
                          }}
                        >
                          <i className="bi bi-reply text-primary"></i>
                          <span>{hasReplies ? 'Post Follow-up Reply' : 'Respond to Client'}</span>
                        </button>
                      )}

                      {canModerate && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            onClick={() => {
                              setModerateTarget(item);
                              setModerateAction(item.status === 'PUBLISHED' ? 'HIDE' : 'PUBLISH');
                              setModerateReason('');
                            }}
                          >
                            <i className="bi bi-shield-check"></i>
                            <span>Moderate</span>
                          </button>

                          {item.status !== 'REVIEWED' && item.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                              disabled={isSubmitting}
                              title="Mark as reviewed"
                            >
                              <i className="bi bi-check2 me-1"></i>
                              Reviewed
                            </button>
                          )}

                          {item.status !== 'FLAGGED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleUpdateStatus(item.id, 'FLAGGED', 'Marked for investigation by Subadmin')}
                              disabled={isSubmitting}
                              title="Flag for investigation"
                            >
                              <i className="bi bi-flag me-1"></i>
                              Flag
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            <div className="mt-2">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalRecords={pagination.total}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                onPageSizeChange={(pageSize) => setPagination((prev) => ({ ...prev, pageSize, page: 1 }))}
              />
            </div>
          </div>
        )}

        {/* Modal: Publish Official Reply */}
        {replyTarget && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Publish Official Response</h5>
                    <span className="text-muted small">
                      Review by {replyTarget.authorName} ({replyTarget.city}) &bull; {replyTarget.targetEntityName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setReplyTarget(null)}
                  ></button>
                </div>
                <form onSubmit={handleSendReply}>
                  <div className="modal-body p-4">
                    <div className="p-3 bg-light rounded-3 border mb-3 small text-muted">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark">{replyTarget.title}</strong>
                        <span>{renderStarRating(replyTarget.rating)}</span>
                      </div>
                      <p className="mb-0 text-dark">&ldquo;{replyTarget.comment}&rdquo;</p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Official Sub Admin Public Response <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Write a courteous acknowledgement, explanation or resolution details..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                        disabled={isSubmitting}
                      ></textarea>
                      <span className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                        This response will be visible on the public review card and sent to the client.
                      </span>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setReplyTarget(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-ardab-primary d-inline-flex align-items-center gap-1"
                      disabled={isSubmitting || !replyText.trim()}
                    >
                      {isSubmitting && <span className="spinner-border spinner-border-sm me-1" role="status"></span>}
                      <i className="bi bi-send-fill"></i>
                      <span>Publish Response</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Moderate Feedback */}
        {moderateTarget && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Moderation Action</h5>
                    <span className="text-muted small">
                      Auditable governance action for review #{moderateTarget.id.substring(0, 8)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setModerateTarget(null)}
                  ></button>
                </div>
                <form onSubmit={handleModerate}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Select Moderation Action
                      </label>
                      <select
                        className="form-select"
                        value={moderateAction}
                        onChange={(e) => setModerateAction(e.target.value as FeedbackModerationAction)}
                        required
                        disabled={isSubmitting}
                      >
                        <option value="PUBLISH">Publish (Make visible publicly)</option>
                        <option value="HIDE">Hide (Suppressed from public catalog)</option>
                        <option value="RESOLVE">Resolve (Mark completed/addressed)</option>
                        <option value="REJECT">Reject (Flagged as non-compliant review)</option>
                        <option value="ARCHIVE">Archive (Move to long-term storage)</option>
                        <option value="RESTORE">Restore (Reset to active pending state)</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Reason &amp; Compliance Notes {(moderateAction === 'HIDE' || moderateAction === 'REJECT') && <span className="text-danger">*</span>}
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Provide reason for moderation action (recorded in audit history)..."
                        value={moderateReason}
                        onChange={(e) => setModerateReason(e.target.value)}
                        required={moderateAction === 'HIDE' || moderateAction === 'REJECT'}
                        disabled={isSubmitting}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setModerateTarget(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <span className="spinner-border spinner-border-sm me-1" role="status"></span>}
                      <i className="bi bi-shield-check"></i>
                      <span>Apply Moderation</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Feedback Details & Inspection */}
        {inspectItem && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Review Inspection &amp; Audit Trail</h5>
                    <span className="text-muted small">Record ID: {inspectItem.id}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setInspectItem(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <div className="card bg-light border-0 p-3 h-100">
                        <span className="fw-semibold text-dark small mb-2 d-block">Review Summary</span>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="fs-5">{renderStarRating(inspectItem.rating)}</span>
                          <span className="badge bg-secondary">{inspectItem.rating} / 5</span>
                          <span className="badge bg-primary">{inspectItem.type}</span>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">{inspectItem.title}</h6>
                        <p className="text-muted small mb-0">&ldquo;{inspectItem.comment}&rdquo;</p>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="card bg-light border-0 p-3 h-100">
                        <span className="fw-semibold text-dark small mb-2 d-block">Author &amp; Context</span>
                        <table className="table table-sm table-borderless small mb-0">
                          <tbody>
                            <tr>
                              <td className="text-muted ps-0">Author:</td>
                              <td className="fw-semibold text-dark">{inspectItem.authorName}</td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Role:</td>
                              <td><span className="badge bg-light text-dark border">{inspectItem.authorRole}</span></td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Hub / City:</td>
                              <td className="fw-semibold">{inspectItem.city}</td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Target Entity:</td>
                              <td className="fw-semibold text-dark">{inspectItem.targetEntityName}</td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Order Verified:</td>
                              <td>
                                {inspectItem.isVerified ? (
                                  <span className="text-success fw-semibold">
                                    <i className="bi bi-check-circle-fill me-1"></i>Yes (Completed Order)
                                  </span>
                                ) : (
                                  <span className="text-muted">No</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Product / Delivery Links */}
                  {(inspectItem.customer || inspectItem.product || inspectItem.delivery || inspectItem.seller) && (
                    <div className="mb-4">
                      <h6 className="fw-bold text-dark mb-2">Linked Platform Entities</h6>
                      <div className="row g-2">
                        {inspectItem.customer && (
                          <div className="col-12 col-sm-6 col-md-3">
                            <div className="border rounded-3 p-2 small">
                              <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Customer</span>
                              <strong className="text-dark d-block">{inspectItem.customer.fullName}</strong>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{inspectItem.customer.customerCode}</span>
                            </div>
                          </div>
                        )}
                        {inspectItem.product && (
                          <div className="col-12 col-sm-6 col-md-3">
                            <div className="border rounded-3 p-2 small">
                              <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Product</span>
                              <strong className="text-dark d-block">{inspectItem.product.name}</strong>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{inspectItem.product.itemCode}</span>
                            </div>
                          </div>
                        )}
                        {inspectItem.seller && (
                          <div className="col-12 col-sm-6 col-md-3">
                            <div className="border rounded-3 p-2 small">
                              <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Seller/Supplier</span>
                              <strong className="text-dark d-block">{inspectItem.seller.companyName}</strong>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{inspectItem.seller.city}</span>
                            </div>
                          </div>
                        )}
                        {inspectItem.delivery && (
                          <div className="col-12 col-sm-6 col-md-3">
                            <div className="border rounded-3 p-2 small">
                              <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Delivery</span>
                              <strong className="text-dark d-block">{inspectItem.delivery.deliveryNumber}</strong>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Status: {inspectItem.delivery.status}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Responses History */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-dark mb-2">Response History</h6>
                    {inspectItem.responses && inspectItem.responses.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {inspectItem.responses.map((resp) => (
                          <div key={resp.id} className="p-3 bg-light rounded-3 border">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong className="text-primary small">
                                {resp.responderType} {resp.responderName ? `(${resp.responderName})` : ''}
                              </strong>
                              <span className="text-muted small">{new Date(resp.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-dark small mb-0">{resp.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : inspectItem.adminReply ? (
                      <div className="p-3 bg-light rounded-3 border">
                        <strong className="text-primary small d-block mb-1">Sub Admin Response</strong>
                        <p className="text-dark small mb-0">{inspectItem.adminReply}</p>
                      </div>
                    ) : (
                      <div className="text-muted small p-3 bg-light rounded-3 border">
                        No responses have been posted for this review yet.
                      </div>
                    )}
                  </div>

                  {/* Flag Reports History */}
                  {inspectItem.reports && inspectItem.reports.length > 0 && (
                    <div className="mb-2">
                      <h6 className="fw-bold text-danger mb-2">Flagged Abuse Reports</h6>
                      <div className="d-flex flex-column gap-2">
                        {inspectItem.reports.map((rep) => (
                          <div key={rep.id} className="p-2 border border-danger-subtle bg-danger-subtle rounded-3 small">
                            <div className="d-flex justify-content-between align-items-center">
                              <strong className="text-danger">Reason: {rep.reason}</strong>
                              <span className="badge bg-danger">{rep.status}</span>
                            </div>
                            {rep.description && <p className="mb-0 text-dark mt-1">{rep.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setInspectItem(null)}
                  >
                    Close
                  </button>
                  {canRespond && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setReplyTarget(inspectItem);
                        setReplyText(inspectItem.adminReply || '');
                        setInspectItem(null);
                      }}
                    >
                      <i className="bi bi-reply me-1"></i>
                      Reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
