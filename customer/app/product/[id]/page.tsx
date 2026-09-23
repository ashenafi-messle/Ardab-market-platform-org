'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { catalogApi, reviewsApi, Product, Review } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/images';
import RatingDisplay from '@/components/Cards/RatingDisplay';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const { t, language } = useLanguage();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useCustomerAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, any>>({});
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState<any>(null);
  const [customerReview, setCustomerReview] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);

  const fetchReviews = async () => {
    try {
      const res: any = await reviewsApi.getProductReviews(productId);
      if (res) {
        setReviews(res.items || res.data || []);
        if (res.summary) setReviewSummary(res.summary);
        if (res.customerReview !== undefined) setCustomerReview(res.customerReview);
        if (res.eligibility !== undefined) setEligibility(res.eligibility);
      }
    } catch (err) {
      console.error('Error fetching product reviews:', err);
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const prodRes = await catalogApi.getProductById(productId);
        if (prodRes && prodRes.data) {
          setProduct(prodRes.data);
          if (prodRes.data.attributes && typeof prodRes.data.attributes === 'object') {
            setSelectedAttributes(prodRes.data.attributes);
          }
        }
        await fetchReviews();
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

    const previousReview = customerReview;
    const optimisticReview = {
      id: isEditingReview ? customerReview?.id : 'temp-' + Date.now(),
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      comment: reviewComment.trim(),
      isAnonymous: reviewAnonymous,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      isVerified: customerReview?.isVerified ?? false,
    };

    // Optimistically update the UI immediately
    setCustomerReview(optimisticReview);
    setShowReviewForm(false);
    setIsEditingReview(false);
    setSubmittingReview(true);
    setReviewMessage({ type: 'success', text: t('review_submitted_success') });

    try {
      if (isEditingReview && previousReview?.id) {
        await reviewsApi.updateReview(previousReview.id, {
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          comment: reviewComment.trim(),
          isAnonymous: reviewAnonymous,
        });
      } else {
        await reviewsApi.submitReview(productId, {
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          comment: reviewComment.trim(),
          isAnonymous: reviewAnonymous,
        });
      }
      setReviewComment('');
      setReviewTitle('');
      setReviewRating(5);
      // Re-sync quietly in background
      await fetchReviews();
    } catch (err: any) {
      // Revert optimistic update on failure
      setCustomerReview(previousReview);
      setShowReviewForm(true);
      setReviewMessage({ type: 'error', text: err.message || 'Failed to submit review' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartEditReview = () => {
    if (!customerReview) return;
    setReviewRating(customerReview.rating || 5);
    setReviewTitle(customerReview.title || '');
    setReviewComment(customerReview.comment || '');
    setReviewAnonymous(customerReview.isAnonymous || false);
    setIsEditingReview(true);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async () => {
    if (!customerReview?.id) return;
    if (!window.confirm(t('delete_review_confirm'))) return;

    setDeletingReview(true);
    try {
      await reviewsApi.deleteReview(customerReview.id);
      setCustomerReview(null);
      setShowReviewForm(false);
      setIsEditingReview(false);
      await fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    } finally {
      setDeletingReview(false);
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
                src={getOptimizedImageUrl(rawImages[activeImageIndex], { width: 800 })}
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
                      src={getOptimizedImageUrl(imgUrl, { width: 160 })}
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

            <div className="d-flex align-items-center gap-2 mb-3" aria-label={product.rating?.count ? `${product.rating.average?.toFixed(1)} out of 5 from ${product.rating.count} reviews` : 'No ratings yet'}>
              {product.rating?.count ? (
                <RatingDisplay average={product.rating.average ?? 0} count={product.rating.count} />
              ) : (
                <span className="text-muted small">{t('marketplace.card.noRatings')}</span>
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
              src={getOptimizedImageUrl(rawImages[activeImageIndex], { width: 1400 })}
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
      <section className="mt-5 pt-3 border-top" id="reviews-section">
        {/* Review Header & Overview Card */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <div className="row g-4 align-items-center">
            {/* Left: Overall Rating Score */}
            <div className="col-12 col-md-5 text-center text-md-start border-md-end pb-3 pb-md-0">
              <h3 className="h4 fw-bold text-dark mb-1">{t('customer_reviews')}</h3>
              <div className="d-flex align-items-baseline gap-3 my-2 justify-content-center justify-content-md-start">
                <span className="display-4 fw-bold text-dark">
                  {reviewSummary?.totalReviews ? reviewSummary.averageRating.toFixed(1) : product.rating?.average?.toFixed(1) || '—'}
                </span>
                <div>
                  <div className="text-warning fs-5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const avg = reviewSummary?.totalReviews ? reviewSummary.averageRating : product.rating?.average || 0;
                      return (
                        <i
                          key={star}
                          className={`bi ${star <= Math.round(avg) ? 'bi-star-fill' : 'bi-star'} me-1`}
                        ></i>
                      );
                    })}
                  </div>
                  <small className="text-muted">
                    {reviewSummary?.totalReviews ?? product.rating?.count ?? 0} {t('reviews_count')} ({t('out_of_5')})
                  </small>
                </div>
              </div>
            </div>

            {/* Right: Rating Distribution Bars */}
            <div className="col-12 col-md-7">
              <div className="d-flex flex-column gap-2">
                {[5, 4, 3, 2, 1].map((starVal) => {
                  const pct = reviewSummary?.ratingPercentages?.[starVal] || 0;
                  const count = reviewSummary?.ratingDistribution?.[starVal] || 0;
                  return (
                    <div key={starVal} className="d-flex align-items-center gap-2 small">
                      <span className="text-muted text-nowrap" style={{ width: '38px' }}>
                        {starVal} <i className="bi bi-star-fill text-warning"></i>
                      </span>
                      <div className="progress flex-grow-1" style={{ height: '8px', borderRadius: '4px' }}>
                        <div
                          className="progress-bar bg-warning"
                          role="progressbar"
                          style={{ width: `${pct}%` }}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                      <span className="text-muted text-end text-nowrap" style={{ width: '65px', fontSize: '0.75rem' }}>
                        {pct}% ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action / Eligibility Banner */}
        <div className="mb-4">
          {reviewMessage && (
            <div
              className={`alert ${reviewMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show rounded-4 py-2 px-3 small`}
              role="alert"
            >
              <i className={`bi ${reviewMessage.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
              {reviewMessage.text}
              <button
                type="button"
                className="btn-close py-2"
                onClick={() => setReviewMessage(null)}
                aria-label="Close"
              ></button>
            </div>
          )}

          {!isAuthenticated ? (
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-light d-flex flex-row align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2 text-muted small">
                <i className="bi bi-person-lock fs-5 text-success"></i>
                <span>{t('login_to_review')}</span>
              </div>
              <Link href={`/login?redirect=/product/${productId}`} className="btn btn-outline-success btn-sm rounded-pill px-3">
                {t('login')}
              </Link>
            </div>
          ) : customerReview ? (
            /* Author's Existing Review Highlight Card */
            <div className="card border border-success border-opacity-25 shadow-sm rounded-4 p-4 mb-3 bg-white">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                  <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-semibold small me-2">
                    <i className="bi bi-person-check-fill me-1"></i>
                    {t('your_review')}
                  </span>
                  {customerReview.status === 'PENDING' ? (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle rounded-pill px-3 py-1 small">
                      <i className="bi bi-hourglass-split me-1"></i>
                      {t('pending_moderation')}
                    </span>
                  ) : (
                    <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-3 py-1 small">
                      <i className="bi bi-patch-check-fill me-1"></i>
                      {t('approved_published')}
                    </span>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                    onClick={handleStartEditReview}
                  >
                    <i className="bi bi-pencil me-1"></i> {t('edit_review')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger rounded-pill px-3"
                    disabled={deletingReview}
                    onClick={handleDeleteReview}
                  >
                    <i className="bi bi-trash me-1"></i> {t('delete_review')}
                  </button>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="text-warning">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`bi ${star <= customerReview.rating ? 'bi-star-fill' : 'bi-star'} small`}
                    ></i>
                  ))}
                </div>
                <span className="text-muted small">
                  {customerReview.createdAt?.split('T')[0]}
                </span>
                {customerReview.isVerified && (
                  <span className="badge bg-light text-muted border small ms-1" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-check2 text-success me-1"></i>{t('verified_purchase')}
                  </span>
                )}
              </div>

              {customerReview.title && (
                <h6 className="fw-bold text-dark mb-1">{customerReview.title}</h6>
              )}
              <p className="text-dark small mb-0">{customerReview.comment}</p>

              {/* Admin response if available */}
              {customerReview.adminReply && (
                <div className="mt-3 p-3 bg-light rounded-3 border-start border-3 border-success">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-reply-fill text-success"></i>
                    <strong className="small text-success">
                      {customerReview.responderName || t('admin_response')}
                    </strong>
                    {customerReview.repliedAt && (
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {customerReview.repliedAt.split('T')[0]}
                      </span>
                    )}
                  </div>
                  <p className="small text-muted mb-0">{customerReview.adminReply}</p>
                </div>
              )}
            </div>
          ) : (
            /* Write review button for all authenticated customers */
            <div className="d-flex justify-content-end mb-3">
              <button
                type="button"
                className="btn btn-fresh rounded-pill px-4"
                onClick={() => {
                  setIsEditingReview(false);
                  setReviewRating(5);
                  setReviewTitle('');
                  setReviewComment('');
                  setShowReviewForm(!showReviewForm);
                }}
              >
                <i className="bi bi-pencil-square me-1"></i>
                {showReviewForm ? t('cancel') : t('write_review')}
              </button>
            </div>
          )}

          {/* Accessible Review Creation & Editing Form */}
          {showReviewForm && (
            <div className="card border-0 shadow rounded-4 p-4 mb-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  {isEditingReview ? t('edit_review') : t('write_review')}
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0"
                  onClick={() => setShowReviewForm(false)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitReview}>
                {/* Accessible Star Selector */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark d-block">
                    {language === 'am' ? 'ደረጃ ይምረጡ' : 'Select Rating'} (1–5 {t('stars')})
                  </label>
                  <div
                    className="d-flex gap-2 text-warning fs-3"
                    role="radiogroup"
                    aria-label="Product rating from 1 to 5 stars"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="btn p-0 border-0 text-warning fs-3 focus-ring focus-ring-success"
                        onClick={() => setReviewRating(star)}
                        aria-label={`${star} ${star === 1 ? t('star') : t('stars')}`}
                        role="radio"
                        aria-checked={reviewRating === star}
                      >
                        <i className={`bi ${star <= reviewRating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}></i>
                      </button>
                    ))}
                    <span className="text-dark small align-self-center ms-2 fw-semibold">
                      {reviewRating} / 5
                    </span>
                  </div>
                </div>

                {/* Review Title Input */}
                <div className="mb-3">
                  <label htmlFor="rev-title" className="form-label small fw-semibold text-dark">
                    {t('review_title')}
                  </label>
                  <input
                    type="text"
                    id="rev-title"
                    className="form-control rounded-3"
                    placeholder={language === 'am' ? 'ለምሳሌ፡ በጣም ምርጥ ምርት...' : 'e.g., Excellent quality grain...'}
                    maxLength={120}
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                  />
                </div>

                {/* Review Comment Textarea */}
                <div className="mb-3">
                  <label htmlFor="rev-comment" className="form-label small fw-semibold text-dark">
                    {t('your_comment')} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="rev-comment"
                    className="form-control rounded-3"
                    rows={4}
                    placeholder={t('review_placeholder')}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                    minLength={3}
                    maxLength={2000}
                  ></textarea>
                  <div className="d-flex justify-content-between text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                    <span>{language === 'am' ? 'ዝቅተኛ 3 ፊደላት' : 'Min 3 characters'}</span>
                    <span>{reviewComment.length}/2000</span>
                  </div>
                </div>

                {/* Anonymous Option */}
                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    id="rev-anon"
                    className="form-check-input"
                    checked={reviewAnonymous}
                    onChange={(e) => setReviewAnonymous(e.target.checked)}
                  />
                  <label htmlFor="rev-anon" className="form-check-label small text-muted">
                    {t('anonymous_review')}
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingReview || reviewComment.trim().length < 3}
                    className="btn btn-fresh rounded-pill px-4"
                  >
                    {submittingReview ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {t('saving')}
                      </>
                    ) : isEditingReview ? (
                      t('update_review')
                    ) : (
                      t('submit_review')
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-3"
                    onClick={() => setShowReviewForm(false)}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Public Reviews Listing */}
        <h5 className="fw-bold text-dark mb-3">
          {t('customer_reviews')} ({reviews.length})
        </h5>

        {reviews.length > 0 ? (
          <div className="row g-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center fw-bold small"
                        style={{ width: '32px', height: '32px' }}
                      >
                        {(rev.authorName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-bold text-dark small">{rev.authorName}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {rev.createdAt?.split('T')[0]}
                        </div>
                      </div>
                    </div>
                    <div className="text-warning">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= rev.rating ? 'bi-star-fill' : 'bi-star'} small`}
                        ></i>
                      ))}
                    </div>
                  </div>

                  {rev.isVerified && (
                    <div className="mb-2">
                      <span
                        className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1"
                        style={{ fontSize: '0.68rem' }}
                      >
                        <i className="bi bi-patch-check-fill me-1"></i>
                        {t('verified_purchase')}
                      </span>
                    </div>
                  )}

                  {rev.title && (
                    <h6 className="fw-semibold text-dark small mb-1">{rev.title}</h6>
                  )}
                  <p className="text-muted small mb-0 flex-grow-1" style={{ whiteSpace: 'pre-line' }}>
                    {rev.comment}
                  </p>

                  {/* Official Sub Admin Response */}
                  {rev.adminReply && (
                    <div className="mt-3 p-3 bg-light rounded-3 border-start border-3 border-primary">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-reply-fill text-primary"></i>
                        <strong className="small text-primary">
                          {rev.responderName || t('admin_response')}
                        </strong>
                        {rev.repliedAt && (
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {rev.repliedAt.split('T')[0]}
                          </span>
                        )}
                      </div>
                      <p className="small text-muted mb-0">{rev.adminReply}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card border-0 shadow-sm rounded-4 text-center py-5 bg-light">
            <i className="bi bi-chat-square-dots text-muted display-5 mb-2"></i>
            <p className="text-muted mb-0">{t('no_reviews_yet')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
