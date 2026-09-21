'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { t, language } = useLanguage();

  if (cart.items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-cart-x display-1 text-muted mb-3"></i>
          <h3 className="fw-bold mb-2">{t('cart_empty')}</h3>
          <p className="text-muted mb-4">{t('cart_empty_subtitle')}</p>
          <div>
            <Link href="/products" className="btn btn-fresh btn-lg rounded-pill px-4">
              <i className="bi bi-basket me-2"></i>
              {t('start_shopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Group items by Seller for multi-seller marketplace clarity
  const itemsBySeller = cart.items.reduce((acc: Record<string, typeof cart.items>, item) => {
    const sellerKey = item.product.seller?.businessName || item.product.seller?.user?.fullName || 'Ardab Central Merchant';
    if (!acc[sellerKey]) {
      acc[sellerKey] = [];
    }
    acc[sellerKey].push(item);
    return acc;
  }, {});

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('shopping_cart')}
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">
          {t('shopping_cart')} ({cart.items.reduce((sum: number, item) => sum + item.quantity, 0)} {t('items')})
        </h1>
        <button onClick={clearCart} className="btn btn-sm btn-outline-danger rounded-pill px-3">
          <i className="bi bi-trash me-1"></i> {t('clear_cart')}
        </button>
      </div>

      <div className="row g-4">
        {/* Cart Items List */}
        <div className="col-lg-8">
          {Object.entries(itemsBySeller).map(([sellerName, sellerItems]: [string, typeof cart.items]) => (
            <div key={sellerName} className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-light border-0 py-3 px-4 d-flex align-items-center">
                <i className="bi bi-shop text-success fs-5 me-2"></i>
                <span className="fw-bold text-dark">{sellerName}</span>
                <span className="badge bg-success bg-opacity-10 text-success rounded-pill ms-2 px-2 py-1 small">
                  {sellerItems.length} {t('items')}
                </span>
              </div>

              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {sellerItems.map((item) => {
                    const imgUrl = item.product.primaryImage?.url || (typeof item.product.images?.[0] === 'string' ? item.product.images[0] : item.product.images?.[0]?.url) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80';
                    const itemPrice = item.product.price ?? item.product.sellingPrice ?? 0;
                    const itemId = item.id || item.productId;
                    return (
                      <li key={itemId} className="list-group-item p-3 p-md-4">
                        <div className="row align-items-center g-3">
                          <div className="col-3 col-md-2">
                            <img
                              src={imgUrl}
                              alt={item.product.name}
                              className="img-fluid rounded-3 object-fit-cover shadow-sm"
                              style={{ width: '80px', height: '80px' }}
                            />
                          </div>
                          <div className="col-9 col-md-4">
                            <Link href={`/product/${item.product.id}`} className="text-dark text-decoration-none fw-bold">
                              {item.product.name}
                            </Link>
                            <div className="text-muted small">
                              {Number(itemPrice).toLocaleString()} ETB / {item.product.unit || 'unit'}
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="input-group input-group-sm" style={{ maxWidth: '120px' }}>
                              <button
                                className="btn btn-outline-secondary"
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <span className="form-control text-center fw-bold bg-white">
                                {item.quantity}
                              </span>
                              <button
                                className="btn btn-outline-secondary"
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
                          </div>
                          <div className="col-4 col-md-2 text-end">
                            <div className="fw-bold text-success fs-6">
                              {(Number(itemPrice) * item.quantity).toLocaleString()} ETB
                            </div>
                          </div>
                          <div className="col-2 col-md-1 text-end">
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="btn btn-link text-danger p-0 fs-5"
                              title={t('remove_item')}
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>


        {/* Order Summary Sidebar */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: '85px' }}>
            <h5 className="fw-bold mb-3">{t('order_summary')}</h5>

            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">{t('subtotal')}</span>
              <span className="fw-semibold">{Number(cart.total).toLocaleString()} ETB</span>
            </div>

            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">{t('estimated_shipping')}</span>
              <span className="text-success fw-semibold">{t('calculated_at_checkout')}</span>
            </div>

            <hr className="my-3" />

            <div className="d-flex justify-content-between mb-4">
              <span className="fw-bold fs-5">{t('total')}</span>
              <span className="fw-bold fs-5 text-success">{Number(cart.total).toLocaleString()} ETB</span>
            </div>

            <Link href="/checkout" className="btn btn-fresh btn-lg w-100 rounded-pill fw-bold shadow-sm mb-3">
              {t('proceed_to_checkout')} <i className="bi bi-arrow-right ms-1"></i>
            </Link>

            <Link href="/products" className="btn btn-outline-secondary w-100 rounded-pill">
              <i className="bi bi-arrow-left me-1"></i> {t('continue_shopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
