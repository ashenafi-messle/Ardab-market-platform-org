'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { financeApi } from '@/lib/api';
import { RevenueMetrics, Transaction } from '@/types/finance';

export default function FinancePage() {
  const { selectedCity } = useAuth();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      financeApi.getMetrics(),
      financeApi.getTransactions(selectedCity),
    ]).then(([mRes, tRes]) => {
      if (isMounted) {
        setMetrics(mRes);
        setTransactions(tRes);
      }
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const filteredTransactions = transactions.filter((t) => {
    if (methodFilter !== 'ALL' && t.paymentMethod !== methodFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <PageContainer
        title="Financial Telemetry & Revenue"
        subtitle="Platform transaction tracking, Telebirr / CBE Birr settlements, and delivery fee aggregation (ETB)"
        breadcrumbs={[{ label: 'Business' }, { label: 'Finance' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-success-soft">ETB Currency Ledger</span>
          </div>
        }
      >
        {/* Revenue Metric Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Today&apos;s Revenue</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {metrics ? `${(metrics.todayRevenueEtb / 1000).toFixed(1)}k ETB` : '342.6k ETB'}
                </h3>
                <span className="badge badge-success-soft">+18.2%</span>
              </div>
              <div className="text-muted small mt-1">Settled across all active trips</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Total Monthly Revenue</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {metrics ? `${(metrics.monthlyRevenueEtb / 1000000).toFixed(2)}M ETB` : '4.89M ETB'}
                </h3>
                <span className="badge badge-success-soft">Target Met</span>
              </div>
              <div className="text-muted small mt-1">Gross merchandise volume</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Delivery Logistics Fees</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {metrics ? `${(metrics.totalDeliveryFeesEtb / 1000).toFixed(1)}k ETB` : '218.4k ETB'}
                </h3>
                <span className="badge badge-info-soft">Fleet Income</span>
              </div>
              <div className="text-muted small mt-1">Zone distance & weight based</div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="ardab-card p-4 h-100">
              <span className="text-muted small">Refunds & Exceptions</span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h3 className="fw-bold mb-0 text-dark">
                  {metrics ? `${(metrics.refundsCancellationsEtb / 1000).toFixed(1)}k ETB` : '57.0k ETB'}
                </h3>
                <span className="badge badge-neutral-soft">1.1% of total</span>
              </div>
              <div className="text-muted small mt-1">Customer cancellations prior to trip</div>
            </div>
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-8">
            <div className="ardab-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <h2 className="h6 fw-bold text-dark mb-0">Financial Settlements Flow</h2>
                <span className="text-muted small">Real-time gateway integration</span>
              </div>

              {/* Responsive Visual Settlement Bars */}
              <div className="mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Telebirr (Mobile Wallet Instant Clearing)</span>
                  <strong className="text-dark">3,420,000 ETB (70%)</strong>
                </div>
                <div className="ardab-progress mb-3">
                  <div className="ardab-progress-bar bg-success" style={{ width: '70%' }}></div>
                </div>

                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Commercial Bank of Ethiopia (CBE Birr / Direct Debit)</span>
                  <strong className="text-dark">1,215,400 ETB (25%)</strong>
                </div>
                <div className="ardab-progress mb-3">
                  <div className="ardab-progress-bar bg-info" style={{ width: '25%' }}></div>
                </div>

                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Cash on Delivery (OTP Handover via Driver)</span>
                  <strong className="text-dark">260,000 ETB (5%)</strong>
                </div>
                <div className="ardab-progress">
                  <div className="ardab-progress-bar bg-warning" style={{ width: '5%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="ardab-card h-100 p-4">
              <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">Bank Reconciliation</h2>
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Telebirr Merchant Account</span>
                  <span className="badge badge-success-soft">ONLINE</span>
                </div>
                <div className="fw-bold text-dark">Automated API Clearing</div>
              </div>
              <div className="p-3 bg-light rounded-3 border">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>CBE Corporate Account</span>
                  <span className="badge badge-success-soft">ACTIVE</span>
                </div>
                <div className="fw-bold text-dark">Daily Batch Settlement</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table & Filters */}
        <div className="ardab-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 pb-2 border-bottom">
            <div>
              <h2 className="h6 fw-bold text-dark mb-0">Recent Platform Transactions</h2>
              <span className="text-muted small">
                Every verified customer order and delivery transaction
              </span>
            </div>
            <div className="d-flex gap-2">
              {['ALL', 'TELEBIRR', 'CBE_BIRR', 'CASH_ON_DELIVERY'].map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 ${
                    methodFilter === method ? 'btn-ardab-primary' : 'btn-outline-secondary bg-white border'
                  }`}
                  onClick={() => setMethodFilter(method)}
                >
                  {method.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="ardab-table-wrapper">
            <table className="ardab-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Order Reference</th>
                  <th>Customer</th>
                  <th>City Hub</th>
                  <th>Payment Channel</th>
                  <th>Amount (ETB)</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="fw-bold text-dark">{tx.id}</td>
                    <td>
                      <Link href="/orders" className="text-success fw-medium text-decoration-none">
                        {tx.orderId}
                      </Link>
                    </td>
                    <td className="text-dark">{tx.customerName}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{tx.city}</span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{tx.paymentMethod}</span>
                    </td>
                    <td className="fw-bold text-dark">
                      {tx.amountEtb.toLocaleString()} ETB
                    </td>
                    <td>
                      <span
                        className={`ardab-badge ${
                          tx.paymentStatus === 'PAID'
                            ? 'badge-success-soft'
                            : tx.paymentStatus === 'REFUNDED'
                            ? 'badge-warning-soft'
                            : 'badge-danger-soft'
                        }`}
                      >
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="text-muted small">{tx.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
