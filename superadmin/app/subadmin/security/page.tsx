'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { securityApi } from '@/lib/api';
import {
  AdminUser,
  ActiveSession,
  SecurityAlert,
  IpBlockRule,
  AuditLog,
  FailedLoginLog,
  SecurityStatistics,
} from '@/types/security';

type SecurityTab = 'SUPER_ADMINS' | 'SESSIONS' | 'ALERTS' | 'FIREWALL' | 'FAILED_LOGINS' | 'AUDIT';

export default function SecurityManagementPage() {
  const { user } = useAuth();

  // Role-based permissions
  const canManageAdmins = hasPermission(user?.role, 'security:manage_admins');
  const canManageAlerts = hasPermission(user?.role, 'security:manage_alerts');
  const canManageFirewall = hasPermission(user?.role, 'security:manage_firewall');
  const canManageSessions = hasPermission(user?.role, 'security:sessions');

  const [activeTab, setActiveTab] = useState<SecurityTab>('SUPER_ADMINS');
  const [statistics, setStatistics] = useState<SecurityStatistics | null>(null);
  const [superAdmins, setSuperAdmins] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [ipRules, setIpRules] = useState<IpBlockRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginLog[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Super Admin Filtering
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCityFilter, setAdminCityFilter] = useState('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');

  // Super Admin Account Creation Modal State
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminInitialPassword, setAdminInitialPassword] = useState('Admin@2025');
  const [adminCities, setAdminCities] = useState<string[]>(['Gondar', 'Bahir Dar', 'Addis Ababa']);
  const [generatedPasswordNotice, setGeneratedPasswordNotice] = useState<{ name: string; password: string } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Edit Super Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCities, setEditCities] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  // Delete Super Admin Modal State
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);

  // New IP Rule Modal State
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newIpReason, setNewIpReason] = useState('');
  const [newIpStatus, setNewIpStatus] = useState<'BLOCKED' | 'WHITELISTED'>('BLOCKED');

  const refreshStatistics = useCallback(async () => {
    try {
      const stats = await securityApi.getStatistics();
      setStatistics(stats);
    } catch {
      // Non-critical fallback
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      securityApi.getStatistics().catch(() => null),
      securityApi.getSuperAdminAccounts(),
      securityApi.getActiveSessions(),
      securityApi.getSecurityAlerts(),
      securityApi.getIpRules(),
      securityApi.getAuditLogs(),
      securityApi.getFailedLogins(),
    ]).then(([stats, admins, sess, alr, rules, audits, failed]) => {
      if (isMounted) {
        if (stats) setStatistics(stats);
        setSuperAdmins(admins);
        setSessions(sess);
        setAlerts(alr);
        setIpRules(rules);
        setAuditLogs(audits);
        setFailedLogins(failed);
      }
    }).catch((err) => {
      console.error('Failed to load security data:', err);
      if (isMounted) {
        setErrorMessage(err?.message || 'Failed to load some security telemetry data.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Super Admin Management Actions
  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim()) return;

    try {
      const created = await securityApi.createSuperAdminAccount({
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim() || '+251 91 000 0000',
        assignedCities: adminCities,
        initialPassword: adminInitialPassword,
      });
      setSuperAdmins((prev) => [created, ...prev]);
      setShowCreateSuperAdminModal(false);
      setGeneratedPasswordNotice({ name: created.name, password: adminInitialPassword });
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setActionMessage(`Super Admin account for ${created.name} (${created.email}) created successfully.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to provision Super Admin account.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleOpenEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditPhone(admin.phone || '');
    setEditCities([...admin.assignedCities]);
    setEditStatus(admin.status);
  };

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !editName.trim() || !editEmail.trim()) return;

    try {
      const updated = await securityApi.updateSuperAdminAccount(editingAdmin.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || '+251 91 000 0000',
        assignedCities: editCities.length > 0 ? editCities : ['All Cities'],
        status: editStatus,
      });
      setSuperAdmins((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingAdmin(null);
      setActionMessage(`Super Admin account for ${updated.name} updated successfully.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to update Super Admin account.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleToggleSuperAdminStatus = async (id: string) => {
    try {
      const updated = await securityApi.toggleSuperAdminStatus(id);
      setSuperAdmins((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setActionMessage(`Super Admin account ${updated.name} is now ${updated.status}.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to update Super Admin status. Note that the last active Super Admin cannot be deactivated.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleResetSuperAdminPassword = async (id: string) => {
    try {
      const res = await securityApi.resetSuperAdminPassword(id);
      const targetUser = superAdmins.find((u) => u.id === id);
      setGeneratedPasswordNotice({
        name: targetUser?.name || 'Super Admin',
        password: res.tempPassword,
      });
      setActionMessage('Temporary security password generated and logged in audit trail.');
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to reset password.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAdmin) return;
    try {
      await securityApi.deleteSuperAdminAccount(deletingAdmin.id);
      setSuperAdmins((prev) => prev.filter((u) => u.id !== deletingAdmin.id));
      setActionMessage(`Super Admin account for ${deletingAdmin.name} permanently deprovisioned.`);
      setDeletingAdmin(null);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to delete Super Admin account.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleCopyPassword = () => {
    if (generatedPasswordNotice) {
      navigator.clipboard.writeText(generatedPasswordNotice.password);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const revoked = await securityApi.revokeSession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? revoked : s)));
      setActionMessage(`Session ${sessionId} successfully revoked.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to revoke session.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const resolved = await securityApi.resolveAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? resolved : a)));
      setActionMessage(`Security alert ${alertId} resolved.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to resolve security alert.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleAddIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    try {
      const rule = await securityApi.addIpRule({
        ipAddress: newIp.trim(),
        reason: newIpReason.trim() || 'Manual administrative rule',
        blockedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        blockedBy: user?.name ? `${user.name} (${user.role.replace('_', ' ')})` : 'Administrative Authority',
        status: newIpStatus,
      });
      setIpRules((prev) => [rule, ...prev]);
      setShowAddIpModal(false);
      setNewIp('');
      setNewIpReason('');
      setActionMessage(`Firewall rule for ${rule.ipAddress} created.`);
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to add firewall rule.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleDeleteIpRule = async (id: string) => {
    try {
      await securityApi.deleteIpRule(id);
      setIpRules((prev) => prev.filter((r) => r.id !== id));
      setActionMessage('Firewall rule removed.');
      refreshStatistics();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Failed to remove firewall rule.');
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  // Filtered Super Admins
  const filteredSuperAdmins = superAdmins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      admin.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
      admin.id.toLowerCase().includes(adminSearch.toLowerCase());
    const matchesCity =
      adminCityFilter === 'ALL' || admin.assignedCities.includes(adminCityFilter);
    const matchesStatus =
      adminStatusFilter === 'ALL' || admin.status === adminStatusFilter;
    return matchesSearch && matchesCity && matchesStatus;
  });

  const activeSessionsCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const unresolvedAlertsCount = alerts.filter((a) => !a.resolved).length;
  const activeSuperAdminsCount = superAdmins.filter((a) => a.status === 'ACTIVE').length;

  return (
    <AdminLayout>
      <PageContainer
        title="Security & Super Admin Accounts Management"
        subtitle="Provision and manage Super Admin accounts, monitor active sessions, enforce firewall rules, and maintain audit integrity"
        breadcrumbs={[{ label: 'Sub Admin' }, { label: 'Security & Super Admins' }]}
        actions={
          <div className="d-flex gap-2">
            {canManageAdmins && (
              <button
                type="button"
                className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 shadow-sm"
                onClick={() => setShowCreateSuperAdminModal(true)}
              >
                <i className="bi bi-person-plus-fill"></i>
                <span>Create Super Admin</span>
              </button>
            )}
            {canManageFirewall && (
              <button
                type="button"
                className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-1"
                onClick={() => setShowAddIpModal(true)}
              >
                <i className="bi bi-shield-plus"></i>
                <span>Add Firewall Rule</span>
              </button>
            )}
          </div>
        }
      >
        {/* Error Alert */}
        {errorMessage && (
          <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill text-danger fs-5"></i>
              <span className="fw-medium">{errorMessage}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setErrorMessage(null)}></button>
          </div>
        )}

        {/* Flash Message */}
        {actionMessage && (
          <div className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-success fs-5"></i>
              <span className="fw-medium">{actionMessage}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
          </div>
        )}

        {/* Temporary Password Modal / Notice */}
        {generatedPasswordNotice && (
          <div className="alert alert-info alert-dismissible fade show p-3 p-md-4 mb-4 rounded-4 shadow-sm border-info bg-white" role="alert">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="d-flex align-items-start gap-3">
                <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary fs-4">
                  <i className="bi bi-key-fill"></i>
                </div>
                <div>
                  <strong className="text-dark d-block mb-1">
                    Credential Provisioned for {generatedPasswordNotice.name}
                  </strong>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-muted small">Generated Password:</span>
                    <code className="fs-6 fw-bold text-primary px-3 py-1 bg-light border rounded-3">
                      {generatedPasswordNotice.password}
                    </code>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={handleCopyPassword}
                    >
                      <i className={`bi ${copiedNotice ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                      <span>{copiedNotice ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <span className="text-muted small d-block mt-1">
                    Share this temporary credential securely with the Super Admin. They will use it on the shared login page.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setGeneratedPasswordNotice(null)}
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}

        {/* Security Overview Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Super Admin Accounts</span>
                <div className="ardab-icon-box icon-box-green" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                  <i className="bi bi-person-badge-fill"></i>
                </div>
              </div>
              <div className="fs-3 fw-bold text-dark">{statistics?.totalSuperAdmins ?? superAdmins.length}</div>
              <span className="badge badge-success-soft mt-1">
                {statistics?.activeSuperAdmins ?? activeSuperAdminsCount} Active &bull; Managed by Sub Admin
              </span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Active User Sessions</span>
                <div className="ardab-icon-box icon-box-teal" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                  <i className="bi bi-laptop"></i>
                </div>
              </div>
              <div className="fs-3 fw-bold text-primary">{statistics?.activeSessions ?? activeSessionsCount}</div>
              <span className="text-muted small">Live Ingress Authenticated</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Security Incidents</span>
                <div className="ardab-icon-box icon-box-warning" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                  <i className="bi bi-shield-exclamation"></i>
                </div>
              </div>
              <div className="fs-3 fw-bold text-danger">{statistics?.openAlerts ?? statistics?.unresolvedAlerts ?? unresolvedAlertsCount}</div>
              <span className="badge badge-warning-soft mt-1">
                {statistics?.criticalAlerts ? `${statistics.criticalAlerts} Critical &bull; ` : ''}Awaiting Investigation
              </span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-medium">Firewall Rules</span>
                <div className="ardab-icon-box icon-box-info" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                  <i className="bi bi-fire"></i>
                </div>
              </div>
              <div className="fs-3 fw-bold text-success">{statistics?.blockedIps ?? ipRules.length}</div>
              <span className="text-muted small">Active Protection Rules</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'SUPER_ADMINS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('SUPER_ADMINS')}
            >
              <i className="bi bi-person-badge-fill me-1"></i> Super Admin Accounts ({superAdmins.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'SESSIONS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('SESSIONS')}
            >
              <i className="bi bi-laptop me-1"></i> Active Sessions ({activeSessionsCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'ALERTS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('ALERTS')}
            >
              <i className="bi bi-shield-exclamation me-1"></i> Security Alerts ({unresolvedAlertsCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'FIREWALL' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('FIREWALL')}
            >
              <i className="bi bi-fire me-1"></i> IP Firewall ({ipRules.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'FAILED_LOGINS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('FAILED_LOGINS')}
            >
              <i className="bi bi-x-octagon me-1"></i> Failed Logins ({failedLogins.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'AUDIT' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('AUDIT')}
            >
              <i className="bi bi-journal-text me-1"></i> Audit Trail ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* Tab 0: Super Admin Accounts Management */}
        {activeTab === 'SUPER_ADMINS' && (
          <div>
            {/* Governance Info Strip */}
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-3" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderLeft: '4px solid #10b981' }}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock-fill text-success fs-5"></i>
                  <div>
                    <span className="fw-bold text-dark small d-block">Super Admin Identity &amp; Governance</span>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Super Admin accounts are created and managed exclusively by the Sub Admin. Super Admins operate Products, Suppliers, Customers, Orders, and Deliveries.
                    </span>
                  </div>
                </div>
                {canManageAdmins && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 align-self-start align-self-md-center text-nowrap"
                    onClick={() => setShowCreateSuperAdminModal(true)}
                  >
                    <i className="bi bi-person-plus-fill"></i>
                    <span>+ Create Super Admin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="ardab-card p-3 mb-3 shadow-sm">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-5">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search Super Admin by name, email, or ID..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={adminCityFilter}
                    onChange={(e) => setAdminCityFilter(e.target.value)}
                  >
                    <option value="ALL">All Operational Cities</option>
                    <option value="Gondar">Gondar</option>
                    <option value="Bahir Dar">Bahir Dar</option>
                    <option value="Addis Ababa">Addis Ababa</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <select
                    className="form-select form-select-sm"
                    value={adminStatusFilter}
                    onChange={(e) => setAdminStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div className="col-12 col-md-2 text-md-end text-muted small">
                  {filteredSuperAdmins.length} Super Admin{filteredSuperAdmins.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden shadow-sm">
              <div className="ardab-table-wrapper">
                <table className="ardab-table">
                  <thead>
                    <tr>
                      <th>Account ID &amp; Name</th>
                      <th>Email &amp; Phone</th>
                      <th>Role</th>
                      <th>Assigned Regional Cities</th>
                      <th>Last Login</th>
                      <th>Status</th>
                      <th className="text-end">Sub Admin Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuperAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td>
                          <span className="fw-bold text-dark">{admin.name}</span>
                          <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                            ID: <code>{admin.id}</code> &bull; Created: {admin.createdAt || 'Platform Init'}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{admin.email}</div>
                          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                            <i className="bi bi-telephone me-1"></i>
                            {admin.phone || '+251 91 000 0000'}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            SUPER ADMIN
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap" style={{ maxWidth: 220 }}>
                            {admin.assignedCities.map((city) => (
                              <span key={city} className="badge badge-info-soft" style={{ fontSize: '0.68rem' }}>
                                {city}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="small text-muted">{admin.lastLogin}</td>
                        <td>
                          <span className={`badge ${admin.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'}`}>
                            {admin.status}
                          </span>
                        </td>
                        <td className="text-end">
                          {canManageAdmins ? (
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border"
                                onClick={() => handleOpenEditModal(admin)}
                                title="Edit Super Admin details"
                              >
                                <i className="bi bi-pencil-square me-1"></i> Edit
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${admin.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                onClick={() => handleToggleSuperAdminStatus(admin.id)}
                                title={admin.status === 'ACTIVE' ? 'Suspend Super Admin Account' : 'Reactivate Super Admin Account'}
                              >
                                {admin.status === 'ACTIVE' ? (
                                  <>
                                    <i className="bi bi-lock me-1"></i> Suspend
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-unlock me-1"></i> Activate
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border"
                                onClick={() => handleResetSuperAdminPassword(admin.id)}
                                title="Generate temporary credential"
                              >
                                <i className="bi bi-key me-1"></i> Reset
                              </button>
                              {admin.id !== 'ADM-001' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => setDeletingAdmin(admin)}
                                  title="Deprovision account"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">View Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredSuperAdmins.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No Super Admin accounts match your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="d-lg-none d-flex flex-column gap-3 mb-4">
              {filteredSuperAdmins.map((admin) => (
                <div key={admin.id} className="ardab-card p-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="fw-bold text-dark fs-6">{admin.name}</span>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                        {admin.email} &bull; <code>{admin.id}</code>
                      </div>
                    </div>
                    <span className={`badge ${admin.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'}`}>
                      {admin.status}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                    <span>Phone: {admin.phone || 'N/A'}</span>
                    <span>Last: {admin.lastLogin}</span>
                  </div>

                  <div className="d-flex gap-1 flex-wrap mb-3">
                    {admin.assignedCities.map((c) => (
                      <span key={c} className="badge badge-info-soft" style={{ fontSize: '0.65rem' }}>{c}</span>
                    ))}
                  </div>

                  {canManageAdmins ? (
                    <div className="d-flex gap-1 flex-wrap pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border flex-grow-1"
                        onClick={() => handleOpenEditModal(admin)}
                      >
                        <i className="bi bi-pencil-square me-1"></i> Edit
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm flex-grow-1 ${admin.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => handleToggleSuperAdminStatus(admin.id)}
                      >
                        {admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border flex-grow-1"
                        onClick={() => handleResetSuperAdminPassword(admin.id)}
                      >
                        <i className="bi bi-key me-1"></i> Reset
                      </button>
                      {admin.id !== 'ADM-001' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeletingAdmin(admin)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-top text-muted small">View Only</div>
                  )}
                </div>
              ))}
              {filteredSuperAdmins.length === 0 && (
                <div className="ardab-card p-4 text-center text-muted">
                  No Super Admin accounts found matching criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Active Sessions */}
        {activeTab === 'SESSIONS' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>User &amp; Role</th>
                    <th>Device &amp; Browser</th>
                    <th>IP Address &amp; Location</th>
                    <th>Started</th>
                    <th>Last Active</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-semibold text-dark">{s.userName}</div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          {s.userEmail} &bull; <span className="badge badge-info-soft">{s.role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-dark small">{s.device}</div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>{s.browser}</div>
                      </td>
                      <td>
                        <div className="fw-bold text-dark small">{s.ipAddress}</div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>{s.location}</div>
                      </td>
                      <td className="small text-muted">{s.startedAt}</td>
                      <td className="small fw-medium text-dark">{s.lastActive}</td>
                      <td>
                        <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="text-end">
                        {s.status === 'ACTIVE' ? (
                          canManageSessions ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRevokeSession(s.id)}
                            >
                              <i className="bi bi-door-closed me-1"></i> Revoke
                            </button>
                          ) : (
                            <span className="badge badge-success-soft">Active</span>
                          )
                        ) : (
                          <span className="text-muted small">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Security Alerts */}
        {activeTab === 'ALERTS' && (
          <div className="d-flex flex-column gap-3 mb-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`ardab-card p-4 border shadow-sm ${
                  alert.severity === 'HIGH' ? 'border-danger' : alert.severity === 'MEDIUM' ? 'border-warning' : ''
                }`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className={`badge ${
                        alert.severity === 'HIGH'
                          ? 'bg-danger'
                          : alert.severity === 'MEDIUM'
                          ? 'bg-warning text-dark'
                          : 'bg-info text-dark'
                      }`}
                    >
                      {alert.severity} SEVERITY
                    </span>
                    <h6 className="fw-bold text-dark mb-0">{alert.title}</h6>
                  </div>
                  <span className="text-muted small">{alert.timestamp}</span>
                </div>

                <p className="text-muted small mb-3">{alert.description}</p>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div className="small text-muted">
                    {alert.ipAddress && <span>Target IP: <code>{alert.ipAddress}</code></span>}
                  </div>
                  {alert.resolved ? (
                    <span className="badge badge-success-soft">
                      <i className="bi bi-check-circle-fill me-1"></i> Resolved by {alert.resolvedBy}
                    </span>
                  ) : canManageAlerts ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      <i className="bi bi-check2 me-1"></i> Mark Resolved
                    </button>
                  ) : (
                    <span className="badge badge-warning-soft">Pending Investigation</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: IP Firewall Rules */}
        {activeTab === 'FIREWALL' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>IP / Subnet</th>
                    <th>Reason / Justification</th>
                    <th>Enforced By</th>
                    <th>Date Added</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipRules.map((rule) => (
                    <tr key={rule.id}>
                      <td><span className="fw-bold text-dark">{rule.id}</span></td>
                      <td><code>{rule.ipAddress}</code></td>
                      <td className="small text-dark">{rule.reason}</td>
                      <td className="small text-muted">{rule.blockedBy}</td>
                      <td className="small text-muted">{rule.blockedAt}</td>
                      <td>
                        <span className={`badge ${rule.status === 'BLOCKED' ? 'bg-danger' : 'bg-success'}`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="text-end">
                        {canManageFirewall && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteIpRule(rule.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Failed Logins */}
        {activeTab === 'FAILED_LOGINS' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Attempted Email</th>
                    <th>IP Address</th>
                    <th>City / Region</th>
                    <th>Timestamp</th>
                    <th>Failure Reason</th>
                    <th>Firewall Status</th>
                  </tr>
                </thead>
                <tbody>
                  {failedLogins.map((fl) => (
                    <tr key={fl.id}>
                      <td className="fw-bold text-dark">{fl.id}</td>
                      <td className="fw-medium text-dark">{fl.attemptedEmail}</td>
                      <td><code>{fl.ipAddress}</code></td>
                      <td className="small text-muted">{fl.city}</td>
                      <td className="small text-muted">{fl.timestamp}</td>
                      <td className="small text-danger">{fl.reason}</td>
                      <td>
                        {fl.blocked ? (
                          <span className="badge bg-danger">IP Auto-Blocked</span>
                        ) : (
                          <span className="badge badge-warning-soft">Monitoring</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Audit Trail */}
        {activeTab === 'AUDIT' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Admin Name</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>IP Address</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="fw-bold text-dark">{log.id}</td>
                      <td>
                        <div className="fw-semibold text-dark">{log.adminName}</div>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>{log.adminEmail}</div>
                      </td>
                      <td><span className="badge badge-neutral-soft">{log.action}</span></td>
                      <td className="small text-dark">{log.entity}: {log.entityId}</td>
                      <td><code>{log.ipAddress}</code></td>
                      <td className="small text-muted">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Super Admin Account Modal */}
        {showCreateSuperAdminModal && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Create Super Admin Account</h5>
                    <span className="text-muted small">Provision commercial marketplace privileges</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowCreateSuperAdminModal(false)}></button>
                </div>
                <form onSubmit={handleCreateSuperAdmin}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Yohannes Tadesse"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Corporate Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. yohannes.admin@ardabmarket.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Contact Phone (+251)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +251 91 234 5678"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Initial Password</label>
                      <input
                        type="text"
                        className="form-control"
                        value={adminInitialPassword}
                        onChange={(e) => setAdminInitialPassword(e.target.value)}
                        required
                      />
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        Super Admin will sign in using the shared login portal (/login).
                      </span>
                    </div>

                    <div className="mb-2">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Assigned Operational Cities
                      </label>
                      <div className="d-flex gap-3 flex-wrap">
                        {['Gondar', 'Bahir Dar', 'Addis Ababa'].map((city) => (
                          <div key={city} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`city-${city}`}
                              checked={adminCities.includes(city)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAdminCities((prev) => [...prev, city]);
                                } else {
                                  setAdminCities((prev) => prev.filter((c) => c !== city));
                                }
                              }}
                            />
                            <label className="form-check-label small" htmlFor={`city-${city}`}>
                              {city}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setShowCreateSuperAdminModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-ardab-primary">
                      Create &amp; Provision Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Super Admin Modal */}
        {editingAdmin && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Edit Super Admin Account</h5>
                    <span className="text-muted small">Update credentials &amp; regional jurisdiction</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setEditingAdmin(null)}></button>
                </div>
                <form onSubmit={handleSaveEditAdmin}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Account Status</label>
                      <select
                        className="form-select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                      >
                        <option value="ACTIVE">ACTIVE - Operational</option>
                        <option value="SUSPENDED">SUSPENDED - Access Blocked</option>
                      </select>
                    </div>

                    <div className="mb-2">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Assigned Regional Cities
                      </label>
                      <div className="d-flex gap-3 flex-wrap">
                        {['Gondar', 'Bahir Dar', 'Addis Ababa'].map((city) => (
                          <div key={city} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`edit-city-${city}`}
                              checked={editCities.includes(city)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditCities((prev) => [...prev, city]);
                                } else {
                                  setEditCities((prev) => prev.filter((c) => c !== city));
                                }
                              }}
                            />
                            <label className="form-check-label small" htmlFor={`edit-city-${city}`}>
                              {city}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditingAdmin(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-ardab-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Super Admin Confirmation Modal */}
        {deletingAdmin && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom bg-danger bg-opacity-10">
                  <h5 className="modal-title fw-bold text-danger">Deprovision Super Admin Account</h5>
                  <button type="button" className="btn-close" onClick={() => setDeletingAdmin(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <p className="text-dark mb-2">
                    Are you sure you want to permanently deprovision the Super Admin account for{' '}
                    <strong>{deletingAdmin.name}</strong> (<code>{deletingAdmin.email}</code>)?
                  </p>
                  <div className="alert alert-warning small mb-0">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    This Super Admin will immediately lose access to Marketplace Products, Suppliers, Customers, Orders, and Deliveries. This action is logged to the system audit trail.
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setDeletingAdmin(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={handleConfirmDelete}
                  >
                    Yes, Deprovision Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add IP Firewall Rule Modal */}
        {showAddIpModal && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">Add IP Firewall Rule</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddIpModal(false)}></button>
                </div>
                <form onSubmit={handleAddIpRule}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">IP Address or CIDR Subnet</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 197.156.102.55 or 10.0.0.0/16"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Firewall Policy</label>
                      <select
                        className="form-select"
                        value={newIpStatus}
                        onChange={(e) => setNewIpStatus(e.target.value as 'BLOCKED' | 'WHITELISTED')}
                      >
                        <option value="BLOCKED">BLOCK - Drop All Traffic</option>
                        <option value="WHITELISTED">WHITELIST - Allow Traffic</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Reason / Security Note</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Explain reason for blocking or whitelisting..."
                        value={newIpReason}
                        onChange={(e) => setNewIpReason(e.target.value)}
                        required
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddIpModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-ardab-primary">
                      Save Rule
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
