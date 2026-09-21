'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ordersApi, Order } from '@/lib/api';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }

    async function loadOrder() {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const res = await ordersApi.getOrderById(orderId);
        if (res && res.data) {
          setOrder(res.data);
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, isAuthenticated, authLoading, router]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-box-seam display-3 text-muted mb-3"></i>
        <h4>{t('order_not_found')}</h4>
        <Link href="/orders" className="btn btn-fresh mt-3">
          {t('back_to_orders')}
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING', label: 'Order Placed', amLabel: 'ትዕዛዝ ተመዝግቧል' },
    { key: 'PROCESSING', label: 'Processing', amLabel: 'በዝግጅት ላይ' },
    { key: 'IN_TRANSIT', label: 'In Transit', amLabel: 'በመንገድ ላይ' },
    { key: 'DELIVERED', label: 'Delivered', amLabel: 'ደርሷል' },
  ];

  const currentStatusIndex = steps.findIndex(
    (s) => s.key === order.status?.toUpperCase() || (s.key === 'IN_TRANSIT' && order.status?.toUpperCase() === 'SHIPPED')
  );

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/orders" className="text-decoration-none text-muted">{t('my_orders')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            #{order.orderNumber || order.id.slice(0, 8)}
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">
            {t('order_details')} #{order.orderNumber || order.id.slice(0, 8)}
          </h1>
          <small className="text-muted">
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
          </small>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-4">{t('order_timeline')}</h5>
        <div className="position-relative m-4">
          <div className="progress" style={{ height: '4px' }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${Math.max(0, (currentStatusIndex / (steps.length - 1)) * 100)}%` }}
            ></div>
          </div>
          <div className="d-flex justify-content-between position-absolute top-0 start-0 w-100 translate-middle-y">
            {steps.map((step, idx) => {
              const isCompleted = currentStatusIndex >= idx;
              return (
                <div key={step.key} className="text-center" style={{ width: '100px', marginLeft: '-50px', marginRight: '-50px' }}>
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 ${isCompleted ? 'bg-success text-white' : 'bg-light text-muted border'}`}
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className={`bi ${isCompleted ? 'bi-check' : 'bi-circle'} fw-bold`}></i>
                  </div>
                  <div className="small fw-semibold text-dark">
                    {language === 'am' ? step.amLabel : step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Ordered Items */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="card-header bg-light border-0 py-3 px-4">
              <h5 className="fw-bold mb-0">{t('items')}</h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {order.items?.map((item) => {
                  const price = item.unitPriceEtb ?? item.unitPrice ?? 0;
                  const name = item.productName || item.product?.name || 'Product';
                  return (
                    <li key={item.id} className="list-group-item p-3 px-4 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold text-dark">{name}</div>
                        <small className="text-muted">
                          {item.quantity} × {Number(price).toLocaleString()} ETB
                        </small>
                      </div>
                      <span className="fw-bold text-success">
                        {(Number(price) * item.quantity).toLocaleString()} ETB
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Order Details & Summary */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h5 className="fw-bold mb-3">{t('delivery_info')}</h5>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('recipient')}:</span>
              <strong>{order.recipientName || 'Customer'}</strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('phone')}:</span>
              <strong>{order.recipientPhone || '—'}</strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('delivery_address')}:</span>
              <strong>{order.deliveryAddress || `${order.shippingCity || order.city}, ${order.streetAddress || ''}`}</strong>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">{t('total')}:</span>
              <strong className="text-success fs-5">{Number(order.totalEtb ?? order.totalAmount ?? 0).toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
