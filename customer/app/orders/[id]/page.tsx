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
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const handleCancelOrder = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError('Please provide a reason with at least 3 characters.');
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await ordersApi.cancelOrder(orderId, cancelReason.trim());
      if (res && res.data) {
        setOrder(res.data);
      }
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return <span className="badge bg-success rounded-pill px-3 py-2">{status}</span>;
      case 'CANCELLED': return <span className="badge bg-danger rounded-pill px-3 py-2">{status}</span>;
      case 'REJECTED': return <span className="badge bg-danger rounded-pill px-3 py-2">{status}</span>;
      case 'IN_TRANSIT': return <span className="badge bg-info rounded-pill px-3 py-2">{status}</span>;
      case 'PROCESSING': return <span className="badge bg-primary rounded-pill px-3 py-2">{status}</span>;
      case 'CONFIRMED': return <span className="badge bg-primary rounded-pill px-3 py-2">{status}</span>;
      case 'READY_FOR_DELIVERY': return <span className="badge bg-info rounded-pill px-3 py-2">{status}</span>;
      default: return <span className="badge bg-warning text-dark rounded-pill px-3 py-2">{status || 'PENDING'}</span>;
    }
  };

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
    { key: 'CONFIRMED', label: 'Confirmed', amLabel: 'ተረጋግጧል' },
    { key: 'PROCESSING', label: 'Processing', amLabel: 'በዝግጅት ላይ' },
    { key: 'IN_TRANSIT', label: 'In Transit', amLabel: 'በመንገድ ላይ' },
    { key: 'DELIVERED', label: 'Delivered', amLabel: 'ደርሷል' },
  ];

  const isCancelled = ['CANCELLED', 'REJECTED', 'FAILED', 'RETURNED'].includes(order.status?.toUpperCase());
  const currentStatusIndex = isCancelled ? -1 : steps.findIndex(
    (s) => s.key === order.status?.toUpperCase() ||
      (s.key === 'IN_TRANSIT' && ['PICKED_UP', 'ASSIGNED_TO_TRIP', 'READY_FOR_DELIVERY'].includes(order.status?.toUpperCase()))
  );

  const canCancel = (order as any).canCancel && !isCancelled;

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
            #{order.orderNumber || order.id?.slice(0, 8)}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 fw-bold mb-1">
            {t('order_details')} #{order.orderNumber || order.id?.slice(0, 8)}
          </h1>
          <small className="text-muted">
            {order.placedAt ? new Date(order.placedAt).toLocaleString() : order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          {getStatusBadge(order.status)}
          {canCancel && (
            <button
              className="btn btn-outline-danger btn-sm rounded-pill px-3"
              onClick={() => { setShowCancelModal(true); setCancelError(null); }}
            >
              <i className="bi bi-x-circle me-1"></i>
              {language === 'am' ? 'ትዕዛዝ ሰርዝ' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Cancelled / Rejected banner */}
      {isCancelled && (
        <div className={`alert rounded-4 border-0 mb-4 ${order.status === 'DELIVERED' ? 'd-none' : 'alert-danger'}`}>
          <i className="bi bi-x-circle-fill me-2"></i>
          <strong>
            {language === 'am' ? 'ይህ ትዕዛዝ ተሰርዟል' : `This order was ${order.status?.toLowerCase()}.`}
          </strong>
          {(order as any).cancelledReason && (
            <div className="mt-1 small">
              {language === 'am' ? 'ምክንያት' : 'Reason'}: {(order as any).cancelledReason}
            </div>
          )}
        </div>
      )}

      {/* Progress Timeline */}
      {!isCancelled && (
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
          <h5 className="fw-bold mb-4">{t('order_timeline')}</h5>
          <div className="position-relative" style={{ paddingBottom: '60px' }}>
            <div className="progress mt-4" style={{ height: '4px' }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{ width: `${Math.max(0, (currentStatusIndex / (steps.length - 1)) * 100)}%` }}
              ></div>
            </div>
            <div className="d-flex justify-content-between position-absolute start-0 w-100" style={{ top: '4px', transform: 'translateY(-50%)' }}>
              {steps.map((step, idx) => {
                const isCompleted = currentStatusIndex >= idx;
                return (
                  <div key={step.key} className="text-center flex-fill">
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 ${isCompleted ? 'bg-success text-white' : 'bg-light text-muted border'}`}
                      style={{ width: '32px', height: '32px' }}
                    >
                      <i className={`bi ${isCompleted ? 'bi-check' : 'bi-circle'} fw-bold`}></i>
                    </div>
                    <div className="small fw-semibold text-dark" style={{ fontSize: '0.7rem' }}>
                      {language === 'am' ? step.amLabel : step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Ordered Items */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="card-header bg-light border-0 py-3 px-4">
              <h5 className="fw-bold mb-0">{t('items')}</h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {order.items?.map((item: any) => {
                  const price = item.unitPriceEtb ?? Number(item.unitPrice ?? 0);
                  const name = item.productName || item.product?.name || 'Product';
                  return (
                    <li key={item.id} className="list-group-item p-3 px-4 d-flex align-items-center gap-3">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={name}
                          className="rounded-3 object-fit-cover"
                          style={{ width: '52px', height: '52px' }}
                        />
                      )}
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark">{name}</div>
                        <small className="text-muted">
                          {item.quantity} × {Number(price).toLocaleString()} ETB
                          {item.unit && <span className="ms-1 badge bg-light text-muted">{item.unit}</span>}
                        </small>
                        {item.sellerName && (
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{item.sellerName}</div>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-success">
                          {(Number(price) * item.quantity).toLocaleString()} ETB
                        </span>
                        {order.status === 'DELIVERED' && item.productId && (
                          <Link
                            href={`/product/${item.productId}#reviews-section`}
                            className="btn btn-outline-success btn-sm rounded-pill px-2 py-1 ms-1 text-nowrap"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <i className="bi bi-star me-1"></i>
                            {language === 'am' ? 'ገምግም' : 'Review'}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Activity Timeline */}
          {(order as any).timeline && (order as any).timeline.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h5 className="fw-bold mb-3">{language === 'am' ? 'የትዕዛዝ ታሪክ' : 'Order History'}</h5>
              <ul className="list-unstyled mb-0">
                {(order as any).timeline.map((event: any, idx: number) => (
                  <li key={idx} className="d-flex gap-3 mb-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="bg-success-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                        <i className="bi bi-circle-fill text-success" style={{ fontSize: '0.5rem' }}></i>
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold text-dark small">{event.description}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h5 className="fw-bold mb-3">{t('delivery_info')}</h5>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('recipient')}:</span>
              <strong>{(order as any).recipientName || (order as any).deliveryAddressSnapshot?.recipientName || 'Customer'}</strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('phone')}:</span>
              <strong>{(order as any).recipientPhone || (order as any).deliveryAddressSnapshot?.phone || '—'}</strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('delivery_address')}:</span>
              <strong>
                {(order as any).deliveryAddressSnapshot?.addressLine || order.deliveryAddress || `${order.city || ''}`}
              </strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">{t('payment_method')}:</span>
              <strong>{order.paymentMethod || 'CASH_ON_DELIVERY'}</strong>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">{language === 'am' ? 'ንዑስ ድምር' : 'Subtotal'}:</span>
              <span className="fw-semibold">{Number((order as any).subtotalEtb ?? (order as any).subtotal ?? 0).toLocaleString()} ETB</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">{language === 'am' ? 'የደረሰኝ ክፍያ' : 'Delivery Fee'}:</span>
              <span className="fw-semibold">{Number((order as any).deliveryFeeEtb ?? (order as any).deliveryFee ?? 0).toLocaleString()} ETB</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-5 mt-2">
              <span>{t('total')}:</span>
              <span className="text-success">{Number((order as any).totalEtb ?? order.totalAmount ?? 0).toLocaleString()} ETB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                  {language === 'am' ? 'ትዕዛዝ ሰርዝ' : 'Cancel Order'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCancelModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  {language === 'am'
                    ? 'ትዕዛዙን ለምን ሰርዘዋል? ምክንያቱን ያስፍሩ።'
                    : 'Please provide a reason for cancelling this order.'}
                </p>
                <textarea
                  className="form-control rounded-3"
                  rows={3}
                  placeholder={language === 'am' ? 'ምክንያት...' : 'Cancellation reason...'}
                  value={cancelReason}
                  onChange={(e) => { setCancelReason(e.target.value); setCancelError(null); }}
                />
                {cancelError && (
                  <div className="text-danger small mt-2">
                    <i className="bi bi-exclamation-circle me-1"></i>{cancelError}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-4"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                >
                  {language === 'am' ? 'ተዉ' : 'Keep Order'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger rounded-pill px-4"
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>{language === 'am' ? 'እየሰረዘ...' : 'Cancelling...'}</>
                  ) : (
                    <><i className="bi bi-x-circle me-1"></i>{language === 'am' ? 'ሰርዝ' : 'Cancel Order'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
