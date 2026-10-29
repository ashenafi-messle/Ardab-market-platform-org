'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import {
  agentsApi,
  agentIntegrationRequestsApi,
} from '@/lib/api';
import {
  Agent,
  AgentStatus,
  AgentRequestStatus,
  AgentDashboardStats,
  AgentIntegrationRequest,
  AgentCustomerItem,
  AgentOrderItem,
  AgentCommissionItem,
} from '@/types/agent';

export default function AgentsManagementPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Active Tab: 'agents' | 'requests'
  const [activeTab, setActiveTab] = useState<'agents' | 'requests'>('agents');

  // Stats state
  const [stats, setStats] = useState<AgentDashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    inactiveAgents: 0,
    approvedIntegrations: 0,
    pendingRequests: 0,
    attributedOrders: 0,
    commissions: { pending: 0, payable: 0, paid: 0, total: 0 },
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Agents list state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<AgentStatus | 'ALL'>('ALL');
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentsTotalPages, setAgentsTotalPages] = useState(1);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Integration requests state
  const [requests, setRequests] = useState<AgentIntegrationRequest[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState<AgentRequestStatus | 'ALL'>('ALL');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Toast / feedback alert
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // Modal: Register New Agent
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'ACTIVE' as AgentStatus,
    commissionRate: 5.0,
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    notes: '',
  });
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [registerFileError, setRegisterFileError] = useState<string | null>(null);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  // Modal: Edit Agent
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'ACTIVE' as AgentStatus,
    commissionRate: 5.0,
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    notes: '',
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal / Drawer: Agent Details
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetailsTab, setAgentDetailsTab] = useState<'profile' | 'customers' | 'orders' | 'commissions'>('profile');
  const [agentCustomers, setAgentCustomers] = useState<AgentCustomerItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [agentOrders, setAgentOrders] = useState<AgentOrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [agentCommissions, setAgentCommissions] = useState<AgentCommissionItem[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false);
  const [isViewingNationalId, setIsViewingNationalId] = useState(false);

  // Modal: Reject Request
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationVariant;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Auto-dismiss alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load Dashboard Statistics
  const loadStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const data = await agentsApi.getStats();
      setStats(data);
      setPendingRequestsCount(data.pendingRequests || 0);
    } catch (err: any) {
      console.warn('Failed to load agent stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load Agents List
  const loadAgents = useCallback(async () => {
    try {
      setIsLoadingAgents(true);
      const res = await agentsApi.list({
        page: agentsPage,
        limit: 15,
        search: agentSearch,
        status: agentStatusFilter,
      });
      setAgents(res.agents);
      setAgentsTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to load agents list.' });
    } finally {
      setIsLoadingAgents(false);
    }
  }, [agentsPage, agentSearch, agentStatusFilter]);

  // Load Integration Requests
  const loadRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true);
      const res = await agentIntegrationRequestsApi.list({
        page: requestsPage,
        limit: 15,
        status: requestStatusFilter,
        search: requestSearch,
      });
      setRequests(res.requests);
      setRequestsTotalPages(res.pagination.totalPages || 1);
      setPendingRequestsCount(res.pendingTotal);
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to load integration requests.' });
    } finally {
      setIsLoadingRequests(false);
    }
  }, [requestsPage, requestStatusFilter, requestSearch]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'agents') {
      loadAgents();
    } else {
      loadRequests();
    }
  }, [activeTab, loadAgents, loadRequests]);

  // Handle file selection with client validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      if (isEdit) setEditFile(null);
      else setRegisterFile(null);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setRegisterFileError('Please upload a valid PDF, JPG, PNG, or WEBP document.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setRegisterFileError('Document file size must not exceed 5 MB.');
      return;
    }

    setRegisterFileError(null);
    if (isEdit) setEditFile(file);
    else setRegisterFile(file);
  };

  // Submit Register Agent
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerFile) {
      setRegisterFileError('Scanned national identity document is required.');
      return;
    }

    try {
      setIsSubmittingRegister(true);
      const formData = new FormData();
      formData.append('name', registerForm.name.trim());
      formData.append('phone', registerForm.phone.trim());
      formData.append('email', registerForm.email.trim().toLowerCase());
      formData.append('status', registerForm.status);
      formData.append('commissionRate', String(registerForm.commissionRate));
      formData.append('commissionType', registerForm.commissionType);
      if (registerForm.notes) formData.append('notes', registerForm.notes.trim());
      formData.append('nationalIdDocument', registerFile);

      await agentsApi.create(formData);
      setAlert({ type: 'success', message: `Agent "${registerForm.name}" registered successfully.` });
      setIsRegisterModalOpen(false);
      setRegisterForm({
        name: '',
        phone: '',
        email: '',
        status: 'ACTIVE',
        commissionRate: 5.0,
        commissionType: 'PERCENTAGE',
        notes: '',
      });
      setRegisterFile(null);
      loadStats();
      loadAgents();
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to register agent.' });
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // Open Edit Agent Modal
  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      status: agent.status,
      commissionRate: agent.commissionRate,
      commissionType: agent.commissionType,
      notes: agent.notes || '',
    });
    setEditFile(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit Agent
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    try {
      setIsSubmittingEdit(true);
      const formData = new FormData();
      formData.append('name', editForm.name.trim());
      formData.append('phone', editForm.phone.trim());
      formData.append('email', editForm.email.trim().toLowerCase());
      formData.append('status', editForm.status);
      formData.append('commissionRate', String(editForm.commissionRate));
      formData.append('commissionType', editForm.commissionType);
      if (editForm.notes !== undefined) formData.append('notes', editForm.notes.trim());
      if (editFile) formData.append('nationalIdDocument', editFile);

      await agentsApi.update(editingAgent.id, formData);
      setAlert({ type: 'success', message: `Agent profile for "${editForm.name}" updated successfully.` });
      setIsEditModalOpen(false);
      setEditingAgent(null);
      loadStats();
      loadAgents();
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to update agent.' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle Agent Active / Inactive status
  const promptToggleStatus = (agent: Agent) => {
    const isActivating = agent.status === 'INACTIVE';
    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Activate Agent' : 'Deactivate Agent',
      message: isActivating
        ? `Are you sure you want to activate agent "${agent.name}"? Active agents can receive new customer integration requests.`
        : `Are you sure you want to deactivate agent "${agent.name}"? Existing approved customer relationships will be preserved, but new customer requests will be disabled.`,
      variant: isActivating ? 'success' : 'warning',
      action: async () => {
        const formData = new FormData();
        formData.append('status', isActivating ? 'ACTIVE' : 'INACTIVE');
        await agentsApi.update(agent.id, formData);
        setAlert({
          type: 'success',
          message: `Agent "${agent.name}" ${isActivating ? 'activated' : 'deactivated'} successfully.`,
        });
        loadStats();
        loadAgents();
      },
    });
  };

  // Open Agent Detail Drawer
  const openAgentDetails = async (agent: Agent) => {
    setSelectedAgent(agent);
    setAgentDetailsTab('profile');
    setIsLoadingCustomers(true);
    setIsLoadingOrders(true);
    setIsLoadingCommissions(true);

    try {
      const [fullAgent, custRes, ordRes, commRes] = await Promise.all([
        agentsApi.getById(agent.id),
        agentsApi.getCustomers(agent.id, { limit: 50 }),
        agentsApi.getOrders(agent.id, { limit: 50 }),
        agentsApi.getCommissions(agent.id, { limit: 50 }),
      ]);
      setSelectedAgent(fullAgent);
      setAgentCustomers(custRes.customers || []);
      setAgentOrders(ordRes.orders || []);
      setAgentCommissions(commRes.commissions || []);
    } catch (err: any) {
      console.warn('Failed to load full agent details:', err);
    } finally {
      setIsLoadingCustomers(false);
      setIsLoadingOrders(false);
      setIsLoadingCommissions(false);
    }
  };

  // Secure National ID Document Viewing
  const handleViewNationalId = async (agentId: string) => {
    try {
      setIsViewingNationalId(true);
      const blobUrl = await agentsApi.viewNationalIdBlob(agentId);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to view private document.' });
    } finally {
      setIsViewingNationalId(false);
    }
  };

  // Approve Integration Request
  const handleApproveRequest = (request: AgentIntegrationRequest) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Customer Integration',
      message: `Approve integration request connecting Customer "${request.customer?.fullName || request.customerId}" with Agent "${request.agent?.name}"?`,
      variant: 'success',
      action: async () => {
        await agentIntegrationRequestsApi.approve(request.id);
        setAlert({
          type: 'success',
          message: `Customer "${request.customer?.fullName}" successfully integrated with Agent "${request.agent?.name}".`,
        });
        loadStats();
        loadRequests();
      },
    });
  };

  // Reject Integration Request
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequestId) return;

    try {
      setIsSubmittingReject(true);
      await agentIntegrationRequestsApi.reject(rejectingRequestId, rejectionReason);
      setAlert({ type: 'success', message: 'Customer integration request was rejected.' });
      setRejectingRequestId(null);
      setRejectionReason('');
      loadStats();
      loadRequests();
    } catch (err: any) {
      setAlert({ type: 'danger', message: err.message || 'Failed to reject integration request.' });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h3 fw-bold text-dark mb-0">Agent Network & Referral Management</h1>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              Official Agents
            </span>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Register legally verified agents, review customer referral integration requests, and track attributed orders and commissions.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
            onClick={() => {
              loadStats();
              if (activeTab === 'agents') loadAgents();
              else loadRequests();
            }}
            title="Refresh current dataset"
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setIsRegisterModalOpen(true)}
            >
              <i className="bi bi-person-plus-fill"></i> Register New Agent
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {alert && (
        <div
          className={`alert alert-${alert.type} alert-dismissible fade show shadow-sm py-2 px-3 small`}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <i
              className={`bi ${alert.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}
            ></i>
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            className="btn-close py-2"
            onClick={() => setAlert(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Dashboard KPI Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-xl">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-body p-3">
              <span className="text-muted small d-block">Registered Agents</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="h4 fw-bold text-dark mb-0">
                  {isLoadingStats ? '...' : stats.totalAgents}
                </span>
                <span className="badge bg-success-subtle text-success small">
                  {stats.activeAgents} Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-body p-3">
              <span className="text-muted small d-block">Approved Integrations</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="h4 fw-bold text-primary mb-0">
                  {isLoadingStats ? '...' : stats.approvedIntegrations}
                </span>
                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  Customers
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div
            className={`card h-100 border-0 shadow-sm rounded-3 ${stats.pendingRequests > 0 ? 'border-start border-4 border-warning' : ''}`}
          >
            <div className="card-body p-3">
              <span className="text-muted small d-block">Pending Requests</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="h4 fw-bold text-warning mb-0">
                  {isLoadingStats ? '...' : stats.pendingRequests}
                </span>
                {stats.pendingRequests > 0 && (
                  <span className="badge bg-warning text-dark small">Action Needed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-body p-3">
              <span className="text-muted small d-block">Attributed Orders</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="h4 fw-bold text-dark mb-0">
                  {isLoadingStats ? '...' : stats.attributedOrders}
                </span>
                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  Orders
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4 col-xl">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-body p-3">
              <span className="text-muted small d-block">Commission Total</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="h5 fw-bold text-success mb-0">
                  {isLoadingStats
                    ? '...'
                    : `ETB ${stats.commissions.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="d-flex gap-2 mt-1 small" style={{ fontSize: '0.7rem' }}>
                <span className="text-warning">Pending: {stats.commissions.pending.toFixed(0)}</span>
                <span className="text-muted">|</span>
                <span className="text-success">Payable: {stats.commissions.payable.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <ul className="nav nav-tabs mb-4 border-bottom">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'agents' ? 'active text-primary border-bottom border-primary border-2' : 'text-muted'}`}
            onClick={() => setActiveTab('agents')}
          >
            <i className="bi bi-people-fill me-1"></i> Registered Agents
            <span className="badge bg-secondary-subtle text-secondary ms-2 small">
              {stats.totalAgents}
            </span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'requests' ? 'active text-primary border-bottom border-primary border-2' : 'text-muted'}`}
            onClick={() => setActiveTab('requests')}
          >
            <i className="bi bi-clock-history me-1"></i> Integration Requests
            {pendingRequestsCount > 0 ? (
              <span className="badge bg-warning text-dark ms-2 small">
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary ms-2 small">
                0 Pending
              </span>
            )}
          </button>
        </li>
      </ul>

      {/* ========================================================================= */}
      {/* TAB 1: ALL REGISTERED AGENTS */}
      {/* ========================================================================= */}
      {activeTab === 'agents' && (
        <div className="card border-0 shadow-sm rounded-3">
          {/* Filter Bar */}
          <div className="card-header bg-white border-bottom py-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by legal name, email, or phone..."
                    value={agentSearch}
                    onChange={(e) => {
                      setAgentSearch(e.target.value);
                      setAgentsPage(1);
                    }}
                  />
                  {agentSearch && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setAgentSearch('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={agentStatusFilter}
                  onChange={(e) => {
                    setAgentStatusFilter(e.target.value as AgentStatus | 'ALL');
                    setAgentsPage(1);
                  }}
                >
                  <option value="ALL">All Account Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>
              <div className="col-6 col-md-4 text-end">
                <span className="text-muted small">
                  Showing {agents.length} agent{agents.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          {/* Agents Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-3 py-3">Legal Name & Details</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Commission Policy</th>
                  <th className="text-center">Customers</th>
                  <th className="text-center">Attributed Orders</th>
                  <th className="text-end">Commissions (ETB)</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingAgents ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading agent registry...
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <i className="bi bi-person-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <p className="mb-1 fw-semibold">No registered agents found</p>
                      <span className="small">
                        {agentSearch || agentStatusFilter !== 'ALL'
                          ? 'Try clearing your filters or search keywords.'
                          : 'Click "+ Register New Agent" to onboard the first Ardab Market agent.'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => {
                    const isActive = agent.status === 'ACTIVE';
                    return (
                      <tr key={agent.id}>
                        {/* Legal Name & Date */}
                        <td className="ps-3 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                              style={{
                                width: 38,
                                height: 38,
                                backgroundColor: isActive ? '#0d6efd' : '#6c757d',
                                fontSize: '0.9rem',
                              }}
                            >
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="fw-bold text-dark d-block">{agent.name}</span>
                              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                Registered: {new Date(agent.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td>
                          <div className="small">
                            <div className="text-dark fw-semibold">
                              <i className="bi bi-envelope me-1 text-muted"></i>
                              {agent.email}
                            </div>
                            <div className="text-muted">
                              <i className="bi bi-telephone me-1 text-muted"></i>
                              {agent.phone}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${isActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'}`}
                          >
                            <i className={`bi ${isActive ? 'bi-check-circle-fill' : 'bi-dash-circle'} me-1`}></i>
                            {agent.status}
                          </span>
                        </td>

                        {/* Commission Policy */}
                        <td>
                          <span className="badge bg-light text-dark border">
                            {agent.commissionType === 'PERCENTAGE'
                              ? `${agent.commissionRate}% per order`
                              : `ETB ${agent.commissionRate} Fixed`}
                          </span>
                        </td>

                        {/* Integrated Customers */}
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary">
                            {agent.approvedCustomerCount || 0}
                          </span>
                          {Boolean(agent.pendingRequestsCount && agent.pendingRequestsCount > 0) && (
                            <span
                              className="badge bg-warning text-dark ms-1"
                              title={`${agent.pendingRequestsCount} pending customer requests`}
                            >
                              +{agent.pendingRequestsCount}
                            </span>
                          )}
                        </td>

                        {/* Orders Attributed */}
                        <td className="text-center">
                          <span className="fw-semibold text-dark">
                            {agent.attributedOrdersCount || 0}
                          </span>
                        </td>

                        {/* Commission Total */}
                        <td className="text-end fw-bold text-dark">
                          {agent.commissionTotals?.total !== undefined
                            ? `ETB ${agent.commissionTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : 'ETB 0.00'}
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => openAgentDetails(agent)}
                              title="View agent profile, customer roster, orders, and legal document"
                            >
                              <i className="bi bi-eye"></i> Details
                            </button>
                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => openEditModal(agent)}
                                  title="Edit agent profile"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                  onClick={() => promptToggleStatus(agent)}
                                  title={isActive ? 'Deactivate agent' : 'Activate agent'}
                                >
                                  <i className={`bi ${isActive ? 'bi-slash-circle' : 'bi-check-lg'}`}></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {agentsTotalPages > 1 && (
            <div className="card-footer bg-white border-top py-2 d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                Page {agentsPage} of {agentsTotalPages}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={agentsPage <= 1}
                  onClick={() => setAgentsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={agentsPage >= agentsTotalPages}
                  onClick={() => setAgentsPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTEGRATION REQUESTS & REVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="card border-0 shadow-sm rounded-3">
          {/* Aggregate Notification Banner */}
          {pendingRequestsCount > 0 && (
            <div className="p-3 bg-warning bg-opacity-10 border-bottom border-warning d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-bell-fill text-warning fs-5"></i>
                <div>
                  <span className="fw-bold text-dark d-block">
                    {pendingRequestsCount} Customer Integration Request{pendingRequestsCount === 1 ? '' : 's'} Awaiting Super Admin Review
                  </span>
                  <span className="text-muted small">
                    Incoming customer referral connection requests must be verified and approved before order attribution becomes active.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={() => {
                  setRequestStatusFilter('PENDING');
                  setRequestsPage(1);
                }}
              >
                Filter Pending Only
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="card-header bg-white border-bottom py-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by customer name, code, phone, or agent..."
                    value={requestSearch}
                    onChange={(e) => {
                      setRequestSearch(e.target.value);
                      setRequestsPage(1);
                    }}
                  />
                  {requestSearch && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setRequestSearch('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="btn-group btn-group-sm w-100" role="group">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn ${requestStatusFilter === st ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        setRequestStatusFilter(st);
                        setRequestsPage(1);
                      }}
                    >
                      {st === 'ALL' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-6 col-md-3 text-end">
                <span className="text-muted small">
                  {requests.length} request{requests.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-3 py-3">Requesting Customer</th>
                  <th>Target Agent</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Review Details</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRequests ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading integration requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <p className="mb-1 fw-semibold">No integration requests found</p>
                      <span className="small">
                        {requestSearch || requestStatusFilter !== 'ALL'
                          ? 'Try adjusting your search criteria.'
                          : 'When customers request integration from the mobile app, they will appear here.'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const isPending = req.status === 'PENDING';
                    const isApproved = req.status === 'APPROVED';
                    const isRejected = req.status === 'REJECTED';

                    return (
                      <tr key={req.id}>
                        {/* Customer */}
                        <td className="ps-3 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-person-circle fs-4 text-primary"></i>
                            <div>
                              <span className="fw-bold text-dark d-block">
                                {req.customer?.fullName || 'Customer'}
                              </span>
                              <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>
                                {req.customer?.customerCode || 'N/A'} • {req.customer?.phone || ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Target Agent */}
                        <td>
                          <div>
                            <span className="fw-semibold text-dark d-block">
                              {req.agent?.name || 'Agent'}
                            </span>
                            <span className="text-muted small">
                              <i className="bi bi-envelope me-1"></i>
                              {req.agent?.email}
                            </span>
                          </div>
                        </td>

                        {/* Request Date */}
                        <td className="text-muted small">
                          {new Date(req.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${
                              isApproved
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : isPending
                                ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                : 'bg-danger-subtle text-danger border border-danger-subtle'
                            }`}
                          >
                            <i
                              className={`bi ${
                                isApproved
                                  ? 'bi-check-circle-fill'
                                  : isPending
                                  ? 'bi-hourglass-split'
                                  : 'bi-x-circle-fill'
                              } me-1`}
                            ></i>
                            {req.status}
                          </span>
                        </td>

                        {/* Reviewer / Rejection Reason */}
                        <td className="small">
                          {isApproved && (
                            <div className="text-success">
                              <i className="bi bi-shield-check me-1"></i>
                              Approved by {req.reviewedBy?.name || 'Admin'}
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                          )}
                          {isRejected && (
                            <div className="text-danger">
                              <i className="bi bi-shield-x me-1"></i>
                              Rejected
                              {req.rejectionReason && (
                                <span className="text-muted d-block fst-italic" style={{ fontSize: '0.75rem' }}>
                                  Reason: {req.rejectionReason}
                                </span>
                              )}
                            </div>
                          )}
                          {isPending && <span className="text-muted fst-italic">Awaiting Admin decision</span>}
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          {isPending && isSuperAdmin ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-success d-flex align-items-center gap-1"
                                onClick={() => handleApproveRequest(req)}
                                title="Approve customer integration"
                              >
                                <i className="bi bi-check-lg"></i> Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger d-flex align-items-center gap-1"
                                onClick={() => {
                                  setRejectingRequestId(req.id);
                                  setRejectionReason('');
                                }}
                                title="Reject customer integration"
                              >
                                <i className="bi bi-x-lg"></i> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Requests Pagination */}
          {requestsTotalPages > 1 && (
            <div className="card-footer bg-white border-top py-2 d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                Page {requestsPage} of {requestsTotalPages}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={requestsPage <= 1}
                  onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={requestsPage >= requestsTotalPages}
                  onClick={() => setRequestsPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW AGENT */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0 rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-person-plus me-2 text-primary"></i> Register New Ardab Market Agent
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsRegisterModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Legal Name */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Full Legal Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Abebe Kebede Tessema"
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      />
                    </div>

                    {/* Phone */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Registered Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder="e.g. +251911234567 or 0911234567"
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      />
                    </div>

                    {/* Email */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Unique Registered Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        placeholder="e.g. agent@ardabmarket.com"
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      />
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        Customers connect with this agent using this registered email.
                      </span>
                    </div>

                    {/* Initial Status */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Agent Account Status
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={registerForm.status}
                        onChange={(e) => setRegisterForm({ ...registerForm, status: e.target.value as AgentStatus })}
                      >
                        <option value="ACTIVE">ACTIVE (Can receive referral requests immediately)</option>
                        <option value="INACTIVE">INACTIVE (Registered but connections disabled)</option>
                      </select>
                    </div>

                    {/* Commission Configuration */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Commission Rate (%)
                      </label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="form-control"
                          value={registerForm.commissionRate}
                          onChange={(e) => setRegisterForm({ ...registerForm, commissionRate: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="input-group-text">% per order</span>
                      </div>
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        Default platform rate: 5.0% of merchandise subtotal
                      </span>
                    </div>

                    {/* Commission Type */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Commission Policy Type
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={registerForm.commissionType}
                        onChange={(e) => setRegisterForm({ ...registerForm, commissionType: e.target.value as any })}
                      >
                        <option value="PERCENTAGE">PERCENTAGE (Calculated from merchandise subtotal)</option>
                        <option value="FIXED">FIXED (Fixed ETB per attributed order)</option>
                      </select>
                    </div>

                    {/* National ID Document Upload */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark">
                        Scanned National Identity Document <span className="text-danger">*</span>
                      </label>
                      <div className="border border-2 border-dashed rounded-3 p-3 bg-light text-center">
                        <input
                          type="file"
                          id="registerDocInput"
                          className="d-none"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleFileChange(e, false)}
                        />
                        <label htmlFor="registerDocInput" className="cursor-pointer mb-0">
                          <i className="bi bi-file-earmark-arrow-up fs-2 text-primary d-block mb-1"></i>
                          <span className="fw-semibold text-primary">
                            {registerFile ? registerFile.name : 'Click to select National ID file'}
                          </span>
                          <span className="text-muted small d-block mt-1">
                            Supported: PDF, JPG, PNG, WEBP (Max: 5 MB). Stored in encrypted private storage.
                          </span>
                        </label>
                      </div>
                      {registerFileError && (
                        <div className="text-danger small mt-1">{registerFileError}</div>
                      )}
                    </div>

                    {/* Internal Notes */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark">
                        Internal Administrative Notes (Optional)
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="e.g. Verified Kebele ID card, Gondar region representative"
                        value={registerForm.notes}
                        onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsRegisterModalOpen(false)}
                    disabled={isSubmittingRegister}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                    disabled={isSubmittingRegister}
                  >
                    {isSubmittingRegister ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Registering Agent...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg"></i> Register & Verify Agent
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT AGENT */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingAgent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0 rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-pencil-square me-2 text-primary"></i> Edit Agent Profile: {editingAgent.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsEditModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Full Legal Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Registered Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Agent Status</label>
                      <select
                        className="form-select form-select-sm"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AgentStatus })}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Commission Rate</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-control form-control-sm"
                        value={editForm.commissionRate}
                        onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Replace National ID (Optional)</label>
                      <input
                        type="file"
                        className="form-control form-control-sm"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileChange(e, true)}
                      />
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        Leave blank to keep existing verified document.
                      </span>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark">Notes</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary shadow-sm"
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: AGENT DETAILS (Profile, Legal ID, Customers, Orders) */}
      {/* ========================================================================= */}
      {selectedAgent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content shadow border-0 rounded-3">
              <div className="modal-header border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{ width: 36, height: 36, backgroundColor: '#0d6efd' }}
                  >
                    {selectedAgent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{selectedAgent.name}</h5>
                    <span className="text-muted small">
                      {selectedAgent.email} • {selectedAgent.phone}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedAgent(null)}
                ></button>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="bg-light border-bottom px-3 pt-2">
                <ul className="nav nav-tabs border-0">
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${agentDetailsTab === 'profile' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setAgentDetailsTab('profile')}
                    >
                      <i className="bi bi-person me-1"></i> Profile & Legal ID
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${agentDetailsTab === 'customers' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setAgentDetailsTab('customers')}
                    >
                      <i className="bi bi-people me-1"></i> Integrated Customers ({agentCustomers.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${agentDetailsTab === 'orders' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setAgentDetailsTab('orders')}
                    >
                      <i className="bi bi-receipt me-1"></i> Attributed Orders ({agentOrders.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${agentDetailsTab === 'commissions' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setAgentDetailsTab('commissions')}
                    >
                      <i className="bi bi-wallet2 me-1"></i> Commission Ledger ({agentCommissions.length})
                    </button>
                  </li>
                </ul>
              </div>

              <div className="modal-body p-4">
                {/* Profile & National ID */}
                {agentDetailsTab === 'profile' && (
                  <div>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Account Status</span>
                        <span
                          className={`badge mt-1 ${selectedAgent.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}
                        >
                          {selectedAgent.status}
                        </span>
                      </div>
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Commission Policy</span>
                        <span className="fw-semibold text-dark mt-1 d-block">
                          {selectedAgent.commissionType === 'PERCENTAGE'
                            ? `${selectedAgent.commissionRate}% per order`
                            : `ETB ${selectedAgent.commissionRate} Fixed`}
                        </span>
                      </div>
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Registration Date</span>
                        <span className="text-dark mt-1 d-block">
                          {new Date(selectedAgent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Scanned National ID Document Access */}
                    <div className="p-3 border rounded-3 bg-light mb-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-shield-lock-fill fs-3 text-primary"></i>
                          <div>
                            <span className="fw-bold text-dark d-block">
                              Scanned National Identity Document
                            </span>
                            <span className="text-muted small">
                              Verified legal identity document stored in encrypted private storage.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                          onClick={() => handleViewNationalId(selectedAgent.id)}
                          disabled={isViewingNationalId}
                        >
                          {isViewingNationalId ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                              Opening...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-file-earmark-text"></i> View Secure Document
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Administrative Notes */}
                    {selectedAgent.notes && (
                      <div className="p-3 bg-white border rounded-3">
                        <span className="fw-bold text-muted small d-block mb-1">Administrative Notes:</span>
                        <p className="text-dark small mb-0">{selectedAgent.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Integrated Customers */}
                {agentDetailsTab === 'customers' && (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>Customer Code</th>
                          <th>Full Name</th>
                          <th>Phone</th>
                          <th>City</th>
                          <th>Integrated Since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingCustomers ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">Loading customer roster...</td>
                          </tr>
                        ) : agentCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">No approved customers integrated yet.</td>
                          </tr>
                        ) : (
                          agentCustomers.map((c) => (
                            <tr key={c.relationshipId}>
                              <td className="font-monospace small text-primary">{c.customer.customerCode}</td>
                              <td className="fw-semibold text-dark">{c.customer.fullName}</td>
                              <td className="text-muted">{c.customer.phone}</td>
                              <td>{c.customer.city}</td>
                              <td className="text-muted small">
                                {new Date(c.approvedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Attributed Orders */}
                {agentDetailsTab === 'orders' && (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th className="text-end">Subtotal</th>
                          <th className="text-end">Commission (ETB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingOrders ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">Loading attributed orders...</td>
                          </tr>
                        ) : agentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">No orders attributed to this agent yet.</td>
                          </tr>
                        ) : (
                          agentOrders.map((o) => (
                            <tr key={o.id}>
                              <td className="font-monospace fw-bold text-primary">{o.orderNumber}</td>
                              <td>{o.customer?.fullName || 'Customer'}</td>
                              <td className="text-muted small">{new Date(o.placedAt).toLocaleDateString()}</td>
                              <td>
                                <span className="badge bg-light text-dark border">{o.status}</span>
                              </td>
                              <td className="text-end">ETB {o.subtotal.toFixed(2)}</td>
                              <td className="text-end fw-bold text-success">
                                {o.commission ? `ETB ${o.commission.commissionAmount.toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Commission Ledger */}
                {agentDetailsTab === 'commissions' && (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>Order #</th>
                          <th>Base Amount</th>
                          <th>Rate Applied</th>
                          <th className="text-end">Calculated Commission</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingCommissions ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">Loading commission ledger...</td>
                          </tr>
                        ) : agentCommissions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">No commission records found.</td>
                          </tr>
                        ) : (
                          agentCommissions.map((c) => (
                            <tr key={c.id}>
                              <td className="font-monospace fw-semibold text-primary">{c.orderNumber || c.orderId.slice(0, 8)}</td>
                              <td>ETB {c.baseAmount.toFixed(2)}</td>
                              <td>{c.rateSnapshot}%</td>
                              <td className="text-end fw-bold text-success">
                                ETB {c.commissionAmount.toFixed(2)}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    c.status === 'PAID'
                                      ? 'bg-success-subtle text-success'
                                      : c.status === 'PAYABLE'
                                      ? 'bg-primary-subtle text-primary'
                                      : c.status === 'CANCELLED'
                                      ? 'bg-danger-subtle text-danger'
                                      : 'bg-warning-subtle text-warning-emphasis'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>
                              <td className="text-muted small">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top py-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedAgent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT REQUEST WITH OPTIONAL REASON */}
      {/* ========================================================================= */}
      {rejectingRequestId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0 rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-x-circle text-danger me-2"></i> Reject Integration Request
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRejectingRequestId(null)}
                ></button>
              </div>

              <form onSubmit={handleRejectSubmit}>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Are you sure you want to reject this customer agent referral request? You may provide an optional reason that will be shown to the customer.
                  </p>
                  <div>
                    <label className="form-label small fw-semibold text-dark">
                      Rejection Reason (Optional)
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="e.g. Agent assignment mismatch, or requested agent does not operate in customer's delivery zone."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setRejectingRequestId(null)}
                    disabled={isSubmittingReject}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-danger shadow-sm"
                    disabled={isSubmittingReject}
                  >
                    {isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={isConfirming}
        onConfirm={async () => {
          try {
            setIsConfirming(true);
            await confirmModal.action();
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            setAlert({ type: 'danger', message: err.message || 'Action failed.' });
          } finally {
            setIsConfirming(false);
          }
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
