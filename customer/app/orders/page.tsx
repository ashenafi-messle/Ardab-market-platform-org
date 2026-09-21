'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ordersApi, Order } from '@/lib/api';

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }

    async function loadOrders() {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const res = await ordersApi.getMyOrders();
        if (res && res.data) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated, authLoading, router]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
        return <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1">{status}</span>;
      case 'CANCELLED':
        return <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-1">{status}</span>;
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return <span className="badge bg-info-subtle text-info rounded-pill px-3 py-1">{status}</span>;
      case 'PROCESSING':
      case 'CONFIRMED':
        return <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">{status}</span>;
      default:
        return <span className="badge bg-warning-subtle text-warning rounded-pill px-3 py-1">{status || 'PENDING'}</span>;
    }
  };

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('my_orders')}
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">{t('my_orders')}</h1>
          <small className="text-muted">{language === 'am' ? 'የትዕዛዞችዎን ሂደትና ታሪክ ይከታተሉ' : 'Track and manage your recent orders'}</small>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">{t('loading')}</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div key={order.id} className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="card-header bg-light border-0 py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="fw-bold text-dark me-2">#{order.orderNumber || order.id.slice(0, 8)}</span>
                  <small className="text-muted">
                    {order.placedAt || order.createdAt ? new Date(order.placedAt || order.createdAt || '').toLocaleDateString() : ''}
                  </small>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              <div className="card-body p-4">
                <div className="row align-items-center g-3">
                  <div className="col-md-5">
                    <div className="text-muted small mb-1">{t('delivery_to')}:</div>
                    <div className="fw-bold text-dark">{order.recipientName || 'Customer'}</div>
                    <div className="text-muted small">{order.deliveryAddress || `${order.shippingCity || order.city}, ${order.streetAddress || ''}`}</div>
                  </div>

                  <div className="col-md-3">
                    <div className="text-muted small mb-1">{t('items')}:</div>
                    <div className="fw-bold text-dark">{order.items?.length || 0} {t('products')}</div>
                  </div>

                  <div className="col-md-2">
                    <div className="text-muted small mb-1">{t('total')}:</div>
                    <div className="fw-bold text-success fs-5">
                      {Number(order.totalEtb ?? order.totalAmount ?? 0).toLocaleString()} ETB
                    </div>
                  </div>


                  <div className="col-md-2 text-md-end">
                    <Link href={`/orders/${order.id}`} className="btn btn-outline-success btn-sm rounded-pill px-3">
                      {t('track_order')} <i className="bi bi-chevron-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 text-center py-5">
          <i className="bi bi-box2 display-3 text-muted mb-3"></i>
          <h5>{t('no_orders_yet')}</h5>
          <p className="text-muted small mb-4">{t('no_orders_description')}</p>
          <div>
            <Link href="/products" className="btn btn-fresh rounded-pill px-4">
              {t('start_shopping')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
