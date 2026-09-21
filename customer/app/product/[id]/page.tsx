'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { catalogApi, Product, Review } from '@/lib/api';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const { t, language } = useLanguage();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useCustomerAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [addedSuccess, setAddedSuccess] = useState(false);

  // New Review Modal State
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const [prodRes, revRes] = await Promise.all([
          catalogApi.getProductById(productId),
          catalogApi.getProductReviews(productId),
        ]);

        if (prodRes && prodRes.data) {
          setProduct(prodRes.data);
          // Preselect default attributes if available
          if (prodRes.data.attributes && typeof prodRes.data.attributes === 'object') {
            setSelectedAttributes(prodRes.data.attributes);
          }
        }

        if (revRes && revRes.data) {
          setReviews(revRes.data);
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, selectedAttributes);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity, selectedAttributes);
    router.push('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?redirect=/product/${productId}`);
      return;
    }

    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await catalogApi.createReview({
        productId,
        rating,
        comment,
      });

      if (res && res.data) {
        setReviews([res.data, ...reviews]);
        setComment('');
        setRating(5);
        setReviewMessage(t('review_submitted_success'));
      }
    } catch (err: any) {
      setReviewMessage(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Gallery & Lightbox hooks (must be unconditionally declared before any early returns)
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Keyboard navigation for full-screen lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => {
          const count = (product?.images && product.images.length > 0) ? product.images.length : 1;
          return (prev + 1) % count;
        });
      }
      if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => {
          const count = (product?.images && product.images.length > 0) ? product.images.length : 1;
          return (prev - 1 + count) % count;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, product?.images]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success my-5" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-exclamation-circle display-3 text-muted mb-3"></i>
        <h3>{t('product_not_found')}</h3>
        <Link href="/products" className="btn btn-fresh mt-3">
          {t('back_to_products')}
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const displayPrice = product.price ?? product.sellingPrice;
  const isAvailable = product.status === 'ACTIVE' || (product.stock !== undefined && product.stock > 0);

  // Robust gallery image resolution with Cloudinary and professional fallback
  const rawImages = (product.images && product.images.length > 0)
    ? product.images.map((img: any) => (typeof img === 'string' ? img : img.url)).filter(Boolean)
    : [product.primaryImage?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'];

  return (
    <div className="container py-4">
      {/* Dynamic Multi-Level Category Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/products" className="text-decoration-none text-muted">{t('products')}</Link>
          </li>
          {product.categoryPath && product.categoryPath.length > 0 ? (
            product.categoryPath.map((ancestor) => (
              <li key={ancestor.id} className="breadcrumb-item">
                <Link href={`/category/${ancestor.id}`} className="text-decoration-none text-muted">
                  {ancestor.name}
                </Link>
              </li>
            ))
          ) : product.category ? (
            <li className="breadcrumb-item">
              <Link href={`/category/${product.category.id}`} className="text-decoration-none text-muted">
                {product.category.name}
              </Link>
            </li>
          ) : null}
          <li className="breadcrumb-item active text-success fw-semibold text-truncate" style={{ maxWidth: '280px' }} aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main Product Section: Two-Column Responsive Layout */}
      <div className="row g-4 mb-5">
        {/* Left: Professional Product Image Gallery */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            {/* Main Stage Image with Zoom Lightbox Trigger */}
            <div
              className="position-relative rounded-4 overflow-hidden mb-3 bg-light d-flex align-items-center justify-content-center cursor-pointer product-main-stage"
              style={{ minHeight: '380px', maxHeight: '480px' }}
              onClick={() => setLightboxOpen(true)}
              title={language === 'am' ? 'ምስሉን በትልቅ ለማየት ይጫኑ' : 'Click to view full-screen'}
            >
              <img
                src={rawImages[activeImageIndex]}
                alt={`${product.name} - view ${activeImageIndex + 1}`}
                className="img-fluid object-fit-contain w-100 transition-all"
                style={{ maxHeight: '460px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
                }}
              />

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm d-flex align-items-center justify-content-center"
                style={{ width: '44px', height: '44px', zIndex: 5 }}
                title="Add to Wishlist"
              >
                <i className={`bi ${inWishlist ? 'bi-heart-fill text-danger' : 'bi-heart'} fs-5`}></i>
              </button>

              {/* Fullscreen icon indicator */}
              <div className="position-absolute bottom-0 end-0 m-3 badge bg-dark bg-opacity-75 rounded-pill px-3 py-2 d-flex align-items-center gap-1 shadow-sm">
                <i className="bi bi-arrows-fullscreen"></i>
                <span className="small">{activeImageIndex + 1} / {rawImages.length}</span>
              </div>

              {/* Prev / Next Stage Arrows if multiple images */}
              {rawImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="btn btn-light btn-sm rounded-circle position-absolute start-0 top-50 translate-middle-y ms-2 shadow-sm d-flex align-items-center justify-content-center"
                    style={{ width: '38px', height: '38px', zIndex: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev - 1 + rawImages.length) % rawImages.length);
                    }}
                    aria-label="Previous Image"
                  >
                    <i className="bi bi-chevron-left fs-6"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-light btn-sm rounded-circle position-absolute end-0 top-50 translate-middle-y me-2 shadow-sm d-flex align-items-center justify-content-center"
                    style={{ width: '38px', height: '38px', zIndex: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev + 1) % rawImages.length);
                    }}
                    aria-label="Next Image"
                  >
                    <i className="bi bi-chevron-right fs-6"></i>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation Ribbon */}
            {rawImages.length > 1 && (
              <div className="d-flex gap-2 overflow-x-auto pb-2 pt-1 thumbnail-ribbon">
                {rawImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`btn p-0 rounded-3 overflow-hidden border-2 flex-shrink-0 transition-all ${activeImageIndex === idx ? 'border-success shadow-sm' : 'border-light opacity-75'}`}
                    style={{ width: '72px', height: '72px', outline: 'none' }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-100 h-100 object-fit-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Details, Specifications & Purchase Form */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100 d-flex flex-column">
            {/* Category Pill & Item Code */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              {product.category && (
                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-semibold">
                  {product.category.name}
                </span>
              )}
              <span className="badge bg-light text-muted border">
                SKU: {product.itemCode}
              </span>
            </div>

            <h1 className="h2 fw-bold text-dark mb-2">{product.name}</h1>

            {/* Seller / Merchant Info */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <i className="bi bi-shop text-success"></i>
              <span className="text-muted small">
                {t('seller')}: <strong className="text-dark">{product.seller?.companyName || product.seller?.businessName || product.seller?.name || 'Ardab Verified Merchant'}</strong>
              </span>
              {product.seller?.city && (
                <span className="badge bg-light text-muted rounded-pill border">
                  <i className="bi bi-geo-alt me-1"></i>
                  {product.seller.city}
                </span>
              )}
            </div>

            {/* Price Display */}
            <div className="d-flex align-items-baseline gap-2 mb-3">
              <span className="display-6 fw-bold text-success">
                {Number(displayPrice || 0).toLocaleString()}
              </span>
              <span className="fs-5 text-muted fw-semibold">ETB</span>
              {product.compareAtPrice && Number(product.compareAtPrice) > Number(displayPrice) && (
                <span className="text-muted text-decoration-line-through fs-5 ms-2">
                  {Number(product.compareAtPrice).toLocaleString()} ETB
                </span>
              )}
            </div>

            {/* Stock Availability */}
            <div className="mb-4">
              {isAvailable ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
                  <i className="bi bi-check-circle-fill me-1"></i> {t('in_stock')}
                  {product.unit ? ` (${product.unit})` : ''}
                </span>
              ) : (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill">
                  <i className="bi bi-x-circle-fill me-1"></i> {t('out_of_stock')}
                </span>
              )}
            </div>

            {/* Product Description */}
            {product.description && (
              <p className="text-muted mb-4 lead fs-6">{product.description}</p>
            )}

            {/* Normalized Category Attributes & Specifications */}
            {((product.attributeValues && product.attributeValues.length > 0) ||
              (product.attributes && Object.keys(product.attributes).length > 0) ||
              (product.weight && Number(product.weight) > 0)) && (
              <div className="mb-4 p-3 bg-light rounded-4 border border-light-subtle">
                <h6 className="fw-bold text-dark mb-2">
                  <i className="bi bi-sliders text-success me-2"></i>
                  {language === 'am' ? 'የምርት ዝርዝር መረጃዎች' : 'Product Specifications'}
                </h6>
                <div className="row g-2">
                  {/* Dynamic Category Attributes */}
                  {product.attributeValues && product.attributeValues.length > 0 ? (
                    product.attributeValues.map((attr) => {
                      const displayVal = attr.optionLabel || attr.optionValue || attr.valueText || (attr.valueNumber !== null ? `${attr.valueNumber} ${attr.unit || ''}` : null) || (attr.valueBoolean ? (language === 'am' ? 'አዎ' : 'Yes') : null);
                      if (!displayVal) return null;
                      return (
                        <div key={attr.id} className="col-6 col-md-4">
                          <small className="text-muted d-block">{attr.name || attr.slug}:</small>
                          <strong className="small text-dark">{displayVal}</strong>
                        </div>
                      );
                    })
                  ) : product.attributes && Object.keys(product.attributes).length > 0 ? (
                    Object.entries(product.attributes).map(([key, val]) => (
                      <div key={key} className="col-6 col-md-4">
                        <small className="text-muted d-block text-capitalize">{key}:</small>
                        <strong className="small text-dark">{String(val)}</strong>
                      </div>
                    ))
                  ) : null}

                  {/* Weight if applicable */}
                  {product.weight && Number(product.weight) > 0 && (
                    <div className="col-6 col-md-4">
                      <small className="text-muted d-block">{language === 'am' ? 'ክብደት' : 'Weight'}:</small>
                      <strong className="small text-dark">{Number(product.weight)} kg</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector & Add to Cart Actions */}
            {isAvailable && (
              <div className="d-flex flex-column gap-3 mb-4 mt-auto">
                <div className="d-flex align-items-center gap-3">
                  <label className="fw-semibold text-muted small">{t('quantity')}:</label>
                  <div className="input-group" style={{ width: '130px' }}>
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <i className="bi bi-dash"></i>
                    </button>
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      value={quantity}
                      min="1"
                      max={product.stock ?? 100}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock ?? 100, Number(e.target.value) || 1)))}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setQuantity(Math.min(product.stock ?? 100, quantity + 1))}
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                </div>

                {addedSuccess && (
                  <div className="alert alert-success py-2 px-3 mb-0 rounded-3 small animate-fade">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {t('item_added_to_cart')}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    onClick={handleAddToCart}
                    className="btn btn-outline-success btn-lg flex-grow-1 rounded-pill fw-bold hover-elevate"
                  >
                    <i className="bi bi-cart-plus me-2"></i>
                    {t('add_to_cart')}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="btn btn-fresh btn-lg flex-grow-1 rounded-pill fw-bold hover-elevate"
                  >
                    <i className="bi bi-lightning-charge me-2"></i>
                    {t('buy_now')}
                  </button>
                </div>
              </div>
            )}

            {/* Ardab Trust Badges */}
            <div className="row g-2 pt-3 border-top text-muted small mt-3">
              <div className="col-4 text-center">
                <i className="bi bi-shield-check text-success d-block fs-4 mb-1"></i>
                <span>{language === 'am' ? 'የተረጋገጠ ምርት' : 'Verified Vendor'}</span>
              </div>
              <div className="col-4 text-center">
                <i className="bi bi-truck text-success d-block fs-4 mb-1"></i>
                <span>{language === 'am' ? 'ደጃፍ ማድረሻ' : 'Doorstep Delivery'}</span>
              </div>
              <div className="col-4 text-center">
                <i className="bi bi-arrow-counterclockwise text-success d-block fs-4 mb-1"></i>
                <span>{language === 'am' ? 'ቀላል ልውውጥ' : 'Fair Returns'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 1060,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Close Button */}
          <button
            type="button"
            className="btn btn-outline-light rounded-circle position-absolute top-0 end-0 m-4 d-flex align-items-center justify-content-center"
            style={{ width: '48px', height: '48px', zIndex: 1070 }}
            onClick={() => setLightboxOpen(false)}
            aria-label="Close Lightbox"
          >
            <i className="bi bi-x-lg fs-5"></i>
          </button>

          {/* Previous Image Button */}
          {rawImages.length > 1 && (
            <button
              type="button"
              className="btn btn-light rounded-circle position-absolute start-0 top-50 translate-middle-y ms-3 ms-md-4 shadow d-flex align-items-center justify-content-center"
              style={{ width: '50px', height: '50px', zIndex: 1070 }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev - 1 + rawImages.length) % rawImages.length);
              }}
              aria-label="Previous image"
            >
              <i className="bi bi-chevron-left fs-5"></i>
            </button>
          )}

          {/* Lightbox Main Image */}
          <div
            className="p-2 p-md-4 text-center"
            style={{ maxWidth: '90vw', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={rawImages[activeImageIndex]}
              alt={`${product.name} - large view`}
              className="img-fluid rounded-4 object-fit-contain shadow-lg"
              style={{ maxHeight: '80vh', maxWidth: '85vw' }}
            />
            <div className="text-white-50 mt-3 small">
              {product.name} ({activeImageIndex + 1} / {rawImages.length})
            </div>
          </div>

          {/* Next Image Button */}
          {rawImages.length > 1 && (
            <button
              type="button"
              className="btn btn-light rounded-circle position-absolute end-0 top-50 translate-middle-y me-3 me-md-4 shadow d-flex align-items-center justify-content-center"
              style={{ width: '50px', height: '50px', zIndex: 1070 }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev + 1) % rawImages.length);
              }}
              aria-label="Next image"
            >
              <i className="bi bi-chevron-right fs-5"></i>
            </button>
          )}
        </div>
      )}

      {/* Customer Reviews Section */}
      <section className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="h4 fw-bold mb-1">{t('customer_reviews')}</h3>
            <small className="text-muted">{reviews.length} {t('reviews_count')}</small>
          </div>
          {isAuthenticated ? (
            <a href="#review-form" className="btn btn-outline-success btn-sm rounded-pill px-3">
              <i className="bi bi-pencil me-1"></i> {t('write_review')}
            </a>
          ) : (
            <Link href={`/login?redirect=/product/${productId}`} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
              {t('login_to_review')}
            </Link>
          )}
        </div>

        {reviews.length > 0 ? (
          <div className="row g-3 mb-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold text-dark">
                      {rev.customer?.user?.fullName || rev.customer?.user?.email?.split('@')[0] || 'Customer'}
                    </div>
                    <div className="text-warning">
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={`bi ${i < rev.rating ? 'bi-star-fill' : 'bi-star'} small`}></i>
                      ))}
                    </div>
                  </div>
                  <p className="text-muted small mb-0">{rev.comment}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 mb-4">
            <p className="text-muted mb-0">{t('no_reviews_yet')}</p>
          </div>
        )}

        {/* Review Submission Form */}
        {isAuthenticated && (
          <div id="review-form" className="card border-0 shadow-sm rounded-4 p-4">
            <h5 className="fw-bold mb-3">{t('write_review')}</h5>
            {reviewMessage && (
              <div className="alert alert-info py-2 small mb-3">{reviewMessage}</div>
            )}
            <form onSubmit={handleSubmitReview}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">{t('rating')}</label>
                <div className="d-flex gap-2 text-warning fs-5 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`bi ${star <= rating ? 'bi-star-fill' : 'bi-star'}`}
                      onClick={() => setRating(star)}
                    ></i>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="rev-comment">
                  {t('your_comment')}
                </label>
                <textarea
                  id="rev-comment"
                  className="form-control"
                  rows={3}
                  placeholder={language === 'am' ? 'ስለ ምርቱ ያለዎትን አስተያየት ይፃፉ...' : 'Write your honest review...'}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingReview || !comment.trim()}
                className="btn btn-fresh rounded-pill px-4"
              >
                {submittingReview ? t('submitting') : t('submit_review')}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
