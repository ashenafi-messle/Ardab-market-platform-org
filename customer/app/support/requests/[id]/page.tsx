'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supportApi } from '@/lib/api';
import {
  SupportTicketDetail,
  SupportMessage,
} from '@/types/support';

export default function SupportConversationDetailPage() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const requestId = params?.id as string;

  const isAmharic = language === 'am';

  // State
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/support/requests/${requestId}`);
    }
  }, [authLoading, isAuthenticated, router, requestId]);

  // Fetch ticket details & messages
  const fetchTicket = useCallback(async () => {
    if (!requestId || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await supportApi.getRequestById(requestId);
      setTicket(data);

      // Auto-mark conversation as read on customer side
      supportApi.markAsRead(requestId).catch(() => {});
    } catch (err: any) {
      console.error('Failed to load support ticket:', err);
      setError(err?.message || t('error_loading_support', "We couldn't load your support request."));
    } finally {
      setLoading(false);
    }
  }, [requestId, isAuthenticated, t]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (ticket?.messages?.length) {
      scrollToBottom();
    }
  }, [ticket?.messages]);

  // Handle customer reply submission with Optimistic UI
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    const textToSend = replyText.trim();
    const tempId = `temp_${Date.now()}`;
    const idempotencyKey = `cust_reply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: SupportMessage = {
      id: tempId,
      body: textToSend,
      senderType: 'CUSTOMER',
      isSelf: true,
      senderName: 'You',
      createdAt: new Date().toISOString(),
    };

    // Optimistically update conversation and clear input immediately
    setReplyText('');
    setReplyError(null);
    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: prev.status === 'WAITING_FOR_CUSTOMER' ? 'IN_PROGRESS' : prev.status,
        messages: [...prev.messages, optimisticMsg],
      };
    });
    setTimeout(scrollToBottom, 50);

    setIsSending(true);
    try {
      const newMsg = await supportApi.replyRequest(requestId, {
        message: textToSend,
        idempotencyKey,
      });

      // Update confirmed message id/timestamp in local state
      if (newMsg) {
        setTicket((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => (m.id === tempId ? newMsg : m)),
          };
        });
      }
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      // Remove optimistic message and restore draft text
      setTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== tempId),
        };
      });
      setReplyText(textToSend);
      setReplyError(
        err?.message || (isAmharic ? 'መልዕክት መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to send reply. Please try again.')
      );
    } finally {
      setIsSending(false);
    }
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

  const isReplyAllowed =
    ticket &&
    ticket.status !== 'CLOSED' &&
    ticket.status !== 'RESOLVED';

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
            #{ticket?.ticketNumber || requestId}
          </li>
        </ol>
      </nav>

      {/* Loading state */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
          <div className="spinner-border text-success mx-auto mb-3" role="status"></div>
          <p className="text-muted mb-0">{t('loading_support', 'Loading support conversation...')}</p>
        </div>
      ) : error ? (
        /* Error state */
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
          <i className="bi bi-exclamation-triangle text-danger display-4 mb-3"></i>
          <h4 className="h5 fw-bold text-dark mb-2">{t('error_loading_support', "We couldn't load your support request.")}</h4>
          <p className="text-muted small mb-4">{error}</p>
          <div className="d-flex justify-content-center gap-2">
            <Link href="/support/requests" className="btn btn-outline-secondary rounded-pill px-4">
              &larr; {t('my_support_requests', 'Back to My Requests')}
            </Link>
            <button onClick={fetchTicket} className="btn btn-fresh rounded-pill px-4">
              <i className="bi bi-arrow-clockwise me-1"></i> {t('retry', 'Try again')}
            </button>
          </div>
        </div>
      ) : ticket ? (
        /* Conversation Container */
        <div className="row g-4">
          {/* Main Thread (Left Column on Desktop, Full Width on Mobile) */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ minHeight: '650px' }}>
              {/* Conversation Header */}
              <div className="card-header bg-white border-bottom p-3 p-md-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-2">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-bold font-monospace text-success">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5 small">
                      {ticket.category || 'General'}
                    </span>
                    {ticket.priority && (
                      <span className="badge bg-light text-dark border rounded-pill px-2 py-0.5 small">
                        {ticket.priority}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>
                <h1 className="h5 fw-bold text-dark mb-0">{ticket.subject}</h1>
              </div>

              {/* Message List Area */}
              <div
                className="card-body p-3 p-md-4 overflow-y-auto bg-light d-flex flex-column gap-3 flex-grow-1"
                style={{ maxHeight: '550px' }}
              >
                {ticket.messages && ticket.messages.length > 0 ? (
                  ticket.messages.map((msg, idx) => {
                    const isSelf = msg.isSelf || msg.senderType === 'CUSTOMER';
                    const isSubAdmin = msg.senderType === 'SUBADMIN';

                    return (
                      <div
                        key={msg.id || idx}
                        className={`d-flex flex-column ${isSelf ? 'align-items-end' : 'align-items-start'}`}
                      >
                        {/* Sender Label & Timestamp */}
                        <div className="d-flex align-items-center gap-2 mb-1 px-1">
                          <span className="fw-bold small text-dark">
                            {isSelf ? (isAmharic ? 'እርስዎ' : 'You') : isSubAdmin ? 'Ardab Support' : msg.senderName}
                          </span>
                          {!isSelf && isSubAdmin && (
                            <span className="badge bg-success-subtle text-success rounded-pill px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                              <i className="bi bi-patch-check-fill me-1"></i>Official Support
                            </span>
                          )}
                          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`p-3 rounded-4 shadow-sm text-break ${
                            isSelf
                              ? 'bg-success text-white rounded-bottom-end-0'
                              : 'bg-white text-dark rounded-bottom-start-0 border'
                          }`}
                          style={{ maxWidth: '85%', whiteSpace: 'pre-wrap' }}
                        >
                          {msg.body}
                        </div>

                        {/* Full Date Timestamp */}
                        <div className="text-muted px-1 mt-1" style={{ fontSize: '0.7rem' }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-chat-dots display-4 d-block mb-2"></i>
                    {isAmharic ? 'ምንም መልዕክት የለም።' : 'No messages yet.'}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Composer or Notice */}
              <div className="card-footer bg-white border-top p-3 p-md-4">
                {isReplyAllowed ? (
                  <form onSubmit={handleSendReply}>
                    {replyError && (
                      <div className="alert alert-danger border-0 rounded-3 py-2 px-3 small mb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle"></i>
                        <span>{replyError}</span>
                      </div>
                    )}
                    <div className="d-flex flex-column gap-2">
                      <textarea
                        className="form-control rounded-4 border p-3"
                        rows={3}
                        placeholder={t('write_reply', 'Type your reply here...')}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={5000}
                        disabled={isSending}
                        required
                      ></textarea>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {replyText.length}/5000 {isAmharic ? 'ፊደላት' : 'characters'}
                        </small>
                        <button
                          type="submit"
                          className="btn btn-fresh rounded-pill px-4 py-2 fw-semibold shadow-sm d-flex align-items-center gap-2"
                          disabled={!replyText.trim() || isSending}
                        >
                          {isSending ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              <span>{t('submitting', 'Sending...')}</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-send-fill"></i>
                              <span>{t('send_reply', 'Send Reply')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="alert alert-secondary border-0 rounded-4 p-3 mb-0 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-lock-fill fs-5 text-muted"></i>
                      <div className="small text-muted">
                        {ticket.status === 'CLOSED'
                          ? t('ticket_closed_notice', 'This support ticket is closed and cannot receive new replies.')
                          : t('ticket_resolved_notice', 'This support ticket is resolved.')}
                      </div>
                    </div>
                    <Link href="/support/new" className="btn btn-sm btn-outline-success rounded-pill px-3 whitespace-nowrap">
                      {t('new_support_request', 'Open New Ticket')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Information Sidebar (Desktop Column / Bottom on Mobile) */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h2 className="h6 fw-bold text-dark border-bottom pb-3 mb-3">
                <i className="bi bi-info-circle me-2 text-success"></i>
                {isAmharic ? 'የጥያቄው መረጃ' : 'Ticket Information'}
              </h2>

              <div className="d-flex flex-column gap-3 small">
                <div>
                  <span className="text-muted d-block">{t('request_number', 'Ticket Number')}</span>
                  <span className="fw-bold text-dark font-monospace">#{ticket.ticketNumber}</span>
                </div>

                <div>
                  <span className="text-muted d-block">{t('status', 'Status')}</span>
                  <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                </div>

                <div>
                  <span className="text-muted d-block">{t('category', 'Category')}</span>
                  <span className="fw-semibold text-dark">{ticket.category || 'General'}</span>
                </div>

                <div>
                  <span className="text-muted d-block">{t('priority', 'Priority')}</span>
                  <span className="fw-semibold text-dark">{ticket.priority || 'NORMAL'}</span>
                </div>

                <div>
                  <span className="text-muted d-block">{isAmharic ? 'የተከፈተበት ቀን' : 'Created Date'}</span>
                  <span className="text-dark">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                  </span>
                </div>

                {ticket.order && (
                  <div className="pt-2 border-top">
                    <span className="text-muted d-block mb-1">{isAmharic ? 'ተዛማጅ ትዕዛዝ' : 'Linked Order'}</span>
                    <Link
                      href={`/orders/${ticket.order.id}`}
                      className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light text-decoration-none border hover-elevate transition-all"
                    >
                      <div>
                        <div className="fw-bold text-dark">#{ticket.order.orderNumber}</div>
                        <small className="text-muted">{ticket.order.status} • {ticket.order.totalAmount} ETB</small>
                      </div>
                      <i className="bi bi-box-arrow-up-right text-success"></i>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Help Box */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-light">
              <h3 className="h6 fw-bold text-dark mb-2">
                <i className="bi bi-question-circle text-primary me-2"></i>
                {isAmharic ? 'እርዳታ ይፈልጋሉ?' : 'Need more help?'}
              </h3>
              <p className="text-muted small mb-3">
                {isAmharic
                  ? 'የአርዳብ ድጋፍ ሰራተኞች ጥያቄዎን በመገምገም በተቻለ ፍጥነት መልስ ይሰጣሉ።'
                  : 'Ardab support agents review all incoming inquiries and will respond directly in this conversation.'}
              </p>
              <Link href="/support" className="btn btn-sm btn-outline-secondary rounded-pill w-100">
                &larr; {t('help_center', 'Back to Help Center')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
