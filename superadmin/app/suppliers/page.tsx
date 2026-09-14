'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { suppliersApi } from '@/lib/api';
import { Supplier } from '@/types/supplier';

const SUPPLIER_CATEGORIES = [
  'Grains & Teff',
  'Edible Oils & Seeds',
  'Coffee & Spices',
  'Honey & Natural Sweeteners',
  'Pulses & Legumes',
  'Fresh Dairy & Butter',
];

export default function SuppliersPage() {
  const { selectedCity } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  // Form state for registering new supplier
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '+251 9',
    email: '',
    city: 'Gondar' as 'Gondar' | 'Bahir Dar' | 'Addis Ababa',
    category: 'Grains & Teff',
    tinNumber: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PENDING' | 'SUSPENDED',
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '',
  });

  const refreshSuppliers = async () => {
    try {
      const res = await suppliersApi.getAll(selectedCity);
      setSuppliers(res);
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    suppliersApi.getAll(selectedCity).then((res) => {
      if (isMounted) setSuppliers(res);
    }).catch((e) => {
      console.error('Failed to load suppliers:', e);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const handleOpenRegister = () => {
    setFormData({
      name: '',
      companyName: '',
      phone: '+251 9',
      email: '',
      city: selectedCity === 'All Cities' ? 'Gondar' : (selectedCity as 'Gondar' | 'Bahir Dar' | 'Addis Ababa'),
      category: 'Grains & Teff',
      tinNumber: '',
      address: '',
      status: 'ACTIVE',
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '',
    });
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await suppliersApi.register({
      name: formData.name,
      companyName: formData.companyName,
      phone: formData.phone,
      email: formData.email,
      city: formData.city,
      category: formData.category,
      tinNumber: formData.tinNumber,
      address: formData.address,
      status: formData.status,
      bankAccount: formData.accountNumber ? {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
      } : undefined,
    });
    setIsRegisterModalOpen(false);
    refreshSuppliers();
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const updated = await suppliersApi.toggleStatus(id);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (viewSupplier && viewSupplier.id === id) {
        setViewSupplier(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tinNumber.includes(searchTerm) ||
      s.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <PageContainer
        title="Supplier Management & Registration"
        subtitle="Register and onboard agricultural producers, cooperatives, and commodity merchants across Ethiopia"
        breadcrumbs={[{ label: 'Marketplace' }, { label: 'Suppliers' }]}
        actions={
          <button
            type="button"
            className="btn btn-ardab-primary d-flex align-items-center gap-2"
            onClick={handleOpenRegister}
          >
            <i className="bi bi-building-add"></i>
            <span>Register New Supplier</span>
          </button>
        }
      >
        {/* KPI Metric Overview */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Total Registered Suppliers</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">{suppliers.length}</h3>
                <span className="badge badge-success-soft">Onboarded</span>
              </div>
              <div className="text-muted small mt-1">
                Supplying verified regional commodities
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Active Commercial Suppliers</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-success">
                  {suppliers.filter((s) => s.status === 'ACTIVE').length}
                </h3>
                <span className="badge badge-success-soft">Active Status</span>
              </div>
              <div className="text-muted small mt-1">
                Verified with Ethiopian TIN & Trade License
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="ardab-card p-3 h-100">
              <span className="text-muted small">Total Supplied Products</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {suppliers.reduce((sum, s) => sum + s.productCount, 0)} Items
                </h3>
                <span className="badge badge-info-soft">In Marketplace</span>
              </div>
              <div className="text-muted small mt-1">
                Linked directly to product sellers
              </div>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="ardab-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-7">
              <div className="position-relative">
                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by company name, contact person, TIN, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-5 d-flex gap-2 justify-content-md-end">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
                style={{ maxWidth: '200px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Suppliers Table */}
        <div className="ardab-card p-0 d-none d-lg-block mb-4 overflow-hidden">
          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th>Supplier / Enterprise</th>
                  <th>Contact Person</th>
                  <th>City Hub</th>
                  <th>Commodity Category</th>
                  <th>TIN Number</th>
                  <th>Supplied Products</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="ardab-icon-box icon-box-green flex-shrink-0"
                          style={{ width: 38, height: 38, fontSize: '1.1rem' }}
                        >
                          <i className="bi bi-building"></i>
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{sup.companyName}</div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            ID: {sup.id} &bull; Reg: {sup.registeredAt}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-dark fw-medium">{sup.name}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {sup.phone}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{sup.city}</span>
                    </td>
                    <td>
                      <span className="text-dark small fw-medium">{sup.category}</span>
                    </td>
                    <td>
                      <code>{sup.tinNumber}</code>
                    </td>
                    <td>
                      <span className="badge badge-info-soft">{sup.productCount} items</span>
                    </td>
                    <td>
                      <span
                        className={`ardab-badge ${
                          sup.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                        }`}
                      >
                        {sup.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="View Details"
                          onClick={() => setViewSupplier(sup)}
                        >
                          <i className="bi bi-eye"></i> Details
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            sup.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                          }`}
                          title={sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          onClick={() => handleToggleStatus(sup.id)}
                        >
                          {sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Supplier Cards */}
        <div className="d-lg-none d-flex flex-column gap-3 mb-4">
          {filteredSuppliers.map((sup) => (
            <div key={sup.id} className="ardab-card p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h3 className="h6 fw-bold text-dark mb-0">{sup.companyName}</h3>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                    {sup.name} &bull; {sup.city}
                  </div>
                </div>
                <span
                  className={`ardab-badge ${
                    sup.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                  }`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {sup.status}
                </span>
              </div>

              <div className="p-2 bg-light rounded-3 mb-2 small text-muted">
                <div>Category: <strong className="text-dark">{sup.category}</strong></div>
                <div>TIN: <code>{sup.tinNumber}</code> &bull; Phone: {sup.phone}</div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">Products Supplied:</span>
                <span className="badge badge-info-soft">{sup.productCount} Items</span>
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setViewSupplier(sup)}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    sup.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                  }`}
                  onClick={() => handleToggleStatus(sup.id)}
                >
                  {sup.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Register New Supplier */}
        {isRegisterModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="ardab-icon-box icon-box-green"
                      style={{ width: 36, height: 36, fontSize: '1.1rem' }}
                    >
                      <i className="bi bi-building-add"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        Register New Platform Supplier
                      </h5>
                      <span className="text-muted small">
                        Onboard an authorized seller / producer into Ardab Market
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsRegisterModalOpen(false)}
                  ></button>
                </div>

                <form onSubmit={handleRegisterSubmit}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label">Registered Business / Enterprise Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Gondar Union Farm Cooperative"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        />
                      </div>

                      <div className="col-md-5">
                        <label className="form-label">Contact Person / Manager Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Girma Wube"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="+251 91 123 4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="supplier@example.et"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Operational City Hub *</label>
                        <select
                          className="form-select"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              city: e.target.value as 'Gondar' | 'Bahir Dar' | 'Addis Ababa',
                            })
                          }
                        >
                          <option value="Gondar">Gondar</option>
                          <option value="Bahir Dar">Bahir Dar</option>
                          <option value="Addis Ababa">Addis Ababa</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Commodity Category *</label>
                        <select
                          className="form-select"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                          {SUPPLIER_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">TIN Number (Tax ID) *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. 0048192019"
                          value={formData.tinNumber}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Business / Warehouse Address *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="e.g. Arada Commercial Zone, Warehouse #12, Gondar"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>

                      {/* Banking Details */}
                      <div className="col-md-6">
                        <label className="form-label">Settlement Bank Name</label>
                        <select
                          className="form-select"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        >
                          <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia (CBE)</option>
                          <option value="Dashen Bank">Dashen Bank</option>
                          <option value="Awash Bank">Awash Bank</option>
                          <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Bank Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 1000293848123"
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline"
                      onClick={() => setIsRegisterModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary">
                      Register & Activate Supplier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Supplier Details */}
        {viewSupplier && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark">{viewSupplier.companyName}</h5>
                    <span className="text-muted small">Registered Platform Supplier</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewSupplier(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <span className="text-muted small">Contact Person</span>
                      <div className="fw-semibold text-dark">{viewSupplier.name}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Phone Number</span>
                      <div className="fw-semibold text-dark">{viewSupplier.phone}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">City Hub</span>
                      <div className="fw-semibold text-dark">{viewSupplier.city}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Commodity Category</span>
                      <div className="fw-semibold text-dark">{viewSupplier.category}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">TIN (Tax ID)</span>
                      <div><code>{viewSupplier.tinNumber}</code></div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Account Status</span>
                      <div>
                        <span className="badge badge-success-soft">{viewSupplier.status}</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <span className="text-muted small">Physical Address</span>
                      <div className="text-dark small">{viewSupplier.address}</div>
                    </div>
                    {viewSupplier.bankAccount && (
                      <div className="col-12 p-3 bg-light rounded-3 border">
                        <span className="text-muted small d-block mb-1">Settlement Bank Account</span>
                        <div className="fw-bold text-dark small">{viewSupplier.bankAccount.bankName}</div>
                        <div className="text-muted small">Account: {viewSupplier.bankAccount.accountNumber}</div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <div>
                      <span className="text-muted small">Supplied Commodities: </span>
                      <strong className="text-dark">{viewSupplier.productCount} Products</strong>
                    </div>
                    <Link
                      href="/products"
                      className="btn btn-sm btn-ardab-light"
                      onClick={() => setViewSupplier(null)}
                    >
                      View Products by this Supplier &rarr;
                    </Link>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-ardab-outline btn-sm"
                    onClick={() => setViewSupplier(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      viewSupplier.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                    }`}
                    onClick={() => handleToggleStatus(viewSupplier.id)}
                  >
                    {viewSupplier.status === 'ACTIVE' ? 'Suspend Supplier' : 'Activate Supplier'}
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
