'use client';

import React from 'react';
import Link from 'next/link';
import { CustomerProduct } from '@/types/marketplace';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getOptimizedImageUrl } from '@/lib/images';

interface ProductCardProps {
  product: CustomerProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const primaryImage = getOptimizedImageUrl(product.primaryImage?.url || product.images?.[0]?.url, { width: 400 });

  const isWishlisted = isInWishlist(product.id);
  const inStock = product.status === 'ACTIVE';

  return (
    <div className="fresh-card h-100 d-flex flex-column">
      {/* Top Image Box with Badges & Wishlist Action */}
      <div className="product-image-container position-relative">
        <Link href={`/product/${product.id}`} className="d-block w-100 h-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = '/placeholder.png';
              }
            }}
          />
        </Link>

        {/* Status Badge */}
        <div className="position-absolute top-0 start-0 m-2 pointer-events-none" style={{ zIndex: 2 }}>
          {inStock ? (
            <span className="badge bg-success bg-opacity-90 shadow-sm" style={{ fontSize: '0.7rem' }}>
              {t('common.status.available', 'In Stock')}
            </span>
          ) : (
            <span className="badge bg-secondary shadow-sm" style={{ fontSize: '0.7rem' }}>
              {t('common.status.outOfStock', 'Out of Stock')}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className="btn btn-sm btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm d-flex align-items-center justify-content-center"
          style={{ width: '34px', height: '34px', zIndex: 3 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          aria-label={t('common.nav.wishlist', 'Wishlist')}
        >
          <i className={`bi ${isWishlisted ? 'bi-heart-fill text-danger' : 'bi-heart text-muted'}`}></i>
        </button>
      </div>

      {/* Card Body */}
      <div className="p-3 d-flex flex-column flex-grow-1">
        {/* Category & Item Code */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="text-muted text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
            {product.category?.name || 'Commodity'}
          </span>
          <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
            {product.itemCode}
          </span>
        </div>

        {/* Product Title */}
        <h6 className="fw-bold mb-1 text-truncate-2" style={{ minHeight: '2.4rem', fontSize: '0.95rem' }}>
          <Link href={`/product/${product.id}`} className="text-dark text-decoration-none">
            {product.name}
          </Link>
        </h6>

        {product.rating?.count ? (
          <div className="d-flex align-items-center gap-1 mb-2" aria-label={`${product.rating.average?.toFixed(1)} out of 5 from ${product.rating.count} reviews`}>
            <i className="bi bi-star-fill text-warning"></i>
            <span className="fw-semibold small">{product.rating.average?.toFixed(1)}</span>
            <span className="text-muted small">({product.rating.count})</span>
          </div>
        ) : (
          <div className="text-muted small mb-2">{t('marketplace.card.noRatings')}</div>
        )}

        {/* Seller Info */}
        <div className="d-flex align-items-center gap-1 text-muted small mb-2">
          <i className="bi bi-shop text-success"></i>
          <span className="text-truncate" style={{ maxWidth: '140px', fontSize: '0.8rem' }}>
            {product.seller?.companyName || product.seller?.name || 'Ardab Central Hub'}
          </span>
        </div>

        {/* City Availability Badge */}
        <div className="mb-3">
          <span className="badge bg-light text-success border border-success border-opacity-25" style={{ fontSize: '0.7rem' }}>
            <i className="bi bi-geo-alt-fill me-1"></i>
            {product.cityAvailability?.includes('All Cities')
              ? t('marketplace.card.allCities', 'All Cities')
              : product.cityAvailability?.[0] || 'Gondar Hub'}
          </span>
        </div>

        {/* Bottom Price & Add to Cart */}
        <div className="mt-auto d-flex align-items-center justify-content-between pt-2 border-top">
          <div>
            <span className="price-display">
              {Number(product.sellingPrice).toLocaleString()}
            </span>
            <span className="price-unit ms-1">{t('common.currency', 'ETB')}</span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-fresh-primary d-flex align-items-center gap-1"
            disabled={!inStock}
            onClick={() => addToCart(product, 1)}
          >
            <i className="bi bi-cart-plus"></i>
            <span className="d-none d-sm-inline">{t('common.actions.addToCart', 'Add')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
