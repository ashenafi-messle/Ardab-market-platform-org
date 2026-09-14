'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { supportApi } from '@/lib/api';
import { SupportTicket, TicketStatus, TicketPriority } from '@/types/support';

const STATUS_TABS: { label: string; value: TicketStatus | 'ALL' }[] = [
  { label: 'All Tickets', value: 'ALL' },
  { label: 'Open Queue', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function CustomerSupportPage() {
  const { selectedCity } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<TicketStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supportApi.getAll(selectedCity, activeTab).then((res) => {
      if (isMounted) setTickets(res);
    }).catch((e) => {
      console.error('Failed to load tickets:', e);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, activeTab]);

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus, notes?: string) => {
    try {
      const updated = await supportApi.updateStatus(ticketId, newStatus, notes);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      setActionSuccess(`Ticket ${updated.ticketNumber} marked as ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const updated = await supportApi.addMessage(selectedTicket.id, replyText);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket(updated);
      setReplyText('');
      setActionSuccess('Reply sent to customer successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const urgentCount = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'RESOLVED').length;
  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="badge bg-danger shadow-sm">URGENT</span>;
      case 'HIGH':
        return <span className="badge bg-warning text-dark">HIGH</span>;
      case 'MEDIUM':
        return <span className="badge bg-info text-dark">MEDIUM</span>;
      case 'LOW':
        return <span className="badge badge-neutral-soft">LOW</span>;
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Customer Support &amp; Inquiries"
        subtitle="Manage customer support tickets, payment disputes, and delivery issues across Ethiopian regional hubs"
        breadcrumbs={[{ label: 'Sub Admin' }, { label: 'Customer Support' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-bell-fill"></i>
              <span>{urgentCount} Urgent Tickets</span>
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

        {/* Support KPIs */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Open &amp; In-Progress</span>
              <div className="fs-3 fw-bold text-dark">{openCount}</div>
              <span className="badge badge-warning-soft mt-1">Active Queue</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Urgent Escalations</span>
              <div className="fs-3 fw-bold text-danger">{urgentCount}</div>
              <span className="text-muted small">Requires Priority SLA</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Average Resolution</span>
              <div className="fs-3 fw-bold text-success">28 min</div>
              <span className="badge badge-success-soft mt-1">96% On-Target</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Regional Scope</span>
              <div className="fs-3 fw-bold text-dark">{selectedCity}</div>
              <span className="text-muted small">Hub Support Desk</span>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${
                  activeTab === tab.value
                    ? 'btn-ardab-primary shadow-sm'
                    : 'btn-outline-secondary bg-white border'
                }`}
                onClick={() => setActiveTab(tab.value)}
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
                  placeholder="Search tickets by ticket # (SUP-XXXX), customer name, phone, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end">
              <span className="text-muted small">
                Showing <strong className="text-dark">{filteredTickets.length}</strong> tickets in {selectedCity}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Tickets Table */}
        <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden shadow-sm">
          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Customer &amp; Phone</th>
                  <th>City</th>
                  <th>Subject &amp; Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No support tickets found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className={ticket.priority === 'URGENT' && ticket.status !== 'RESOLVED' ? 'table-danger bg-opacity-10' : ''}>
                      <td>
                        <span className="fw-bold text-dark">{ticket.ticketNumber}</span>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                          {ticket.createdAt.split('T')[0]}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{ticket.customerName}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {ticket.customerPhone}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral-soft">{ticket.city}</span>
                      </td>
                      <td>
                        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 260 }}>
                          {ticket.subject}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          {ticket.category.replace('_', ' ')} {ticket.orderId && `• Order ${ticket.orderId}`}
                        </div>
                      </td>
                      <td>{getPriorityBadge(ticket.priority)}</td>
                      <td>
                        <span
                          className={`ardab-badge ${
                            ticket.status === 'RESOLVED'
                              ? 'badge-success-soft'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'badge-info-soft'
                              : ticket.status === 'CLOSED'
                              ? 'badge-neutral-soft'
                              : 'badge-warning-soft'
                          }`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setResolutionNotes(ticket.resolutionNotes || '');
                          }}
                        >
                          <i className="bi bi-chat-text me-1"></i> View &amp; Reply
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Tickets Cards */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {filteredTickets.length === 0 ? (
            <div className="card p-4 text-center text-muted border-0 shadow-sm rounded-4">
              No support tickets found.
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="ardab-card p-3 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span className="fw-bold text-dark fs-6">{ticket.ticketNumber}</span>
                    <div className="fw-semibold text-dark small">{ticket.customerName}</div>
                  </div>
                  {getPriorityBadge(ticket.priority)}
                </div>

                <div className="fw-medium text-dark small mb-2">{ticket.subject}</div>

                <div className="d-flex justify-content-between text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                  <span>{ticket.city} &bull; {ticket.customerPhone}</span>
                  <span className="badge badge-neutral-soft">{ticket.status.replace('_', ' ')}</span>
                </div>

                <div className="pt-2 border-top text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border w-100"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setResolutionNotes(ticket.resolutionNotes || '');
                    }}
                  >
                    View Conversation &amp; Resolve &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Details & Resolution Modal */}
        {selectedTicket && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        {selectedTicket.ticketNumber}
                      </h5>
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                    <span className="text-muted small">
                      {selectedTicket.city} &bull; Customer: {selectedTicket.customerName} ({selectedTicket.customerPhone})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedTicket(null)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {/* Status & Category Bar */}
                  <div className="p-3 bg-light rounded-3 border mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <span className="text-muted small d-block">Ticket Category</span>
                      <strong className="text-dark">{selectedTicket.category.replace('_', ' ')}</strong>
                      {selectedTicket.orderId && (
                        <span className="badge badge-info-soft ms-2">Linked to {selectedTicket.orderId}</span>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      {selectedTicket.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-semibold shadow-sm"
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'RESOLVED', resolutionNotes)}
                        >
                          <i className="bi bi-check2-circle me-1"></i> Mark Resolved
                        </button>
                      )}
                      {selectedTicket.status === 'OPEN' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary fw-semibold"
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'IN_PROGRESS')}
                        >
                          Take In-Progress
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subject Headline */}
                  <h6 className="fw-bold text-dark mb-3">
                    Subject: {selectedTicket.subject}
                  </h6>

                  {/* Message Thread */}
                  <div className="border rounded-3 p-3 bg-white mb-4" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {selectedTicket.messages.map((msg) => {
                      const isSubAdmin = msg.senderType === 'SUB_ADMIN';
                      return (
                        <div
                          key={msg.id}
                          className={`d-flex flex-column mb-3 ${isSubAdmin ? 'align-items-end' : 'align-items-start'}`}
                        >
                          <div className="d-flex align-items-center gap-2 small text-muted mb-1">
                            <span className="fw-bold text-dark">{msg.senderName}</span>
                            <span>&bull; {msg.timestamp}</span>
                            <span className={`badge ${isSubAdmin ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                              {msg.senderType}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-3 ${isSubAdmin ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                            style={{ maxWidth: '85%' }}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleSendReply} className="mb-4">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      Send Reply to Customer (Sub Admin Desk)
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type customer reply message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button type="submit" className="btn btn-ardab-primary" disabled={!replyText.trim()}>
                        <i className="bi bi-send me-1"></i> Send Reply
                      </button>
                    </div>
                  </form>

                  {/* Resolution Notes Section */}
                  <div>
                    <label className="form-label fw-semibold small text-dark mb-1">
                      Internal Resolution Notes
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Add internal resolution details (e.g. verified with driver, refund approved, supplier contacted)..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    {selectedTicket.status !== 'CLOSED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'CLOSED', resolutionNotes)}
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ardab-outline"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
