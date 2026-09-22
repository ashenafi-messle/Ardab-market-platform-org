'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ordersApi, catalogApi, PaymentMethod } from '@/lib/api';

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { customer, isAuthenticated, loading: authLoading } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('Addis Ababa');
  const [shippingZone, setShippingZone] = useState('Bole');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Default Ethiopian operational cities
  const cities = ['Addis Ababa', 'Hawassa', 'Bahir Dar', 'Adama', 'Dire Dawa', 'Mekelle', 'Gondar'];

  useEffect(() => {
    if (customer) {
      setRecipientName(customer.fullName || customer.user?.fullName || '');
      setRecipientPhone(customer.phone || customer.user?.phone || '');
      setShippingCity(customer.city || 'Addis Ababa');
    }
  }, [customer]);

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const res = await catalogApi.getPaymentMethods();
        if (res && res.data && res.data.length > 0) {
          setPaymentMethods(res.data);
          setSelectedMethodId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load payment methods:', err);
      }
    }
    loadPaymentMethods();
  }, []);

  if (cart.items.length === 0 && !placedOrder) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-cart-x display-2 text-muted mb-3"></i>
          <h4>{t('cart_empty')}</h4>
          <p className="text-muted mb-4">{t('cart_empty_subtitle')}</p>
          <Link href="/products" className="btn btn-fresh rounded-pill px-4">
            {t('start_shopping')}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError(t('fill_required_fields'));
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      setError(t('cart_empty'));
      return;
    }

    setSubmitting(true);
    setError(null);

    const chosenPm = paymentMethods.find((pm) => pm.id === selectedMethodId);
    const paymentMethod = chosenPm ? chosenPm.name : 'CASH_ON_DELIVERY';
    const idempotencyKey = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const payload = {
      items: cart.items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 1,
      })),
      deliveryAddress: {
        recipientName: recipientName.trim(),
        phone: recipientPhone.trim(),
        city: shippingCity.trim(),
        deliveryZone: shippingZone ? shippingZone.trim() : undefined,
        addressLine: shippingZone ? `${shippingCity.trim()}, ${shippingZone.trim()}` : shippingCity.trim(),
      },
      paymentMethod,
      customerNote: '',
      idempotencyKey,
    };

    try {
      const res = await ordersApi.checkout(payload);
      if (res) {
        setPlacedOrder(res);
        clearCart();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit order. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Order Success Screen
  if (placedOrder) {
    return (
      <div className="container py-5">
        <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto text-center" style={{ maxWidth: '600px' }}>
          <div className="text-success mb-3">
            <i className="bi bi-check-circle-fill display-1"></i>
          </div>
          <h2 className="fw-bold text-success mb-2">{t('order_placed_successfully')}</h2>
          <p className="text-muted mb-3">
            {language === 'am'
              ? `የትዕዛዝ ቁጥርዎ #${placedOrder.orderNumber || placedOrder.id?.slice(0, 8)} ነው። ወደ ስልክዎ ማረጋገጫ ተልኳል።`
              : `Your order #${placedOrder.orderNumber || placedOrder.id?.slice(0, 8)} has been placed successfully.`}
          </p>

          <div className="bg-light rounded-3 p-3 mb-4 text-start small">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">{t('recipient')}:</span>
              <strong>{placedOrder.deliveryAddressSnapshot?.recipientName || placedOrder.recipientName || recipientName}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">{t('city')}:</span>
              <strong>{placedOrder.city || shippingCity}{shippingZone ? ` (${shippingZone})` : ''}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">{t('total_amount')}:</span>
              <strong className="text-success">{Number(placedOrder.totalEtb || placedOrder.totalAmount || cart.total).toLocaleString()} ETB</strong>
            </div>
          </div>

          <div className="d-flex gap-3 justify-content-center">
            <Link href="/orders" className="btn btn-fresh rounded-pill px-4">
              <i className="bi bi-box-seam me-2"></i> {t('view_my_orders')}
            </Link>
            <Link href="/products" className="btn btn-outline-secondary rounded-pill px-4">
              {t('continue_shopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/cart" className="text-decoration-none text-muted">{t('shopping_cart')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('checkout')}
          </li>
        </ol>
      </nav>

      <h1 className="h3 fw-bold mb-4">{t('checkout_title')}</h1>

      {!isAuthenticated && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between mb-4 rounded-4" role="alert">
          <div>
            <i className="bi bi-info-circle me-2"></i>
            {t('login_required_checkout')}
          </div>
          <Link href="/login?redirect=/checkout" className="btn btn-warning btn-sm fw-bold rounded-pill px-3">
            {t('login')}
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="row g-4">
          {/* Left Form: Delivery Address & Details */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-geo-alt text-success me-2"></i>
                {t('shipping_address')}
              </h5>

              {error && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="recipient-name">
                    {t('recipient_name')} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="recipient-name"
                    required
                    className="form-control"
                    placeholder="e.g. Abebe Kebede"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="recipient-phone">
                    {t('recipient_phone')} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    id="recipient-phone"
                    required
                    className="form-control"
                    placeholder="0911223344"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="shipping-city">
                    {t('city')} <span className="text-danger">*</span>
                  </label>
                  <select
                    id="shipping-city"
                    className="form-select"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    required
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="shipping-zone">
                    {t('sub_city_zone')}
                  </label>
                  <input
                    type="text"
                    id="shipping-zone"
                    className="form-control"
                    placeholder="e.g. Bole, Kirkos, Hawassa Tabor"
                    value={shippingZone}
                    onChange={(e) => setShippingZone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="card border-0 shadow-sm rounded-4 p-4">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-credit-card text-success me-2"></i>
                {t('payment_method')}
              </h5>

              <div className="row g-3">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <div key={pm.id} className="col-md-6">
                      <div
                        className={`card p-3 rounded-4 cursor-pointer border ${selectedMethodId === pm.id ? 'border-success bg-success bg-opacity-10' : 'border-light-subtle'}`}
                        onClick={() => setSelectedMethodId(pm.id)}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentMethodRadio"
                            id={`pm-${pm.id}`}
                            checked={selectedMethodId === pm.id}
                            onChange={() => setSelectedMethodId(pm.id)}
                          />
                          <label className="form-check-label fw-bold text-dark cursor-pointer ms-2" htmlFor={`pm-${pm.id}`}>
                            {pm.name}
                          </label>
                        </div>
                        {pm.description && (
                          <small className="text-muted ms-4 d-block mt-1">{pm.description}</small>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="col-md-6">
                      <div className="card p-3 rounded-4 border-success bg-success bg-opacity-10">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" checked readOnly id="pm-telebirr" />
                          <label className="form-check-label fw-bold ms-2" htmlFor="pm-telebirr">
                            Telebirr / CBE Birr
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card p-3 rounded-4 border">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" id="pm-cod" />
                          <label className="form-check-label fw-bold ms-2" htmlFor="pm-cod">
                            Cash on Delivery
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Summary */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: '85px' }}>
              <h5 className="fw-bold mb-3">{t('order_summary')}</h5>

              <div className="mb-3 max-h-300 overflow-y-auto">
                {cart.items.map((item: any) => {
                  const itemPrice = item.product.price ?? item.product.sellingPrice ?? 0;
                  return (
                    <div key={item.productId || item.id} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                      <div className="me-2">
                        <div className="fw-semibold text-dark small">{item.product.name}</div>
                        <small className="text-muted">{item.quantity} × {Number(itemPrice).toLocaleString()} ETB</small>
                      </div>
                      <span className="fw-bold small">
                        {(Number(itemPrice) * item.quantity).toLocaleString()} ETB
                      </span>
                    </div>
                  );
                })}
              </div>


              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">{t('subtotal')}</span>
                <span className="fw-semibold">{Number(cart.total).toLocaleString()} ETB</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">{t('delivery_fee')}</span>
                <span className="fw-semibold text-success">{t('free_or_standard')}</span>
              </div>

              <hr className="my-3" />

              <div className="d-flex justify-content-between mb-4">
                <span className="fw-bold fs-5">{t('total')}</span>
                <span className="fw-bold fs-5 text-success">{Number(cart.total).toLocaleString()} ETB</span>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.items.length === 0}
                className="btn btn-fresh btn-lg w-100 rounded-pill fw-bold shadow-sm"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {t('placing_order')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-bag-check me-2"></i>
                    {t('confirm_order')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
