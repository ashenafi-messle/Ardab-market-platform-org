'use client';

import React from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();

  if (wishlist.items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-heartbreak display-2 text-muted mb-3"></i>
          <h4>{t('wishlist_empty')}</h4>
          <p className="text-muted mb-4">{t('wishlist_empty_subtitle')}</p>
          <Link href="/products" className="btn btn-fresh rounded-pill px-4">
            {t('discover_products')}
          </Link>
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
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('wishlist')}
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">
          {t('wishlist')} ({wishlist.items.length})
        </h1>
        <button onClick={clearWishlist} className="btn btn-sm btn-outline-danger rounded-pill px-3">
          <i className="bi bi-trash me-1"></i> {t('clear_wishlist')}
        </button>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {wishlist.items.map((prod: any) => {
          const imgUrl = prod.primaryImage?.url || (typeof prod.images?.[0] === 'string' ? prod.images[0] : prod.images?.[0]?.url) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
          const prodPrice = prod.price ?? prod.sellingPrice ?? 0;
          return (
            <div key={prod.id} className="col">
              <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="position-relative">
                  <img
                    src={imgUrl}
                    alt={prod.name}
                    className="w-100 object-fit-cover"
                    style={{ height: '200px' }}
                  />

                  <button
                    onClick={() => removeFromWishlist(prod.id)}
                    className="btn btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm"
                    title={t('remove_item')}
                  >
                    <i className="bi bi-trash text-danger"></i>
                  </button>
                </div>

                <div className="card-body p-4 d-flex flex-column">
                  <h5 className="fw-bold mb-1">
                    <Link href={`/product/${prod.id}`} className="text-dark text-decoration-none">
                      {prod.name}
                    </Link>
                  </h5>
                  <div className="text-success fw-bold fs-5 mb-3">
                    {Number(prodPrice).toLocaleString()} ETB
                  </div>


                  <div className="mt-auto">
                    <button
                      onClick={() => {
                        addToCart(prod, 1);
                        removeFromWishlist(prod.id);
                      }}
                      className="btn btn-fresh w-100 rounded-pill fw-bold"
                    >
                      <i className="bi bi-cart-plus me-1"></i> {t('move_to_cart')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
