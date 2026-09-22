'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { supportApi, SupportListParams } from '@/lib/api';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  SupportCategory,
  SupportStatistics,
} from '@/types/support';
import { hasPermission } from '@/lib/permissions';

const STATUS_TABS: { label: string; value: TicketStatus | 'ALL' }[] = [
  { label: 'All Tickets', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Waiting on Customer', value: 'WAITING_FOR_CUSTOMER' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function CustomerSupportPage() {
  const { user, selectedCity } = useAuth();

  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [statistics, setStatistics] = useState<SupportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<TicketStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Ticket Detail Modal State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoadingTicketDetail, setIsLoadingTicketDetail] = useState<boolean>(false);
  const [composerTab, setComposerTab] = useState<'reply' | 'note'>('reply');
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createCustomerId, setCreateCustomerId] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createPriority, setCreatePriority] = useState<TicketPriority>('NORMAL');
  const [createOrderId, setCreateOrderId] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);

  // Email retry state
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);

  // Permissions
  const canManage = hasPermission(user?.role, 'support:manage');
  const canAssign = hasPermission(user?.role, 'support:assign');
  const canResolve = hasPermission(user?.role, 'support:resolve');

  // Fetch KPI statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await supportApi.getStatistics(selectedCity);
      setStatistics(stats);
    } catch (e) {
      console.error('Failed to load support statistics:', e);
    }
  }, [selectedCity]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await supportApi.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }, []);

  // Fetch Tickets List
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: SupportListParams = {
        page,
        pageSize: 15,
        search: searchTerm.trim() || undefined,
        status: activeTab !== 'ALL' ? activeTab : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        sortBy: 'lastMessageAt',
        sortOrder: 'desc',
      };

      const result = await supportApi.getList(params);
      setTickets(result.items || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalCount(result.pagination?.total || 0);
    } catch (e) {
      console.error('Failed to load support tickets:', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, activeTab, selectedPriority, selectedCategory, selectedCity]);

  // Initial & Filter Effects
  useEffect(() => {
    fetchStatistics();
    fetchCategories();
  }, [fetchStatistics, fetchCategories]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Open ticket detail
  const handleOpenTicket = async (ticketId: string) => {
    setIsLoadingTicketDetail(true);
    try {
      const detailed = await supportApi.getById(ticketId);
      if (detailed) {
        setSelectedTicket(detailed);
        setResolutionNotes(detailed.resolutionNotes || '');
      }
    } catch (e) {
      console.error('Failed to load ticket details:', e);
    } finally {
      setIsLoadingTicketDetail(false);
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus, notes?: string) => {
    try {
      const updated = await supportApi.updateStatus(ticketId, newStatus, notes);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      fetchStatistics();
      setActionSuccess(`Ticket ${updated.ticketNumber} updated to ${newStatus.replace(/_/g, ' ')}.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (e: any) {
      setActionError(e.message || 'Failed to update ticket status');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  // Assign ticket handler
  const handleAssignTicket = async (ticketId: string, adminId: string | null) => {
    try {
      const updated = await supportApi.assign(ticketId, adminId);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      fetchStatistics();
      setActionSuccess(adminId ? 'Ticket assigned successfully.' : 'Ticket unassigned.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (e: any) {
      setActionError(e.message || 'Failed to assign ticket');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  // Send Public Reply Handler
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingMessage(true);
    setActionError(null);
    try {
      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await supportApi.reply(selectedTicket.id, replyText, idempotencyKey);
      
      // Refresh detailed ticket
      const refreshed = await supportApi.getById(selectedTicket.id);
      if (refreshed) {
        setSelectedTicket(refreshed);
        setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
      }
      setReplyText('');
      fetchStatistics();
      setActionSuccess('Official reply recorded and email notification dispatched to customer.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to send reply to customer');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Add Internal Staff Note Handler
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !internalNoteText.trim()) return;

    setIsSubmittingMessage(true);
    setActionError(null);
    try {
      await supportApi.addInternalNote(selectedTicket.id, internalNoteText);
      const refreshed = await supportApi.getById(selectedTicket.id);
      if (refreshed) {
        setSelectedTicket(refreshed);
        setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
      }
      setInternalNoteText('');
      setActionSuccess('Internal note added. (This note is private and never sent to customer).');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to save internal note');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Retry Email Delivery Handler
  const handleRetryEmail = async (ticketId: string, emailLogId: string) => {
    setRetryingEmailId(emailLogId);
    try {
      await supportApi.retryEmail(ticketId, emailLogId);
      const refreshed = await supportApi.getById(ticketId);
      if (refreshed) {
        setSelectedTicket(refreshed);
      }
      setActionSuccess('Email delivery re-attempt dispatched successfully.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (e: any) {
      setActionError(e.message || 'Failed to re-attempt email delivery');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setRetryingEmailId(null);
    }
  };

  // Create Ticket Handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCustomerId.trim() || !createSubject.trim()) {
      setActionError('Customer ID and Subject are required');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const created = await supportApi.create({
        customerId: createCustomerId.trim(),
        subject: createSubject.trim(),
        description: createDescription.trim() || undefined,
        categoryId: createCategory || undefined,
        priority: createPriority,
        city: selectedCity !== 'All Cities' ? selectedCity : 'Gondar',
        orderId: createOrderId.trim() || undefined,
      });

      setShowCreateModal(false);
      setCreateCustomerId('');
      setCreateSubject('');
      setCreateDescription('');
      setCreateCategory('');
      setCreateOrderId('');
      setCreatePriority('NORMAL');

      fetchTickets();
      fetchStatistics();
      setActionSuccess(`Support ticket ${created.ticketNumber} created successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to create support ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="badge bg-danger shadow-sm">URGENT</span>;
      case 'HIGH':
        return <span className="badge bg-warning text-dark">HIGH</span>;
      case 'MEDIUM':
      case 'NORMAL':
        return <span className="badge bg-info text-dark">NORMAL</span>;
      case 'LOW':
        return <span className="badge badge-neutral-soft">LOW</span>;
      default:
        return <span className="badge badge-neutral-soft">{priority}</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">RESOLVED</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">IN PROGRESS</span>;
      case 'WAITING_FOR_CUSTOMER':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">WAITING CUSTOMER</span>;
      case 'CLOSED':
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">CLOSED</span>;
      case 'OPEN':
      default:
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">OPEN</span>;
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
            {canManage && (
              <button
                type="button"
                className="btn btn-ardab-primary d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>New Ticket</span>
              </button>
            )}
            <span className="badge bg-danger rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-bell-fill"></i>
              <span>{statistics?.urgentTickets ?? 0} Urgent</span>
            </span>
          </div>
        }
      >
        {/* Flash Success Message */}
        {actionSuccess && (
          <div className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionSuccess}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionSuccess(null)}></button>
          </div>
        )}

        {/* Flash Error Message */}
        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
              <span className="fw-medium">{actionError}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionError(null)}></button>
          </div>
        )}

        {/* Support KPIs */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Active Queue (Open &amp; In-Prog)</span>
              <div className="fs-3 fw-bold text-dark">{statistics?.activeQueueCount ?? 0}</div>
              <span className="badge badge-warning-soft mt-1">{statistics?.openTickets ?? 0} Open Tickets</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Urgent Escalations</span>
              <div className="fs-3 fw-bold text-danger">{statistics?.urgentTickets ?? 0}</div>
              <span className="text-muted small">Requires Priority SLA</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Resolved Tickets</span>
              <div className="fs-3 fw-bold text-success">{statistics?.resolvedTickets ?? 0}</div>
              <span className="badge badge-success-soft mt-1">Avg ~{statistics?.averageResolutionMinutes ?? 28}m SLA</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Unassigned Queue</span>
              <div className="fs-3 fw-bold text-dark">{statistics?.unassignedTickets ?? 0}</div>
              <span className="text-muted small">Hub: {selectedCity}</span>
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
                onClick={() => {
                  setActiveTab(tab.value);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by ticket # (ARD-SUP-...), customer name, phone, or subject..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="col-12 col-md-2 text-md-end">
              <span className="text-muted small">
                Showing <strong className="text-dark">{tickets.length}</strong> of {totalCount}
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
                  <th>Assigned To</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading customer support tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No support tickets found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={ticket.priority === 'URGENT' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? 'table-danger bg-opacity-10' : ''}
                    >
                      <td>
                        <span className="fw-bold text-dark">{ticket.ticketNumber}</span>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                          {ticket.createdAt?.split('T')[0]}
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
                        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 240 }}>
                          {ticket.subject}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          {ticket.category?.replace(/_/g, ' ')} {ticket.orderId && `• Order ${ticket.orderId}`}
                        </div>
                      </td>
                      <td>{getPriorityBadge(ticket.priority)}</td>
                      <td>{getStatusBadge(ticket.status)}</td>
                      <td>
                        {ticket.assignedSubadmin?.name || (ticket.assignedTo && ticket.assignedTo !== 'Unassigned') ? (
                          <span className="badge bg-light text-dark border px-2 py-1">
                            <i className="bi bi-person-check me-1 text-primary"></i>
                            {ticket.assignedSubadmin?.name || ticket.assignedTo}
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border px-2 py-1">
                            <i className="bi bi-person me-1"></i>
                            {user?.name || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => handleOpenTicket(ticket.id)}
                        >
                          <i className="bi bi-chat-text me-1"></i> Open Ticket
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
          {isLoading ? (
            <div className="card p-4 text-center text-muted border-0 shadow-sm rounded-4">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="card p-4 text-center text-muted border-0 shadow-sm rounded-4">
              No support tickets found.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="ardab-card p-3 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span className="fw-bold text-dark fs-6">{ticket.ticketNumber}</span>
                    <div className="fw-semibold text-dark small">{ticket.customerName}</div>
                  </div>
                  {getPriorityBadge(ticket.priority)}
                </div>

                <div className="fw-medium text-dark small mb-2">{ticket.subject}</div>

                <div className="d-flex justify-content-between text-muted small mb-1" style={{ fontSize: '0.75rem' }}>
                  <span><i className="bi bi-person me-1"></i>{ticket.assignedSubadmin?.name || (ticket.assignedTo && ticket.assignedTo !== 'Unassigned' ? ticket.assignedTo : null) || user?.name || 'Unassigned'}</span>
                  <span>{ticket.city} &bull; {ticket.customerPhone}</span>
                </div>
                <div className="d-flex justify-content-end mb-2">
                  {getStatusBadge(ticket.status)}
                </div>

                <div className="pt-2 border-top text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border w-100"
                    onClick={() => handleOpenTicket(ticket.id)}
                  >
                    View Conversation &amp; Resolve &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center py-2 px-1 mb-4">
            <span className="text-muted small">
              Page {page} of {totalPages} ({totalCount} tickets)
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Ticket Details & Resolution Modal */}
        {selectedTicket && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        {selectedTicket.ticketNumber}
                      </h5>
                      {getPriorityBadge(selectedTicket.priority)}
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <span className="text-muted small">
                      {selectedTicket.city} Hub &bull; Created {selectedTicket.createdAt?.split('T')[0]}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedTicket(null)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {isLoadingTicketDetail ? (
                    <div className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading complete conversation thread...
                    </div>
                  ) : (
                    <>
                      {/* Customer & Ticket Metadata Bar */}
                      <div className="p-3 bg-light rounded-3 border mb-4">
                        <div className="row g-2">
                          <div className="col-12 col-md-6">
                            <span className="text-muted small d-block">Customer Details</span>
                            <div className="fw-bold text-dark">{selectedTicket.customerName}</div>
                            <div className="text-muted small">
                              <i className="bi bi-telephone me-1"></i>{selectedTicket.customerPhone}
                            </div>
                            <div className="small text-primary mt-1 d-flex align-items-center gap-1">
                              <i className="bi bi-envelope-check-fill text-success"></i>
                              <span className="fw-semibold">
                                {selectedTicket.customerEmail || 'No registered email found'}
                              </span>
                              <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: '0.65rem' }}>
                                Authoritative
                              </span>
                            </div>
                          </div>
                          <div className="col-12 col-md-6">
                            <span className="text-muted small d-block">Category &amp; Assignment</span>
                            <div className="fw-medium text-dark">
                              {selectedTicket.category?.replace(/_/g, ' ')}
                            </div>
                            {selectedTicket.order && (
                              <div className="small text-muted">
                                Linked Order: <strong className="text-dark">{selectedTicket.order.orderNumber}</strong> ({selectedTicket.order.status})
                              </div>
                            )}
                            <div className="d-flex align-items-center gap-2 mt-2">
                              <span className="text-muted small">Assigned:</span>
                              <span className="fw-semibold small text-dark">
                                {selectedTicket.assignedSubadmin?.name || (selectedTicket.assignedTo && selectedTicket.assignedTo !== 'Unassigned' ? selectedTicket.assignedTo : null) || user?.name || 'Unassigned'}
                              </span>
                              {canAssign && user && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm py-0 px-2"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() =>
                                    handleAssignTicket(
                                      selectedTicket.id,
                                      selectedTicket.assignedSubadminId === user.id ? null : user.id
                                    )
                                  }
                                >
                                  {selectedTicket.assignedSubadminId === user.id ? 'Unassign' : 'Assign to Me'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subject Headline */}
                      <div className="mb-3 pb-2 border-bottom">
                        <span className="text-muted small d-block">Subject</span>
                        <h6 className="fw-bold text-dark mb-0">{selectedTicket.subject}</h6>
                      </div>

                      {/* Message Thread */}
                      <div
                        className="border rounded-3 p-3 bg-white mb-4"
                        style={{ maxHeight: 300, overflowY: 'auto' }}
                      >
                        {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                          <div className="text-center text-muted py-3 small">
                            No messages recorded yet on this ticket.
                          </div>
                        ) : (
                          selectedTicket.messages.map((msg) => {
                            const isStaff = msg.senderType === 'SUBADMIN' || msg.senderType === 'ADMIN';
                            const isInternal = Boolean(msg.isInternal);

                            if (isInternal) {
                              return (
                                <div key={msg.id} className="p-3 mb-3 rounded-3 border border-warning bg-warning bg-opacity-10">
                                  <div className="d-flex justify-content-between align-items-center mb-1 small">
                                    <div className="d-flex align-items-center gap-1 text-warning-emphasis fw-bold">
                                      <i className="bi bi-lock-fill"></i>
                                      <span>INTERNAL NOTE — Visible to Staff Only</span>
                                    </div>
                                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                      {msg.timestamp || msg.createdAt?.split('T')[0]}
                                    </span>
                                  </div>
                                  <div className="small text-muted mb-1">
                                    Posted by: <strong>{msg.senderName}</strong>
                                  </div>
                                  <div className="text-dark small" style={{ whiteSpace: 'pre-wrap' }}>
                                    {msg.body || msg.message}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={msg.id}
                                className={`d-flex flex-column mb-3 ${isStaff ? 'align-items-end' : 'align-items-start'}`}
                              >
                                <div className="d-flex align-items-center gap-2 small text-muted mb-1">
                                  <span className="fw-bold text-dark">{msg.senderName}</span>
                                  <span>&bull; {msg.timestamp || msg.createdAt?.split('T')[0]}</span>
                                  <span
                                    className={`badge ${isStaff ? 'bg-primary' : 'bg-secondary'}`}
                                    style={{ fontSize: '0.65rem' }}
                                  >
                                    {msg.senderType}
                                  </span>
                                  {isStaff && msg.emailStatus && (
                                    <span
                                      className={`badge ${
                                        msg.emailStatus === 'SENT'
                                          ? 'bg-success-subtle text-success'
                                          : msg.emailStatus === 'FAILED'
                                          ? 'bg-danger-subtle text-danger'
                                          : 'bg-warning-subtle text-warning-emphasis'
                                      }`}
                                      style={{ fontSize: '0.65rem' }}
                                      title={msg.emailStatus === 'SENT' ? 'Delivered via Email' : 'Email status'}
                                    >
                                      <i className="bi bi-envelope me-1"></i>
                                      {msg.emailStatus}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`p-3 rounded-3 ${isStaff ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
                                  style={{ maxWidth: '85%', whiteSpace: 'pre-wrap' }}
                                >
                                  {msg.body || msg.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Email Delivery Logs & Retry Section (if failed emails exist) */}
                      {selectedTicket.emailLogs && selectedTicket.emailLogs.some((l) => l.status === 'FAILED') && (
                        <div className="alert alert-warning border-warning p-3 mb-4 rounded-3 small">
                          <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                            <i className="bi bi-exclamation-circle-fill text-warning"></i>
                            <span>Failed Email Notifications Detected</span>
                          </div>
                          {selectedTicket.emailLogs
                            .filter((l) => l.status === 'FAILED')
                            .map((log) => (
                              <div key={log.id} className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                                <div>
                                  <div>To: <strong>{log.recipientEmail}</strong></div>
                                  <div className="text-danger small">{log.lastError || 'Delivery rejected by mail server'}</div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  disabled={retryingEmailId === log.id}
                                  onClick={() => handleRetryEmail(selectedTicket.id, log.id)}
                                >
                                  {retryingEmailId === log.id ? (
                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                  ) : (
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                  )}
                                  Retry Send
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Tabbed Message Composer (Reply vs Internal Note) */}
                      {canManage && (
                        <div className="border rounded-3 p-3 bg-light mb-4">
                          <ul className="nav nav-pills mb-3" role="tablist">
                            <li className="nav-item" role="presentation">
                              <button
                                type="button"
                                className={`nav-link btn-sm py-1 px-3 ${composerTab === 'reply' ? 'active bg-primary' : 'text-dark'}`}
                                onClick={() => setComposerTab('reply')}
                              >
                                <i className="bi bi-reply-fill me-1"></i> Official Reply (Emails Customer)
                              </button>
                            </li>
                            <li className="nav-item" role="presentation">
                              <button
                                type="button"
                                className={`nav-link btn-sm py-1 px-3 ${composerTab === 'note' ? 'active bg-warning text-dark fw-semibold' : 'text-dark'}`}
                                onClick={() => setComposerTab('note')}
                              >
                                <i className="bi bi-lock-fill me-1"></i> Internal Staff Note (Never Emailed)
                              </button>
                            </li>
                          </ul>

                          {composerTab === 'reply' ? (
                            <form onSubmit={handleSendReply}>
                              <div className="mb-2">
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  placeholder="Type official reply to customer. An email notification will be automatically delivered to their registered email address..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  disabled={isSubmittingMessage}
                                ></textarea>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                  <i className="bi bi-shield-check text-success me-1"></i>
                                  Authoritative recipient: {selectedTicket.customerEmail || 'Registered customer email'}
                                </span>
                                <button
                                  type="submit"
                                  className="btn btn-ardab-primary btn-sm"
                                  disabled={!replyText.trim() || isSubmittingMessage}
                                >
                                  {isSubmittingMessage ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-send me-1"></i> Send Reply &amp; Email
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <form onSubmit={handleAddInternalNote}>
                              <div className="mb-2">
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  placeholder="Add private staff note (e.g. called driver, warehouse checking stock, supervisor approval pending). Strictly confidential..."
                                  value={internalNoteText}
                                  onChange={(e) => setInternalNoteText(e.target.value)}
                                  disabled={isSubmittingMessage}
                                ></textarea>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-warning-emphasis small" style={{ fontSize: '0.75rem' }}>
                                  <i className="bi bi-lock-fill me-1"></i>
                                  Internal only. Never transmitted or exposed to customer.
                                </span>
                                <button
                                  type="submit"
                                  className="btn btn-warning btn-sm fw-semibold"
                                  disabled={!internalNoteText.trim() || isSubmittingMessage}
                                >
                                  {isSubmittingMessage ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-bookmark-plus me-1"></i> Save Internal Note
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}

                      {/* Resolution Notes Section */}
                      {canResolve && (
                        <div>
                          <label className="form-label fw-semibold small text-dark mb-1">
                            Resolution Notes / Outcome
                          </label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Add final resolution details (e.g. replacement item dispatched, customer confirmed receipt)..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                          ></textarea>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                  <div className="d-flex gap-2 flex-wrap">
                    {canResolve && selectedTicket.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-semibold shadow-sm"
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'RESOLVED', resolutionNotes)}
                      >
                        <i className="bi bi-check2-circle me-1"></i> Mark Resolved
                      </button>
                    )}
                    {canResolve && selectedTicket.status === 'OPEN' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary fw-semibold"
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'IN_PROGRESS')}
                      >
                        Take In-Progress
                      </button>
                    )}
                    {canResolve && selectedTicket.status !== 'CLOSED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'CLOSED', resolutionNotes)}
                      >
                        Close Ticket
                      </button>
                    )}
                    {canResolve && (selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'IN_PROGRESS', 'Reopened by support staff')}
                      >
                        Reopen Ticket
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

        {/* Create New Ticket Modal */}
        {showCreateModal && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <form onSubmit={handleCreateTicket}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title fw-bold text-dark">Create Support Ticket</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowCreateModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark">
                        Customer ID (UUID) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter registered customer ID..."
                        value={createCustomerId}
                        onChange={(e) => setCreateCustomerId(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark">
                        Subject / Issue Headline <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Brief summary of customer inquiry..."
                        value={createSubject}
                        onChange={(e) => setCreateSubject(e.target.value)}
                        required
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-dark">Category</label>
                        <select
                          className="form-select form-select-sm"
                          value={createCategory}
                          onChange={(e) => setCreateCategory(e.target.value)}
                        >
                          <option value="">Select Category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-dark">Priority</label>
                        <select
                          className="form-select form-select-sm"
                          value={createPriority}
                          onChange={(e) => setCreatePriority(e.target.value as TicketPriority)}
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="LOW">Low</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark">Linked Order ID (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. ORD-2026-00123"
                        value={createOrderId}
                        onChange={(e) => setCreateOrderId(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark">
                        Initial Description / Inquiry
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describe customer issue or phone call notes..."
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setShowCreateModal(false)}
                      disabled={isCreatingTicket}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-ardab-primary"
                      disabled={isCreatingTicket || !createCustomerId.trim() || !createSubject.trim()}
                    >
                      {isCreatingTicket ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          Creating...
                        </>
                      ) : (
                        'Create Ticket'
                      )}
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
