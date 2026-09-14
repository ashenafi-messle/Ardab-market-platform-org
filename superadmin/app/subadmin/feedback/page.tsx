'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { feedbackApi } from '@/lib/api';
import { FeedbackItem, FeedbackMetrics, FeedbackType, FeedbackStatus } from '@/types/feedback';

const TYPE_TABS: { label: string; value: FeedbackType | 'ALL' }[] = [
  { label: 'All Reviews', value: 'ALL' },
  { label: 'Commodity Products', value: 'PRODUCT' },
  { label: 'Delivery Runs', value: 'DELIVERY' },
  { label: 'Platform & App', value: 'PLATFORM' },
  { label: 'Supplier Handover', value: 'SUPPLIER' },
];

export default function FeedbackManagementPage() {
  const { selectedCity } = useAuth();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [activeType, setActiveType] = useState<FeedbackType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      feedbackApi.getAll(activeType, selectedCity),
      feedbackApi.getMetrics(),
    ]).then(([list, met]) => {
      if (isMounted) {
        setFeedbackList(list);
        setMetrics(met);
      }
    }).catch((err) => {
      console.error('Failed to load feedback:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [activeType, selectedCity]);

  const handleUpdateStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const updated = await feedbackApi.updateStatus(id, status);
      setFeedbackList((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setActionSuccess(`Feedback marked as ${status}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !replyText.trim()) return;

    try {
      const updated = await feedbackApi.replyToFeedback(selectedItem.id, replyText);
      setFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSelectedItem(null);
      setReplyText('');
      setActionSuccess('Official response published to review.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = feedbackList.filter((item) => {
    const matchesSearch =
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetEntityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <PageContainer
        title="Feedback &amp; Reputation Management"
        subtitle="Manage customer product reviews, delivery satisfaction ratings, and publish administrative responses"
        breadcrumbs={[{ label: 'Sub Admin' }, { label: 'Feedback Management' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-star-fill text-warning-emphasis"></i>
              <span>{metrics?.averageRating || 4.85} Overall Average</span>
            </span>
          </div>
        }
      >
        {/* Flash Message */}
        {actionSuccess && (
          <div className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionSuccess}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionSuccess(null)}></button>
          </div>
        )}

        {/* Feedback Metrics */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Average Rating</span>
              <div className="fs-3 fw-bold text-dark">
                {metrics?.averageRating || 4.85} <span className="text-warning fs-4">★</span>
              </div>
              <span className="badge badge-success-soft mt-1">Out of 5.0 Stars</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Net Promoter Score (NPS)</span>
              <div className="fs-3 fw-bold text-success">+{metrics?.netPromoterScore || 86}</div>
              <span className="text-muted small">World Class Satisfaction</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Positive Sentiment</span>
              <div className="fs-3 fw-bold text-primary">{metrics?.positivePercentage || 92}%</div>
              <span className="badge badge-info-soft mt-1">6% Neutral &bull; 2% Negative</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Total Verified Reviews</span>
              <div className="fs-3 fw-bold text-dark">{metrics?.totalReviews || 342}</div>
              <span className="text-muted small">Clients &amp; Suppliers ({selectedCity})</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${
                  activeType === tab.value
                    ? 'btn-ardab-primary shadow-sm'
                    : 'btn-outline-secondary bg-white border'
                }`}
                onClick={() => setActiveType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search feedback by author, product name, driver, or review content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end">
              <span className="text-muted small">
                Showing <strong className="text-dark">{filteredItems.length}</strong> reviews in {selectedCity}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Cards Stream */}
        <div className="d-flex flex-column gap-3 mb-4">
          {filteredItems.length === 0 ? (
            <div className="ardab-card p-5 text-center text-muted">
              <i className="bi bi-chat-square-dots fs-1 d-block mb-2 text-secondary opacity-50"></i>
              No reviews found matching the selected filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
              return (
                <div key={item.id} className="ardab-card p-4 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="text-warning fs-5 fw-bold">{stars}</span>
                        <span className="badge badge-neutral-soft" style={{ fontSize: '0.7rem' }}>
                          {item.type}
                        </span>
                        <span
                          className={`badge ${
                            item.sentiment === 'POSITIVE'
                              ? 'badge-success-soft'
                              : item.sentiment === 'NEGATIVE'
                              ? 'badge-danger-soft'
                              : 'badge-warning-soft'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {item.sentiment}
                        </span>
                      </div>
                      <h5 className="fw-bold text-dark mb-1">{item.title}</h5>
                      <span className="text-muted small">
                        By <strong className="text-dark">{item.authorName}</strong> ({item.authorRole}) &bull; {item.city} &bull; Target: <strong className="text-dark">{item.targetEntityName}</strong>
                      </span>
                    </div>
                    <span className="text-muted small">{item.createdAt}</span>
                  </div>

                  {/* Customer Comment */}
                  <p className="text-dark small mb-3 p-3 bg-light rounded-3 border">
                    &ldquo;{item.comment}&rdquo;
                  </p>

                  {/* Administrative Reply Box */}
                  {item.adminReply && (
                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary-subtle mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-primary small">
                          <i className="bi bi-reply-fill me-1"></i> Official Sub Admin Response
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {item.repliedAt || 'Recently'}
                        </span>
                      </div>
                      <p className="text-dark small mb-0">{item.adminReply}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <div>
                      <span className="text-muted small">Status: </span>
                      <span
                        className={`badge ${
                          item.status === 'REVIEWED'
                            ? 'badge-success-soft'
                            : item.status === 'FLAGGED'
                            ? 'badge-danger-soft'
                            : 'badge-info-soft'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => {
                          setSelectedItem(item);
                          setReplyText(item.adminReply || '');
                        }}
                      >
                        <i className="bi bi-reply me-1 text-primary"></i>
                        {item.adminReply ? 'Edit Response' : 'Respond to Client'}
                      </button>
                      {item.status !== 'REVIEWED' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                        >
                          Mark Reviewed
                        </button>
                      )}
                      {item.status !== 'FLAGGED' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleUpdateStatus(item.id, 'FLAGGED')}
                        >
                          Flag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply to Feedback Modal */}
        {selectedItem && (
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
                    <span className="text-muted small">Review by {selectedItem.authorName} ({selectedItem.city})</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setSelectedItem(null)}></button>
                </div>
                <form onSubmit={handleSendReply}>
                  <div className="modal-body p-4">
                    <div className="p-3 bg-light rounded-3 border mb-3 small text-muted">
                      <strong className="text-dark d-block mb-1">{selectedItem.title}</strong>
                      &ldquo;{selectedItem.comment}&rdquo;
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Sub Admin Official Reply
                      </label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Write professional feedback acknowledgment and actions taken..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedItem(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-ardab-primary">
                      Publish Response
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
