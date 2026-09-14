'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { notificationsApi } from '@/lib/api';
import { NotificationItem } from '@/types/notification';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    notificationsApi
      .getAll()
      .then((res) => {
        if (isMounted) setNotifications(res);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await notificationsApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    await notificationsApi.bulkMarkAsRead(selectedIds);
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.includes(n.id) ? { ...n, isRead: true } : n))
    );
    setSelectedIds([]);
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesCategory = categoryFilter === 'ALL' || n.category === categoryFilter;
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [notifications, categoryFilter, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedNotifications = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedNotifications.map((n) => n.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedNotifications.map((n) => n.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const isAllPageSelected =
    paginatedNotifications.length > 0 &&
    paginatedNotifications.every((n) => selectedIds.includes(n.id));

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
              disabled={unreadCount === 0}
            >
              <i className="bi bi-check2-all"></i>
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          </div>
        }
      >
        {/* Search & Category Filter Bar */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-6">
              <div className="d-flex gap-2 flex-wrap">
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
              Total {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading notifications...
            </div>
          ) : paginatedNotifications.length > 0 ? (
            paginatedNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 border-bottom d-flex align-items-start justify-content-between gap-3 ${
                  item.isRead ? 'bg-white' : 'bg-light'
                } ${selectedIds.includes(item.id) ? 'border-primary bg-primary-subtle' : ''}`}
              >
                <div className="d-flex align-items-start gap-3">
                  <input
                    type="checkbox"
                    className="form-check-input mt-2"
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
                          : 'bi-shield-check'
                      }`}
                    ></i>
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h3 className="h6 fw-bold text-dark mb-0">{item.title}</h3>
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
                        {item.timestamp}
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

                {!item.isRead && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light border flex-shrink-0"
                    title="Mark as read"
                    onClick={() => handleMarkAsRead(item.id)}
                  >
                    <i className="bi bi-check2"></i>
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-4">
              <EmptyState
                icon="bi-bell-slash"
                title="No notifications found"
                description="There are no notifications matching your active search query or category filter."
                actionLabel="Reset Search & Filters"
                onAction={() => {
                  setSearchTerm('');
                  setCategoryFilter('ALL');
                }}
              />
            </div>
          )}
        </div>

        {/* Server-ready Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />
      </PageContainer>
    </AdminLayout>
  );
}
