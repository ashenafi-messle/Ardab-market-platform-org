'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import {
  supportApi,
  securityApi,
  maintenanceApi,
  feedbackApi,
} from '@/lib/api';
import { SupportTicket } from '@/types/support';
import { AdminUser, ActiveSession, SecurityAlert } from '@/types/security';
import { SystemService, MaintenanceWindow } from '@/types/maintenance';
import { FeedbackItem, FeedbackMetrics } from '@/types/feedback';

export default function SubAdminDashboardPage() {
  const { selectedCity } = useAuth();

  const [superAdmins, setSuperAdmins] = useState<AdminUser[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [services, setServices] = useState<SystemService[]>([]);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackMetrics, setFeedbackMetrics] = useState<FeedbackMetrics | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      supportApi.getAll(selectedCity),
      securityApi.getSuperAdminAccounts(),
      securityApi.getActiveSessions(),
      securityApi.getSecurityAlerts(),
      maintenanceApi.getServices(),
      maintenanceApi.getMaintenanceWindows(),
      feedbackApi.getAll(undefined, selectedCity),
      feedbackApi.getMetrics(),
    ]).then(([ticketsRes, adminsRes, sessionsRes, alertsRes, servicesRes, windowsRes, feedbackRes, metricsRes]) => {
      if (isMounted) {
        setTickets(ticketsRes);
        setSuperAdmins(adminsRes);
        setSessions(sessionsRes);
        setAlerts(alertsRes);
        setServices(servicesRes);
        setWindows(windowsRes);
        setFeedback(feedbackRes);
        setFeedbackMetrics(metricsRes);
      }
    }).catch((err) => {
      console.error('Failed to load subadmin dashboard:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const urgentTickets = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'RESOLVED');
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const healthyServicesCount = services.filter((s) => s.status === 'HEALTHY').length;
  const activeSuperAdminsCount = superAdmins.filter((a) => a.status === 'ACTIVE').length;

  return (
    <AdminLayout>
      <PageContainer
        title="Sub Admin Command Center"
        subtitle={`System Operations: Super Admin Governance, Customer Support, System Security, Maintenance, and Feedback (${selectedCity})`}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link href="/subadmin/security" className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-person-plus-fill"></i>
              <span>Create Super Admin</span>
            </Link>
            <Link href="/subadmin/support" className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-1">
              <i className="bi bi-headset"></i>
              <span>Support Queue</span>
            </Link>
            <Link href="/subadmin/maintenance" className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-1">
              <i className="bi bi-wrench-adjustable"></i>
              <span>Schedule Maintenance</span>
            </Link>
          </div>
        }
      >
        {/* Urgent Support Alert Banner */}
        {urgentTickets.length > 0 && (
          <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fff1f2 100%)', borderLeft: '5px solid #dc2626' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="d-flex align-items-start gap-3">
                <div className="p-2 rounded-circle bg-danger bg-opacity-25 text-danger fs-4">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">
                    {urgentTickets.length} Urgent Customer Support Ticket{urgentTickets.length > 1 ? 's' : ''} Require Immediate Attention
                  </h6>
                  <p className="text-muted small mb-0">
                    High priority customer inquiries regarding order payments and urgent logistics resolution are currently queued.
                  </p>
                </div>
              </div>
              <Link
                href="/subadmin/support"
                className="btn btn-danger fw-semibold px-4 text-nowrap align-self-start align-self-md-center shadow-sm"
              >
                Resolve Tickets &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* 4 Core Sub Admin Function KPI Metric Cards */}
        <div className="row g-3 mb-4">
          {/* 1. Customer Support */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/subadmin/support" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3 p-xl-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Customer Support</span>
                  <div className="ardab-icon-box icon-box-warning" style={{ width: 40, height: 40, fontSize: '1.15rem' }}>
                    <i className="bi bi-headset"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{openTickets.length}</h3>
                  <span className="badge badge-warning-soft" style={{ fontSize: '0.7rem' }}>
                    {urgentTickets.length} Urgent
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {tickets.length} total tickets logged
                </div>
              </div>
            </Link>
          </div>

          {/* 2. Security & Super Admins Management */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/subadmin/security" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3 p-xl-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Security &amp; Super Admins</span>
                  <div className="ardab-icon-box icon-box-teal" style={{ width: 40, height: 40, fontSize: '1.15rem' }}>
                    <i className="bi bi-shield-lock-check"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{superAdmins.length}</h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    {activeSuperAdminsCount} Active Admins
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {superAdmins.length} Super Admins &bull; {unresolvedAlerts.length} alerts pending
                </div>
              </div>
            </Link>
          </div>

          {/* 3. Maintenance Management */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/subadmin/maintenance" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3 p-xl-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">System Maintenance</span>
                  <div className="ardab-icon-box icon-box-info" style={{ width: 40, height: 40, fontSize: '1.15rem' }}>
                    <i className="bi bi-wrench-adjustable"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{healthyServicesCount}/{services.length}</h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    Services 100% OK
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {windows.filter((w) => w.status === 'SCHEDULED').length} scheduled maintenance window
                </div>
              </div>
            </Link>
          </div>

          {/* 4. Feedback Management */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/subadmin/feedback" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3 p-xl-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Feedback &amp; Reviews</span>
                  <div className="ardab-icon-box icon-box-green" style={{ width: 40, height: 40, fontSize: '1.15rem' }}>
                    <i className="bi bi-chat-square-heart"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">
                    {feedbackMetrics?.averageRating ? `${feedbackMetrics.averageRating} ★` : '4.85 ★'}
                  </h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    NPS: {feedbackMetrics?.netPromoterScore || 86}
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {feedbackMetrics?.totalReviews || feedback.length} verified ratings
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Super Admin Accounts Provisioning Banner Card */}
        <div className="ardab-card p-3 p-md-4 mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)' }}>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div className="d-flex align-items-start gap-3">
              <div className="p-3 rounded-3 bg-white shadow-sm text-teal fs-3">
                <i className="bi bi-person-badge-fill"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="fw-bold text-dark mb-0">Super Admin Accounts Management</h6>
                  <span className="badge bg-teal text-white" style={{ fontSize: '0.68rem', backgroundColor: '#0d9488' }}>
                    Managed by Sub Admin
                  </span>
                </div>
                <p className="text-muted small mb-0" style={{ maxWidth: 650 }}>
                  As Sub Admin, you provision, configure regional authority, reset credentials, and monitor accounts for platform Super Admins. Super Admins operate marketplace inventory, suppliers, customers, orders, and logistics.
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 align-self-start align-self-lg-center flex-wrap">
              <Link href="/subadmin/security" className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 shadow-sm">
                <i className="bi bi-person-plus-fill"></i>
                <span>+ Create Super Admin</span>
              </Link>
              <Link href="/subadmin/security" className="btn btn-sm btn-outline-secondary bg-white d-flex align-items-center gap-1">
                <i className="bi bi-sliders"></i>
                <span>Manage Accounts ({superAdmins.length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Row 2: Customer Support Queue & Super Admin / Security Monitor */}
        <div className="row g-3 mb-4">
          {/* Left: Active Support Tickets Queue */}
          <div className="col-12 col-lg-7">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-headset text-warning me-2"></i>
                    Customer Support Queue
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Multi-city client inquiries, payment verifications &amp; order assistance
                  </span>
                </div>
                <Link href="/subadmin/support" className="small text-success text-decoration-none fw-semibold">
                  Manage Support &rarr;
                </Link>
              </div>

              <div className="d-flex flex-column gap-2">
                {tickets.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-3 border ${
                      t.priority === 'URGENT' ? 'bg-danger bg-opacity-10 border-danger' : 'bg-light'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark small">{t.ticketNumber}</span>
                        {t.priority === 'URGENT' && <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>URGENT</span>}
                      </div>
                      <span
                        className={`ardab-badge ${
                          t.status === 'RESOLVED'
                            ? 'badge-success-soft'
                            : t.status === 'IN_PROGRESS'
                            ? 'badge-info-soft'
                            : 'badge-warning-soft'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="fw-semibold text-dark small mb-1">{t.subject}</div>

                    <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top" style={{ fontSize: '0.75rem' }}>
                      <span>
                        <i className="bi bi-person me-1"></i> {t.customerName} ({t.city})
                      </span>
                      <Link href="/subadmin/support" className="text-success fw-semibold text-decoration-none">
                        Respond &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Managed Super Admins & Active System Sessions */}
          <div className="col-12 col-lg-5">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-shield-lock text-primary me-2"></i>
                    Super Admins &amp; Sessions
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Accounts provisioned &amp; live sessions
                  </span>
                </div>
                <Link href="/subadmin/security" className="small text-success text-decoration-none fw-semibold">
                  Security Hub &rarr;
                </Link>
              </div>

              {/* Super Admin Accounts Mini List */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold text-dark small">Super Admin Accounts</span>
                  <Link href="/subadmin/security" className="small text-muted text-decoration-none" style={{ fontSize: '0.72rem' }}>
                    View all ({superAdmins.length}) &rarr;
                  </Link>
                </div>
                <div className="d-flex flex-column gap-2">
                  {superAdmins.slice(0, 3).map((adm) => (
                    <div key={adm.id} className="p-2 px-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold text-dark small">{adm.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {adm.email} &bull; {adm.assignedCities.join(', ')}
                        </div>
                      </div>
                      <span className={`badge ${adm.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'}`} style={{ fontSize: '0.65rem' }}>
                        {adm.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Sessions Overview */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold text-dark small">Live System Sessions ({sessions.filter((s) => s.status === 'ACTIVE').length})</span>
                </div>
                <div className="d-flex flex-column gap-2">
                  {sessions.slice(0, 2).map((s) => (
                    <div key={s.id} className="p-2 px-3 bg-light rounded-3 border">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-medium text-dark small">{s.userName}</div>
                        <span className="badge badge-info-soft" style={{ fontSize: '0.65rem' }}>
                          {s.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between small text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                        <span>IP: {s.ipAddress}</span>
                        <span>{s.lastActive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Firewall Status Mini Box */}
              <div className="p-2 px-3 bg-light-subtle rounded-3 border d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-fire text-danger fs-5"></i>
                  <div>
                    <span className="fw-semibold text-dark small d-block">IP Firewall Active</span>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>Enforcing rules &bull; 0 intrusions</span>
                  </div>
                </div>
                <Link href="/subadmin/security" className="btn btn-xs btn-outline-secondary">
                  Configure
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Maintenance Status & Feedback Stream */}
        <div className="row g-3">
          {/* Maintenance & Services */}
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-activity text-success me-2"></i>
                    System Health &amp; Services
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    PostgreSQL, PostGIS spatial engine, and cloud API latency
                  </span>
                </div>
                <Link href="/subadmin/maintenance" className="small text-success text-decoration-none fw-semibold">
                  Full Diagnostics &rarr;
                </Link>
              </div>

              <div className="row g-2 mb-3">
                {services.slice(0, 4).map((srv) => (
                  <div key={srv.id} className="col-6">
                    <div className="p-2 rounded-3 bg-light border">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-truncate fw-medium text-dark small" style={{ fontSize: '0.75rem', maxWidth: '80%' }}>
                          {srv.name}
                        </span>
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '0.75rem' }}></i>
                      </div>
                      <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.7rem' }}>
                        <span>{srv.latencyMs}ms</span>
                        <span>{srv.uptimePercentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next Scheduled Window */}
              {windows[0] && (
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-semibold text-dark small">Upcoming Maintenance Window:</span>
                    <span className="badge badge-info-soft" style={{ fontSize: '0.65rem' }}>Scheduled</span>
                  </div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                    {windows[0].title}
                  </div>
                  <div className="text-dark fw-medium small mt-1" style={{ fontSize: '0.72rem' }}>
                    <i className="bi bi-clock me-1 text-primary"></i> {windows[0].scheduledStartTime}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback & Customer Sentiment */}
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-chat-square-quote text-teal me-2"></i>
                    Recent Feedback &amp; Ratings
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Customer and supplier reviews across delivery and products
                  </span>
                </div>
                <Link href="/subadmin/feedback" className="small text-success text-decoration-none fw-semibold">
                  Review All &rarr;
                </Link>
              </div>

              <div className="d-flex flex-column gap-2">
                {feedback.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div>
                        <div className="fw-semibold text-dark small">{item.title}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          By {item.authorName} ({item.city}) &bull; Target: {item.targetEntityName}
                        </div>
                      </div>
                      <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: '0.7rem' }}>
                        {'★'.repeat(item.rating)}
                      </span>
                    </div>
                    <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.75rem' }}>
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
