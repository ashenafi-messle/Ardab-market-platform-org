'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { customersApi } from '@/lib/api';
import { Customer } from '@/types/customer';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import ConfirmationModal, { ConfirmationVariant } from '@/components/common/ConfirmationModal';
import TableSkeleton from '@/components/common/TableSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';

export default function CustomersPage() {
  const { user, selectedCity } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationVariant;
    action: () => Promise<void>;
    affectedCount?: number;
    affectedNames?: string[];
    isIrreversible?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const canSuspend = hasPermission(user?.role, 'customers:suspend');

  useEffect(() => {
    let isMounted = true;
    customersApi
      .getAll(selectedCity)
      .then((res) => {
        if (isMounted) setCustomers(res);
      })
      .catch((e) => {
        console.error('Failed to load customers:', e);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.deliveryZone.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'ALL' || c.accountStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [customers, debouncedSearch, selectedStatus]);

  // Paginated records
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safePage, pageSize]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedCustomers.map((c) => c.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedCustomers.map((c) => c.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    paginatedCustomers.length > 0 &&
    paginatedCustomers.every((c) => selectedIds.includes(c.id));

  // Prompt single suspension toggle
  const promptToggleSuspend = (customer: Customer) => {
    const isSuspending = customer.accountStatus === 'ACTIVE';
    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Suspend Customer Account' : 'Reactivate Customer Account',
      message: isSuspending
        ? `Are you sure you want to suspend ${customer.name}? This customer will be immediately blocked from placing orders and checking out in ${customer.city}.`
        : `Reactivate ${customer.name}'s account? The customer will regain full shopping and order placement access.`,
      variant: isSuspending ? 'danger' : 'success',
      confirmLabel: isSuspending ? 'Suspend Account' : 'Reactivate Account',
      affectedCount: 1,
      affectedNames: [`${customer.name} (${customer.phone})`],
      action: async () => {
        const updated = await customersApi.toggleStatus(customer.id);
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
        if (viewCustomer && viewCustomer.id === customer.id) {
          setViewCustomer(updated);
        }
      },
    });
  };

  // Bulk suspension or reactivation
  const promptBulkStatus = (newStatus: 'ACTIVE' | 'SUSPENDED') => {
    const count = selectedIds.length;
    const isSuspending = newStatus === 'SUSPENDED';

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Bulk Suspend Customers' : 'Bulk Reactivate Customers',
      message: isSuspending
        ? `You are about to suspend ${count} customer account(s). They will be locked out of placing orders until reactivated.`
        : `Reactivate ${count} customer account(s)? Full access to the Ardab marketplace will be restored.`,
      variant: isSuspending ? 'danger' : 'success',
      confirmLabel: isSuspending ? 'Suspend Selected' : 'Reactivate Selected',
      affectedCount: count,
      affectedNames: selectedIds,
      action: async () => {
        await customersApi.bulkUpdateStatus(selectedIds, newStatus);
        setCustomers((prev) =>
          prev.map((c) => (selectedIds.includes(c.id) ? { ...c, accountStatus: newStatus } : c))
        );
        setSelectedIds([]);
      },
    });
  };

  const handleConfirmModalAction = async () => {
    try {
      setIsConfirming(true);
      await confirmModal.action();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Customer Operations"
        subtitle="Customer profiles, order frequency, delivery zones, and trust verification across cities"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Customers' }]}
      >
        {/* Search & Filters */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search customer by name, phone (+251...), email, or zone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search customers"
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED');
                  setCurrentPage(1);
                }}
                aria-label="Filter by account status"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Accounts</option>
                <option value="SUSPENDED">Suspended Accounts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && canSuspend && (
          <div className="alert alert-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 py-2 px-3 shadow-sm rounded-3">
            <div className="d-flex align-items-center gap-2 fw-semibold small">
              <i className="bi bi-check2-square fs-6 text-primary"></i>
              <span>{selectedIds.length} customer(s) selected</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-success px-3 d-flex align-items-center gap-1"
                onClick={() => promptBulkStatus('ACTIVE')}
              >
                <i className="bi bi-person-check"></i> Bulk Reactivate
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 d-flex align-items-center gap-1 bg-white"
                onClick={() => promptBulkStatus('SUSPENDED')}
              >
                <i className="bi bi-person-x"></i> Bulk Suspend
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

        {/* Desktop Table */}
        <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden shadow-sm">
          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all customers on page"
                    />
                  </th>
                  <th>Customer</th>
                  <th>City / Zone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : paginatedCustomers.length > 0 ? (
                <tbody>
                  {paginatedCustomers.map((c) => (
                    <tr
                      key={c.id}
                      className={
                        selectedIds.includes(c.id)
                          ? 'table-primary'
                          : c.accountStatus === 'SUSPENDED'
                          ? 'table-danger bg-opacity-10'
                          : ''
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => handleSelectOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{
                              width: 36,
                              height: 36,
                              backgroundColor: 'var(--ardab-teal)',
                              fontSize: '0.85rem',
                            }}
                          >
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{c.name}</div>
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              {c.phone} &bull; {c.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-dark fw-medium">{c.city}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {c.deliveryZone}
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">{c.orderCount} orders</span>
                      </td>
                      <td>
                        <span className="fw-bold text-dark">{formatCurrency(c.totalSpendingEtb)}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge badge-success-soft">{c.trustScore}%</span>
                          {c.verificationStatus === 'VERIFIED' ? (
                            <i
                              className="bi bi-patch-check-fill text-success"
                              title="Verified Customer"
                            ></i>
                          ) : (
                            <i className="bi bi-exclamation-circle text-muted" title="Unverified"></i>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`ardab-badge ${
                            c.accountStatus === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                          }`}
                        >
                          {c.accountStatus}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border shadow-sm"
                            onClick={() => setViewCustomer(c)}
                            title="View Customer Profile"
                          >
                            <i className="bi bi-eye"></i> Details
                          </button>
                          {canSuspend && (
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                c.accountStatus === 'ACTIVE'
                                  ? 'btn-outline-danger'
                                  : 'btn-outline-success'
                              }`}
                              onClick={() => promptToggleSuspend(c)}
                              title={c.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {c.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>

            {!isLoading && paginatedCustomers.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon="bi-people"
                  title="No customers match your search criteria"
                  description="Try adjusting your search terms or resetting the status filters."
                  actionLabel="Reset Filters"
                  onAction={handleResetFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Customer Cards */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {isLoading ? (
            <div className="ardab-card p-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading customer profiles...
            </div>
          ) : paginatedCustomers.length > 0 ? (
            paginatedCustomers.map((c) => (
              <div
                key={c.id}
                className={`ardab-card p-3 ${
                  selectedIds.includes(c.id)
                    ? 'border-primary'
                    : c.accountStatus === 'SUSPENDED'
                    ? 'border-danger border-2'
                    : ''
                }`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => handleSelectOne(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                    <div>
                      <h3 className="h6 fw-bold text-dark mb-0">{c.name}</h3>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {c.phone} &bull; {c.city}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`ardab-badge ${
                      c.accountStatus === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {c.accountStatus}
                  </span>
                </div>

                <div className="p-2 bg-light rounded-3 mb-2 small text-muted">
                  {c.deliveryZone} &mdash; {c.address}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="small text-muted">{c.orderCount} total orders</span>
                  <span className="fw-bold text-dark">{formatCurrency(c.totalSpendingEtb)}</span>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setViewCustomer(c)}
                  >
                    Details
                  </button>
                  {canSuspend && (
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        c.accountStatus === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                      }`}
                      onClick={() => promptToggleSuspend(c)}
                    >
                      {c.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon="bi-people"
              title="No customers match your search criteria"
              description="Try adjusting your search terms or resetting the status filters."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          )}
        </div>

        {/* Server-ready Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredCustomers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />

        {/* Modal: View Customer Details */}
        {viewCustomer && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{viewCustomer.name}</h5>
                    <span className="text-muted small">
                      Customer ID: {viewCustomer.id} &bull; Member since{' '}
                      {formatDate(viewCustomer.registeredAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewCustomer(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="text-muted small d-block">Phone Number</label>
                      <strong className="text-dark">{viewCustomer.phone}</strong>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small d-block">Email Address</label>
                      <strong className="text-dark">{viewCustomer.email}</strong>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small d-block">Operating City</label>
                      <strong className="text-dark">{viewCustomer.city}</strong>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small d-block">Delivery Zone</label>
                      <strong className="text-dark">{viewCustomer.deliveryZone}</strong>
                    </div>
                    <div className="col-12">
                      <label className="text-muted small d-block">Full Delivery Address</label>
                      <strong className="text-dark">{viewCustomer.address}</strong>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block">Total Orders</span>
                        <h4 className="fw-bold text-dark mb-0">{viewCustomer.orderCount}</h4>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block">Lifetime Spend</span>
                        <h4 className="fw-bold text-success mb-0">
                          {formatCurrency(viewCustomer.totalSpendingEtb)}
                        </h4>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block">Trust Score</span>
                        <h4 className="fw-bold text-primary mb-0">{viewCustomer.trustScore}%</h4>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-ardab-outline"
                    onClick={() => setViewCustomer(null)}
                  >
                    Close
                  </button>
                  {canSuspend && (
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        viewCustomer.accountStatus === 'ACTIVE' ? 'btn-danger' : 'btn-success'
                      }`}
                      onClick={() => {
                        promptToggleSuspend(viewCustomer);
                      }}
                    >
                      {viewCustomer.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel || 'Confirm'}
          affectedItemsCount={confirmModal.affectedCount}
          affectedItemNames={confirmModal.affectedNames}
          isIrreversible={confirmModal.isIrreversible}
          isLoading={isConfirming}
          onConfirm={handleConfirmModalAction}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </PageContainer>
    </AdminLayout>
  );
}
