'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supportApi } from '@/lib/api';
import {
  SupportTicketListItem,
  SupportTicketStatus,
  SupportPagination,
} from '@/types/support';

export default function MySupportRequestsPage() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const isAmharic = language === 'am';

  // Filters & Pagination state
  const [requests, setRequests] = useState<SupportTicketListItem[]>([]);
  const [pagination, setPagination] = useState<SupportPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status tabs
  const statusTabs: { label: string; value: SupportTicketStatus | 'ALL' }[] = [
    { label: t('status_all', 'All'), value: 'ALL' },
    { label: t('status_open', 'Open'), value: 'OPEN' },
    { label: t('status_in_progress', 'In Progress'), value: 'IN_PROGRESS' },
    { label: t('status_waiting_for_customer', 'Waiting on You'), value: 'WAITING_FOR_CUSTOMER' },
    { label: t('status_resolved', 'Resolved'), value: 'RESOLVED' },
    { label: t('status_closed', 'Closed'), value: 'CLOSED' },
  ];

  // Auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/support/requests');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch paginated tickets from backend
  const fetchRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await supportApi.getMyRequests({
        page,
        pageSize: 10,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (res) {
        setRequests(Array.isArray(res.items) ? res.items : Array.isArray(res) ? res : []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err: any) {
      console.error('Failed to load support requests:', err);
      setError(err?.message || t('error_loading_support', "We couldn't load your support requests."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, statusFilter, searchTerm, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  // Status Badge UI
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
            <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
            {t('status_open', 'Open')}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-3 py-1">
            <i className="bi bi-arrow-repeat me-1"></i>
            {t('status_in_progress', 'In Progress')}
          </span>
        );
      case 'WAITING_FOR_CUSTOMER':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1">
            <i className="bi bi-hourglass-split me-1"></i>
            {t('status_waiting_for_customer', 'Waiting on You')}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1">
            <i className="bi bi-check-circle-fill me-1"></i>
            {t('status_resolved', 'Resolved')}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3 py-1">
            <i className="bi bi-archive-fill me-1"></i>
            {t('status_closed', 'Closed')}
          </span>
        );
      default:
        return <span className="badge bg-light text-dark rounded-pill px-3 py-1">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return <span className="badge bg-danger text-white rounded-pill px-2 py-0.5 small">{t('priority_urgent', 'Urgent')}</span>;
      case 'HIGH':
        return <span className="badge bg-warning text-dark rounded-pill px-2 py-0.5 small">{t('priority_high', 'High')}</span>;
      default:
        return null;
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
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('my_support_requests', 'My Support Requests')}
          </li>
        </ol>
      </nav>

      {/* Page Title & New Request CTA */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 text-dark">
            <i className="bi bi-ticket-perforated text-success me-2"></i>
            {t('my_support_requests', 'My Support Requests')}
          </h1>
          <p className="text-muted small mb-0">
            {t('my_support_requests_subtitle', 'Track your support conversations, tickets, and staff replies here')}
          </p>
        </div>
        <Link href="/support/new" className="btn btn-fresh rounded-pill px-4 py-2 shadow-sm align-self-start align-self-sm-auto">
          <i className="bi bi-plus-lg me-1"></i>
          {t('new_support_request', 'New Request')}
        </Link>
      </div>

      {/* Status Filter Tabs (Scrollable on small mobile screens) */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
        <div className="card-body p-2 p-md-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3">
            {/* Status Tabs */}
            <div className="d-flex gap-1 overflow-x-auto pb-2 pb-md-0 scrollbar-none" style={{ whiteSpace: 'nowrap' }}>
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                    statusFilter === tab.value
                      ? 'btn-success text-white shadow-sm'
                      : 'btn-light text-muted'
                  }`}
                  onClick={() => handleStatusChange(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2" style={{ minWidth: '260px' }}>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control rounded-start-pill border-end-0 ps-3"
                  placeholder={isAmharic ? 'በርዕስ ወይም ቁጥር ፈልግ...' : 'Search ticket or subject...'}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-outline-secondary border-start-0 rounded-end-pill px-3"
                  title="Search"
                >
                  <i className="bi bi-search"></i>
                </button>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill px-2"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setPage(1);
                  }}
                  title="Clear"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="d-flex flex-column gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card border-0 shadow-sm rounded-4 p-4 placeholder-glow">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="placeholder col-3 py-2 rounded"></div>
                <div className="placeholder col-2 py-2 rounded-pill"></div>
              </div>
              <div className="placeholder col-6 py-2 mb-2 rounded"></div>
              <div className="placeholder col-4 py-1 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
          <i className="bi bi-exclamation-octagon text-danger display-4 mb-3"></i>
          <h4 className="h5 fw-bold text-dark mb-2">{t('error_loading_support', "We couldn't load your support requests.")}</h4>
          <p className="text-muted small mb-4">{error}</p>
          <div>
            <button onClick={fetchRequests} className="btn btn-fresh rounded-pill px-4">
              <i className="bi bi-arrow-clockwise me-2"></i>
              {t('retry', 'Try again')}
            </button>
          </div>
        </div>
      ) : requests.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {requests.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/requests/${ticket.ticketNumber || ticket.id}`}
              className="text-decoration-none text-dark"
            >
              <div className={`card border-0 shadow-sm rounded-4 p-3 p-md-4 hover-elevate transition-all ${ticket.hasUnreadReply ? 'border-start border-4 border-success' : ''}`}>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-2">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-bold font-monospace text-success small">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5 small">
                      {ticket.category || 'General'}
                    </span>
                    {ticket.orderNumber && (
                      <span className="badge bg-light text-dark border rounded-pill px-2 py-0.5 small">
                        <i className="bi bi-box-seam me-1 text-primary"></i>
                        {ticket.orderNumber}
                      </span>
                    )}
                    {getPriorityBadge(ticket.priority)}
                    {ticket.hasUnreadReply && (
                      <span className="badge bg-success text-white rounded-pill px-2 py-0.5 small pulse-badge">
                        <i className="bi bi-bell-fill me-1"></i>
                        {t('unread_reply', 'New Reply')}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>

                <h2 className="h6 fw-bold text-dark mb-2 line-clamp-1">{ticket.subject}</h2>

                <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small pt-2 border-top mt-2">
                  <div className="d-flex align-items-center gap-3">
                    <span>
                      <i className="bi bi-calendar3 me-1"></i>
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}
                    </span>
                    <span>
                      <i className="bi bi-chat-dots me-1"></i>
                      {ticket.messagesCount} {isAmharic ? 'መልዕክቶች' : 'messages'}
                    </span>
                  </div>
                  <div className="text-success fw-semibold small mt-2 mt-sm-0">
                    {t('view_conversation', 'View Conversation')} &rarr;
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Server-side Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4 pt-2">
              <span className="text-muted small">
                {isAmharic
                  ? `ከ ${pagination.total} ጥያቄዎች ውስጥ ገጽ ${pagination.page} ከ ${pagination.totalPages}`
                  : `Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} requests)`}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-start-pill px-3"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  &larr; {isAmharic ? 'ቀዳሚ' : 'Previous'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-end-pill px-3"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {isAmharic ? 'ቀጣይ' : 'Next'} &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
          <div className="rounded-circle bg-white text-muted mx-auto d-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
            <i className="bi bi-chat-square-dots display-5"></i>
          </div>
          <h3 className="h5 fw-bold text-dark mb-2">
            {t('no_support_requests', "You haven't contacted Ardab Support yet.")}
          </h3>
          <p className="text-muted small mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
            {t('no_support_requests_desc', 'If you have any questions or need help with an order, create a ticket to get started.')}
          </p>
          <div>
            <Link href="/support/new" className="btn btn-fresh rounded-pill px-4 py-2 shadow-sm">
              <i className="bi bi-plus-lg me-1"></i>
              {t('new_support_request', 'Create Support Ticket')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
