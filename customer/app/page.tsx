'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/Cards/ProductCard';
import { catalogApi, Product, Category } from '@/lib/api';

export default function HomePage() {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getProducts({ page: 1, limit: 12 }),
        ]);

        if (catRes && catRes.data) {
          setCategories(catRes.data);
        }
        if (prodRes && prodRes.data) {
          setPopularProducts(prodRes.data.slice(0, 4));
          setNewArrivals(prodRes.data.slice(4, 8).length > 0 ? prodRes.data.slice(4, 8) : prodRes.data.slice(0, 4));
        }
      } catch (err: any) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();

    // IntersectionObserver for lightweight scroll-reveals
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="home-container">
      {/* 1. HERO SECTION: "Discover More. Shop Smarter. Delivered by Ardab." */}
      <section className="bg-white py-4 py-lg-5 border-bottom position-relative overflow-hidden">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6 text-center text-lg-start">
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-semibold mb-3 fs-6 animate-fade-in-up">
                <i className="bi bi-shield-check me-1"></i>
                {language === 'am' ? 'የተረጋገጠ የኢትዮጵያ የገበያ መድረክ' : 'Verified Ethiopian Marketplace'}
              </span>

              <h1 className="display-4 fw-extrabold text-dark mb-3 lh-sm animate-fade-in-up delay-100">
                {language === 'am' ? (
                  <>
                    ተጨማሪ ያግኙ። በብልሃት ይሸምቱ። <span className="text-success">በአርዳብ ይደርሳል።</span>
                  </>
                ) : (
                  <>
                    Discover More. Shop Smarter. <span className="text-success">Delivered by Ardab.</span>
                  </>
                )}
              </h1>

              <p className="lead text-muted mb-4 fs-5 animate-fade-in-up delay-200">
                {language === 'am'
                  ? 'ትኩስ የሀገር ውስጥ እህሎች፣ ቡና፣ ቅመማ ቅመሞች፣ ኤሌክትሮኒክስ፣ አልባሳት እና የቤት ውስጥ ፍጆታዎችን በቀጥታ ከተረጋገጡ ነጋዴዎች በደጃፍዎ ማድረሻ ይዘዙ።'
                  : 'Shop fresh regional produce, authentic coffee, spices, electronics, fashion, and household goods from verified merchants delivered directly to your doorstep.'}
              </p>

              <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start mb-4 animate-fade-in-up delay-300">
                <Link href="/products" className="btn btn-fresh btn-lg px-4 py-3 rounded-pill fw-bold shadow-sm hover-elevate">
                  <i className="bi bi-basket3-fill me-2"></i>
                  {t('shop_now')}
                </Link>
                <Link href="/categories" className="btn btn-outline-secondary btn-lg px-4 py-3 rounded-pill fw-bold hover-elevate">
                  <i className="bi bi-grid me-2"></i>
                  {t('explore_products')}
                </Link>
              </div>

              {/* Polished Operational Highlights (Factual & Realistic) */}
              <div className="row g-3 pt-3 border-top text-start animate-fade-in-up delay-400">
                <div className="col-6">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-patch-check-fill fs-5"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark fs-6">{language === 'am' ? 'ቀጥታ የገበያ መድረክ' : 'Direct Marketplace'}</div>
                      <small className="text-muted">{language === 'am' ? 'የአምራቾችና ነጋዴዎች አውታረ መረብ' : 'Connecting producers & buyers'}</small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-truck fs-5"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark fs-6">5,000 kg</div>
                      <small className="text-muted">{language === 'am' ? 'የተዘጋጀ የጭነት አቅም' : 'Vehicle cargo capacity'}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Product Composition Showcase */}
            <div className="col-lg-6">
              <div className="position-relative p-2 p-md-4">
                {/* Background decorative glow */}
                <div
                  className="position-absolute top-50 start-50 translate-middle rounded-circle"
                  style={{
                    width: '350px',
                    height: '350px',
                    background: 'radial-gradient(circle, rgba(16, 138, 78, 0.12) 0%, rgba(255,255,255,0) 70%)',
                    zIndex: 0,
                  }}
                ></div>

                {/* Composed Cards Collage */}
                <div className="row g-3 position-relative" style={{ zIndex: 1 }}>
                  {/* Item 1: Organic Ethiopian Coffee & Spices */}
                  <div className="col-6 float-hero-img">
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 hover-elevate transition-all">
                      <img
                        src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80"
                        alt="Ethiopian Coffee"
                        className="w-100 object-fit-cover"
                        style={{ height: '180px' }}
                      />
                      <div className="card-body p-3 text-start">
                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-1 small mb-1">
                          {language === 'am' ? 'ቡናና ቅመማ ቅመም' : 'Organic & Fresh'}
                        </span>
                        <h6 className="fw-bold text-dark mb-0">{language === 'am' ? 'የሲዳማና ዪርጋጨፌ ቡና' : 'Sidama & Yirgacheffe Coffee'}</h6>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: Fresh Farm Produce & Grains */}
                  <div className="col-6 float-hero-sub">
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 hover-elevate transition-all">
                      <img
                        src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80"
                        alt="Fresh Groceries"
                        className="w-100 object-fit-cover"
                        style={{ height: '180px' }}
                      />
                      <div className="card-body p-3 text-start">
                        <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-2 py-1 small mb-1">
                          {language === 'am' ? 'የእህል ምርቶች' : 'Grains & Teff'}
                        </span>
                        <h6 className="fw-bold text-dark mb-0">{language === 'am' ? 'ማኛ ጤፍና ሰብሎች' : 'Premium Magna Teff'}</h6>
                      </div>
                    </div>
                  </div>

                  {/* Banner Overlay Card: Fast Delivery Promise */}
                  <div className="col-12 mt-3">
                    <div className="card border-0 rounded-4 p-3 p-md-4 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #108A4E 0%, #0B6B3C 100%)' }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle bg-white text-success d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                            <i className="bi bi-truck fs-3"></i>
                          </div>
                          <div>
                            <h6 className="fw-bold text-white mb-0">{language === 'am' ? 'የአርዳብ ፈጣን የደጃፍ ማድረሻ' : 'Ardab Express Doorstep Delivery'}</h6>
                            <small className="text-white-70">{language === 'am' ? 'በጎንደር፣ ባህር ዳር፣ አዲስ አበባ እና ሃዋሳ' : 'Serving Gondar, Bahir Dar, Addis Ababa & Hawassa'}</small>
                          </div>
                        </div>
                        <Link href="/products" className="btn btn-light btn-sm rounded-pill fw-bold text-success px-3 d-none d-sm-inline-block">
                          {language === 'am' ? 'ይዘዙ' : 'Order Now'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SHOP BY CATEGORY */}
      <section className="py-5 bg-light reveal-on-scroll">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="h3 fw-bold mb-1">{t('featured_categories')}</h2>
              <small className="text-muted">
                {language === 'am' ? 'የሚፈልጉትን የምርት ምድብ በቀላሉ ይምረጡ' : 'Explore popular commodity and grocery categories'}
              </small>
            </div>
            <Link href="/categories" className="btn btn-outline-success btn-sm rounded-pill px-3 hover-elevate">
              {t('view_all')} <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>

          <div className="row g-3">
            {categories.length > 0 ? (
              categories.slice(0, 8).map((cat) => (
                <div key={cat.id} className="col-6 col-md-4 col-lg-3">
                  <Link href={`/category/${cat.id}`} className="text-decoration-none">
                    <div className="card h-100 border-0 shadow-sm text-center p-3 rounded-4 hover-elevate transition-all">
                      <div
                        className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3"
                        style={{ width: '64px', height: '64px' }}
                      >
                        <i className={`bi ${cat.icon || 'bi-bag-check-fill'} fs-2`}></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">{cat.name}</h6>
                      <small className="text-muted">
                        {cat.productCount || cat._count?.products || 0} {t('products')}
                      </small>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              [
                { title: language === 'am' ? 'እህሎችና ጤፍ' : 'Teff & Grains', icon: 'bi-flower1' },
                { title: language === 'am' ? 'ቡናና ቅመማ ቅመም' : 'Coffee & Spices', icon: 'bi-cup-hot-fill' },
                { title: language === 'am' ? 'ትኩስ አትክልትና ፍራፍሬ' : 'Produce & Fruits', icon: 'bi-basket2-fill' },
                { title: language === 'am' ? 'የወተት ተዋፅኦ' : 'Dairy & Honey', icon: 'bi-droplet-fill' },
                { title: language === 'am' ? 'የቤት ፍጆታዎች' : 'Household Goods', icon: 'bi-house-heart-fill' },
                { title: language === 'am' ? 'ኤሌክትሮኒክስ' : 'Electronics', icon: 'bi-phone-fill' },
                { title: language === 'am' ? 'አልባሳት' : 'Clothing & Shoes', icon: 'bi-handbag-fill' },
                { title: language === 'am' ? 'የውበት መጠበቂያ' : 'Personal Care', icon: 'bi-stars' },
              ].map((item, idx) => (
                <div key={idx} className="col-6 col-md-4 col-lg-3">
                  <Link href="/products" className="text-decoration-none">
                    <div className="card h-100 border-0 shadow-sm text-center p-3 rounded-4 hover-elevate transition-all">
                      <div
                        className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3"
                        style={{ width: '64px', height: '64px' }}
                      >
                        <i className={`bi ${item.icon} fs-2`}></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">{item.title}</h6>
                      <small className="text-muted">{language === 'am' ? 'የተመረጡ ምርቶች' : 'Quality selection'}</small>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. POPULAR PRODUCTS SHOWCASE */}
      <section className="py-5 bg-white border-top border-bottom reveal-on-scroll">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-1 small fw-bold mb-2">
                <i className="bi bi-fire me-1"></i> {language === 'am' ? 'ተወዳጅ ምርቶች' : 'Popular Products'}
              </span>
              <h2 className="h3 fw-bold mb-0">{t('featured_products')}</h2>
            </div>
            <Link href="/products" className="btn btn-outline-success btn-sm rounded-pill px-3 hover-elevate">
              {t('view_all')} <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : popularProducts.length > 0 ? (
            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4">
              {popularProducts.map((product) => (
                <div key={product.id} className="col">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card border-0 shadow-sm rounded-4 text-center py-5">
              <i className="bi bi-box-seam display-4 text-muted mb-2"></i>
              <p className="text-muted">{language === 'am' ? 'ምርቶች በመጫን ላይ ናቸው...' : 'Loading verified products...'}</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. HOW ARDAB MARKET WORKS (5 SIMPLE STEPS) */}
      <section className="py-5 bg-light reveal-on-scroll">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
              {language === 'am' ? 'ቀላል አሰራር' : 'Simple Ordering'}
            </span>
            <h2 className="h3 fw-bold mb-2">
              {language === 'am' ? 'አርዳብ ገበያ እንዴት ይሰራል?' : 'How Ardab Market Works'}
            </h2>
            <p className="text-muted small">
              {language === 'am'
                ? 'በ 5 ቀላል ደረጃዎች የሚፈልጉትን ምርት ከታመኑ ሻጮች በቀጥታ ወደ ቤትዎ ያግኙ'
                : 'Enjoy effortless regional marketplace shopping with complete doorstep delivery in 5 steps'}
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                step: '1',
                icon: 'bi-search',
                title: language === 'am' ? 'ምርቶችን ይፈልጉ' : 'Discover Products',
                desc: language === 'am' ? 'ከበርካታ የተረጋገጡ ሻጮች እቃዎችን ያወዳድሩ' : 'Browse verified local vendors and high-quality commodities',
              },
              {
                step: '2',
                icon: 'bi-cart-plus',
                title: language === 'am' ? 'ወደ ጋሪ ጨምሩ' : 'Add to Cart',
                desc: language === 'am' ? 'የሚፈልጉትን መጠንና አይነት በቀላሉ ይምረጡ' : 'Select items, units, and quantities with clear pricing',
              },
              {
                step: '3',
                icon: 'bi-shield-lock',
                title: language === 'am' ? 'በደህንነት ይክፈሉ' : 'Pay Securely',
                desc: language === 'am' ? 'በቴሌብር፣ በባንክ ወይም ሲደርስዎት ይክፈሉ' : 'Seamless transactions via Telebirr, CBE Birr, or Cash on Delivery',
              },
              {
                step: '4',
                icon: 'bi-box-seam',
                title: language === 'am' ? 'አርዳብ ያዘጋጃል' : 'Ardab Dispatches',
                desc: language === 'am' ? 'እቃው ተፈትሾ ለጭነትና ማድረሻ ይዘጋጃል' : 'Items are securely inspected and staged for scheduled delivery',
              },
              {
                step: '5',
                icon: 'bi-house-check',
                title: language === 'am' ? 'ትዕዛዝዎን ይቀበሉ' : 'Receive Your Order',
                desc: language === 'am' ? 'በከተማዎ ውስጥ በቀጥታ ደጃፍዎ ይደርሳል' : 'Fast, reliable doorstep delivery with real-time tracking',
              },
            ].map((item) => (
              <div key={item.step} className="col-12 col-md-6 col-lg">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center h-100 position-relative hover-elevate transition-all">
                  <div
                    className="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-success fw-bold"
                    style={{ width: '28px', height: '28px', lineHeight: '20px' }}
                  >
                    {item.step}
                  </div>
                  <div className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3 mt-2" style={{ width: '56px', height: '56px' }}>
                    <i className={`bi ${item.icon} fs-3`}></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">{item.title}</h6>
                  <p className="text-muted small mb-0">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. DELIVERY PROMOTION: "From Marketplace to Your Door" */}
      <section className="py-5 bg-white border-top reveal-on-scroll">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-3">
                <i className="bi bi-truck me-1"></i> {language === 'am' ? 'የአርዳብ ማድረሻ አገልግሎት' : 'Ardab Delivery Service'}
              </span>
              <h2 className="display-6 fw-bold text-dark mb-3">
                {language === 'am' ? 'ከገበያው በቀጥታ ወደ ደጃፍዎ' : 'From Marketplace to Your Door'}
              </h2>
              <p className="text-muted lead fs-6 mb-4">
                {language === 'am'
                  ? 'አርዳብ ገበያ የራሱ የሆነ አስተማማኝ የማድረሻ አውታረ መረብ አለው። ከጅምላ እህሎች እስከ ትናንሽ የቤት ውስጥ ፍጆታዎች ድረስ በጥንቃቄ ተጓጉዘው ደጃፍዎ ይደርሳሉ።'
                  : 'Ardab manages the entire regional fulfillment and transit process. From heavy grain sacks to delicate household essentials, your orders arrive safely and on schedule.'}
              </p>

              <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success bg-opacity-10 text-success p-2">
                    <i className="bi bi-geo-alt-fill fs-5"></i>
                  </div>
                  <div>
                    <strong className="text-dark d-block">{language === 'am' ? 'የከተማ እና የክልል ማዕከላት' : 'Regional Operational Hubs'}</strong>
                    <small className="text-muted">{language === 'am' ? 'ጎንደር፣ ባህር ዳር፣ አዲስ አበባ እና ሌሎች ከተሞች' : 'Centralized logistics in Gondar, Bahir Dar, and Addis Ababa'}</small>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success bg-opacity-10 text-success p-2">
                    <i className="bi bi-shield-check fs-5"></i>
                  </div>
                  <div>
                    <strong className="text-dark d-block">{language === 'am' ? 'የተረጋገጠ አያያዝ' : 'Quality Handling'}</strong>
                    <small className="text-muted">{language === 'am' ? 'እያንዳንዱ ምርት በንጽህናና በጥንቃቄ ተጠቅልሎ ይጓጓዛል' : 'Carefully packaged and temperature-aware logistics'}</small>
                  </div>
                </div>
              </div>

              <Link href="/products" className="btn btn-fresh rounded-pill px-4 fw-bold">
                {language === 'am' ? 'ትዕዛዝ ያስቀምጡ' : 'Shop Marketplace'} <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>

            <div className="col-lg-6 text-center">
              <div className="card border-0 shadow-lg rounded-4 overflow-hidden position-relative">
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
                  alt="Ardab Logistics & Warehouse"
                  className="w-100 object-fit-cover"
                  style={{ maxHeight: '360px' }}
                />
                <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-dark bg-opacity-75 text-white text-start">
                  <div className="fw-bold">{language === 'am' ? 'የአርዳብ ማድረሻ መርከብ' : 'Ardab Dedicated Logistics'}</div>
                  <small className="text-white-70">{language === 'am' ? 'ለከተማዎ የተዘጋጀ አስተማማኝ የማጓጓዣ አገልግሎት' : 'Fast, reliable city transit connecting verified sellers to customers'}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST & VALUE SECTION */}
      <section className="py-5 bg-light border-top reveal-on-scroll">
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="bi bi-shield-check fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{language === 'am' ? 'የታመኑ ነጋዴዎች' : 'Trusted Sellers'}</h5>
                <p className="text-muted small mb-0">
                  {language === 'am'
                    ? 'በአርዳብ ገበያ የሚሳተፉ ሻጮችና አምራቾች ማንነታቸውና ህጋዊነታቸው የተረጋገጠ ነው።'
                    : 'Every merchant on Ardab Market is verified for authenticity and business compliance.'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="bi bi-credit-card-2-front fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{language === 'am' ? 'ቀላል የሞባይል ክፍያ' : 'Mobile Payments'}</h5>
                <p className="text-muted small mb-0">
                  {language === 'am'
                    ? 'በቴሌብር፣ በሲቢኢ ብር ወይም በእጅ በእጅ በቀላሉና በፍጥነት ይክፈሉ።'
                    : 'Pay effortlessly using Telebirr, CBE Birr, or Cash on Delivery with immediate confirmation.'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="bi bi-clock-history fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{language === 'am' ? 'የትዕዛዝ ክትትል' : 'Order Tracking'}</h5>
                <p className="text-muted small mb-0">
                  {language === 'am'
                    ? 'የትዕዛዝዎን ሁኔታ ከመነሻው እስከ ደጃፍዎ ድረስ በቀጥታ ይከታተሉ።'
                    : 'Track your order timeline in real-time from confirmation to dispatch and doorstep delivery.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="py-5 text-white reveal-on-scroll" style={{ background: 'linear-gradient(135deg, #108A4E 0%, #0B6B3C 100%)' }}>
        <div className="container text-center py-3">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="display-6 fw-bold mb-3">
                {language === 'am' ? 'ዛሬውኑ በአርዳብ ገበያ መሸመት ይጀምሩ!' : 'Start Shopping on Ardab Market Today!'}
              </h2>
              <p className="lead mb-4 text-white-70 fs-6">
                {language === 'am'
                  ? 'ከመላው ሀገሪቱ የተመረጡ ጥራት ያላቸውን ምርቶች በተመጣጣኝ ዋጋ ለማግኘት አሁኑኑ ይመዝገቡ።'
                  : 'Join verified regional shoppers and get fresh commodities and everyday essentials delivered right to your home.'}
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-3">
                <Link href="/signup" className="btn btn-light btn-lg rounded-pill px-4 fw-bold text-success shadow">
                  <i className="bi bi-person-plus-fill me-2"></i>
                  {t('sign_up')}
                </Link>
                <Link href="/products" className="btn btn-outline-light btn-lg rounded-pill px-4 fw-bold">
                  {t('explore_products')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
