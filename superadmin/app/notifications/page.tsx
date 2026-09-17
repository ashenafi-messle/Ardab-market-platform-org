'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { notificationsApi, ApiResponseError } from '@/lib/api';
import { Notification, NotificationSummary } from '@/types/notification';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [tab, setTab] = useState<'ALL' | 'ALERTS' | 'UNREAD'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        notificationsApi.getSummary(),
        notificationsApi.list({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          tab: tab === 'ALERTS' ? 'ALERTS' : undefined,
          unreadOnly: tab === 'UNREAD' ? 'true' : undefined,
        }),
      ]);
      setSummary(sumRes);
      setNotifications(listRes.data);
      setTotalItems(listRes.pagination.total);
    } catch (e: unknown) {
      if (
        e instanceof ApiResponseError &&
        (e.statusCode === 401 ||
          e.code === 'SESSION_EXPIRED' ||
          e.code === 'SESSION_REVOKED' ||
          e.code === 'TOKEN_EXPIRED')
      ) {
        return;
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, categoryFilter, tab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await notificationsApi.acknowledgeAlert(id, 'Acknowledged via UI');
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllAsRead(categoryFilter !== 'ALL' ? categoryFilter : undefined);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await notificationsApi.bulkMarkAsRead(selectedIds);
      setSelectedIds([]);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkAcknowledge = async () => {
    if (selectedIds.length === 0) return;
    try {
      await notificationsApi.bulkAcknowledgeAlerts(selectedIds, 'Bulk acknowledged via UI');
      setSelectedIds([]);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    notifications.length > 0 &&
    notifications.every((n) => selectedIds.includes(n.id));

  const handleSelectAllOnPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(notifications.map((n) => n.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = [...selectedIds];
      notifications.forEach((n) => {
        if (!newSelected.includes(n.id)) newSelected.push(n.id);
      });
      setSelectedIds(newSelected);
    }
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Notifications & Operational Alerts"
        subtitle="Critical fleet updates, load alerts, security logs, and customer transaction notifications"
        breadcrumbs={[{ label: 'System' }, { label: 'Notifications' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-1"
              onClick={handleMarkAll}
              disabled={summary?.unreadCount === 0}
            >
              <i className="bi bi-check2-all"></i>
              <span>Mark All as Read ({summary?.unreadCount || 0})</span>
            </button>
          </div>
        }
      >
        {/* Metric Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 d-flex align-items-center gap-3">
              <div className="ardab-icon-box icon-box-info" style={{ width: 48, height: 48 }}>
                <i className="bi bi-bell fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0 fw-semibold text-uppercase tracking-wider">Total Notifications</p>
                <h4 className="fw-bold text-dark mb-0">{summary?.total || 0}</h4>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 d-flex align-items-center gap-3">
              <div className="ardab-icon-box icon-box-warning" style={{ width: 48, height: 48 }}>
                <i className="bi bi-exclamation-triangle fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0 fw-semibold text-uppercase tracking-wider">Active Alerts</p>
                <h4 className="fw-bold text-dark mb-0">{summary?.alertCount || 0}</h4>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 d-flex align-items-center gap-3">
              <div className="ardab-icon-box icon-box-danger" style={{ width: 48, height: 48 }}>
                <i className="bi bi-shield-exclamation fs-5"></i>
              </div>
              <div>
                <p className="text-muted small mb-0 fw-semibold text-uppercase tracking-wider">Unread Critical</p>
                <h4 className="fw-bold text-dark mb-0">{summary?.criticalCount || 0}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Search & Category Filter Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center mb-3 border-bottom pb-3">
            <div className="col-12">
               <ul className="nav nav-pills gap-2">
                 <li className="nav-item">
                   <button
                     className={`nav-link ${tab === 'ALL' ? 'active bg-success text-white' : 'text-dark bg-light'}`}
                     onClick={() => { setTab('ALL'); setCurrentPage(1); }}
                   >
                     All Notifications
                   </button>
                 </li>
                 <li className="nav-item">
                   <button
                     className={`nav-link ${tab === 'UNREAD' ? 'active bg-success text-white' : 'text-dark bg-light'}`}
                     onClick={() => { setTab('UNREAD'); setCurrentPage(1); }}
                   >
                     Unread ({summary?.unreadCount || 0})
                   </button>
                 </li>
                 <li className="nav-item">
                   <button
                     className={`nav-link ${tab === 'ALERTS' ? 'active bg-danger text-white' : 'text-dark bg-light'}`}
                     onClick={() => { setTab('ALERTS'); setCurrentPage(1); }}
                   >
                     Operational Alerts
                   </button>
                 </li>
               </ul>
            </div>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search notifications by keyword..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search notifications"
                />
              </div>
            </div>
            <div className="col-12 col-md-8">
              <div className="d-flex gap-2 flex-wrap justify-content-md-end">
                {['ALL', 'FLEET', 'DELIVERY', 'ORDER', 'SECURITY', 'SYSTEM'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${
                      categoryFilter === cat
                        ? 'btn-ardab-primary shadow-sm'
                        : 'btn-outline-secondary bg-white border'
                    }`}
                    onClick={() => {
                      setCategoryFilter(cat);
                      setCurrentPage(1);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="alert alert-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 py-2 px-3 shadow-sm rounded-3">
            <div className="d-flex align-items-center gap-2 fw-semibold small">
              <i className="bi bi-check2-square fs-6 text-primary"></i>
              <span>{selectedIds.length} notification(s) selected</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-success px-3 d-flex align-items-center gap-1"
                onClick={handleBulkMarkAsRead}
              >
                <i className="bi bi-envelope-open"></i> Mark Selected as Read
              </button>
              {tab === 'ALERTS' && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger px-3 d-flex align-items-center gap-1"
                  onClick={handleBulkAcknowledge}
                >
                  <i className="bi bi-shield-check"></i> Acknowledge Alerts
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary text-decoration-none"
                onClick={() => setSelectedIds([])}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="ardab-card p-0 overflow-hidden mb-4 shadow-sm">
          <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={isAllPageSelected}
                onChange={handleSelectAllOnPage}
                aria-label="Select all notifications on page"
              />
              <span className="small text-muted fw-semibold">Select Current Page</span>
            </div>
            <span className="small text-muted">
              Total {totalItems} notification{totalItems !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 border-bottom d-flex align-items-start justify-content-between gap-3 ${
                  item.isRead ? 'bg-white' : 'bg-light'
                } ${selectedIds.includes(item.id) ? 'border-primary bg-primary-subtle' : ''}`}
              >
                <div className="d-flex align-items-start gap-3 flex-grow-1">
                  <input
                    type="checkbox"
                    className="form-check-input mt-2 flex-shrink-0"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    aria-label={`Select notification ${item.id}`}
                  />
                  <div
                    className={`ardab-icon-box flex-shrink-0 ${
                      item.category === 'FLEET'
                        ? 'icon-box-warning'
                        : item.category === 'DELIVERY'
                        ? 'icon-box-teal'
                        : item.category === 'ORDER'
                        ? 'icon-box-green'
                        : item.category === 'SECURITY'
                        ? 'icon-box-danger'
                        : 'icon-box-info'
                    }`}
                    style={{ width: 44, height: 44, fontSize: '1.25rem' }}
                  >
                    <i
                      className={`bi ${
                        item.category === 'FLEET'
                          ? 'bi-truck'
                          : item.category === 'DELIVERY'
                          ? 'bi-signpost-split'
                          : item.category === 'ORDER'
                          ? 'bi-receipt'
                          : item.category === 'SECURITY'
                          ? 'bi-shield-check'
                          : 'bi-bell'
                      }`}
                    ></i>
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h3 className="h6 fw-bold text-dark mb-0">{item.title}</h3>
                      {item.isAlert && (
                        <span className={`badge ${item.severity === 'CRITICAL' ? 'bg-danger' : 'bg-warning text-dark'}`} style={{ fontSize: '0.65rem' }}>
                          ALERT - {item.severity}
                        </span>
                      )}
                      {!item.isRead && (
                        <span className="badge badge-success-soft" style={{ fontSize: '0.65rem' }}>
                          UNREAD
                        </span>
                      )}
                      <span className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-muted small mb-2">{item.message}</p>
                    <div className="d-flex align-items-center gap-3">
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-clock me-1"></i>
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.actionUrl && (
                        <Link
                          href={item.actionUrl}
                          className="small text-success fw-medium text-decoration-none"
                        >
                          Investigate in Portal &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 flex-shrink-0">
                  {!item.isRead && (
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      title="Mark as read"
                      onClick={() => handleMarkAsRead(item.id)}
                    >
                      <i className="bi bi-check2"></i> Mark Read
                    </button>
                  )}
                  {item.isAlert && !item.isAcknowledged && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Acknowledge Alert"
                      onClick={() => handleAcknowledge(item.id)}
                    >
                      <i className="bi bi-shield-check"></i> Acknowledge
                    </button>
                  )}
                  {item.isAlert && item.isAcknowledged && (
                    <span className="badge bg-light text-success border">
                      <i className="bi bi-check-circle-fill me-1"></i> Acknowledged
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon="bi-bell-slash"
              title="No Notifications Found"
              description="You have no notifications or alerts matching your current filters."
            />
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="p-3 border-top">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / pageSize)}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={(size: number) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                totalRecords={totalItems}
              />
            </div>
          )}
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
