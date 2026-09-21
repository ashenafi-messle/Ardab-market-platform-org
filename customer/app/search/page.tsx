'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/Cards/ProductCard';
import { catalogApi, Product, Category } from '@/lib/api';

function SearchPageContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sync state if URL search params change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    setSearchQuery(q);
    setSelectedCategory(cat);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await catalogApi.getCategories();
        if (res && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params: any = {
          page,
          limit: 12,
          sort: sortBy,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedCategory) params.categoryId = selectedCategory;
        if (minPrice) params.minPrice = Number(minPrice);
        if (maxPrice) params.maxPrice = Number(maxPrice);

        const res = await catalogApi.getProducts(params);
        if (res && res.data) {
          setProducts(res.data);
          if (res.pagination) {
            const p: any = res.pagination;
            setTotalPages(p.totalPages || p.pages || 1);
            setTotalCount(p.total || res.data.length);
          }
        }
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [searchQuery, selectedCategory, minPrice, maxPrice, sortBy, page]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('createdAt_desc');
    setPage(1);
    router.push('/search');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="container py-4">
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">
              {t('home', 'Home')}
            </Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {language === 'am' ? 'ፍለጋ' : 'Search'}
          </li>
        </ol>
      </nav>

      {/* Header Search Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-light">
        <form onSubmit={handleSearchSubmit}>
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-white border-start-0 py-2"
                  placeholder={language === 'am' ? 'ምርቶችን፣ ምድቦችን፣ ብራንዶችን ይፈልጉ...' : 'Search products, categories, brands...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select py-2"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t('all_categories', 'All Categories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2 d-grid">
              <button type="submit" className="btn btn-fresh-primary py-2 fw-semibold">
                {t('common.actions.filter', 'Search')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Search Header Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 fs-4 text-dark">
            {searchQuery.trim() ? (
              <>
                {language === 'am' ? 'የፍለጋ ውጤቶች ለ' : 'Search Results for'}{' '}
                <span className="text-success">&ldquo;{searchQuery}&rdquo;</span>
              </>
            ) : (
              <>{language === 'am' ? 'ሁሉንም ምርቶች ያስሱ' : 'Browse All Marketplace Products'}</>
            )}
          </h2>
          <p className="text-muted small mb-0">
            {language === 'am'
              ? `${totalCount} ምርቶች ተገኝተዋል`
              : `Found ${totalCount} products`}
          </p>
        </div>

        {/* Sort Filter */}
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
          <label className="text-muted small fw-semibold text-nowrap mb-0">
            {t('sort_by', 'Sort By')}:
          </label>
          <select
            className="form-select form-select-sm shadow-none"
            style={{ width: 'auto' }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="createdAt_desc">{t('newest', 'Newest')}</option>
            <option value="price_asc">{t('price_low_high', 'Price: Low to High')}</option>
            <option value="price_desc">{t('price_high_low', 'Price: High to Low')}</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="row g-4">
        {/* Left Filter Sidebar */}
        <div className="col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 mb-4">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center justify-content-between">
              <span>{t('filter_results', 'Filter Results')}</span>
              {(selectedCategory || minPrice || maxPrice || searchQuery) && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-0 text-decoration-none small"
                  onClick={handleResetFilters}
                >
                  {t('clear_filters', 'Clear')}
                </button>
              )}
            </h5>

            {/* Price Filter */}
            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted mb-2">
                {t('price_range', 'Price Range')} (ETB)
              </label>
              <div className="d-flex gap-2 align-items-center">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                />
                <span className="text-muted">-</span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Category Filter List */}
            <div>
              <label className="form-label small fw-semibold text-muted mb-2">
                {t('categories', 'Categories')}
              </label>
              <div className="list-group list-group-flush small">
                <button
                  type="button"
                  className={`list-group-item list-group-item-action border-0 px-2 py-2 rounded-2 ${
                    !selectedCategory ? 'bg-success text-white fw-bold' : ''
                  }`}
                  onClick={() => {
                    setSelectedCategory('');
                    setPage(1);
                  }}
                >
                  {t('all_categories', 'All Categories')}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`list-group-item list-group-item-action border-0 px-2 py-2 rounded-2 ${
                      selectedCategory === c.id ? 'bg-success text-white fw-bold' : ''
                    }`}
                    onClick={() => {
                      setSelectedCategory(c.id);
                      setPage(1);
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="col-lg-9">
          {loading ? (
            <div className="row g-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-6 col-md-4">
                  <div className="card border-0 shadow-sm rounded-4 p-3 h-100 placeholder-glow">
                    <div className="placeholder w-100 rounded-3 mb-3" style={{ height: '180px' }}></div>
                    <span className="placeholder col-7 mb-2"></span>
                    <span className="placeholder col-4"></span>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="row g-3">
                {products.map((product) => (
                  <div key={product.id} className="col-6 col-md-4">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-5 d-flex justify-content-center">
                  <ul className="pagination pagination-sm gap-1">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link rounded-pill px-3" onClick={() => setPage(page - 1)}>
                        <i className="bi bi-chevron-left me-1"></i> Prev
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, idx) => (
                      <li key={idx + 1} className={`page-item ${page === idx + 1 ? 'active' : ''}`}>
                        <button
                          className={`page-link rounded-circle ${
                            page === idx + 1 ? 'bg-success border-success text-white' : ''
                          }`}
                          style={{ width: '32px', height: '32px', padding: 0 }}
                          onClick={() => setPage(idx + 1)}
                        >
                          {idx + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link rounded-pill px-3" onClick={() => setPage(page + 1)}>
                        Next <i className="bi bi-chevron-right ms-1"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            /* Clean Empty State - Never 404 */
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center my-4">
              <div className="mb-3 text-muted">
                <i className="bi bi-search display-3 text-secondary opacity-50"></i>
              </div>
              <h4 className="fw-bold text-dark mb-2">
                {t('no_products_found', 'No products found')}
              </h4>
              <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '420px' }}>
                {language === 'am'
                  ? 'ለፍለጋዎ የሚስማማ ምንም ምርት አልተገኘም። እባክዎ ፊደላትን ያረጋግጡ ወይም ማጣሪያዎችን ያጽዱ።'
                  : 'We couldn’t find any products matching your search term. Try checking for typos or resetting your filters.'}
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={handleResetFilters}
                >
                  {t('reset_filters', 'Reset Filters')}
                </button>
                <Link href="/products" className="btn btn-fresh-primary rounded-pill px-4">
                  {language === 'am' ? 'ሁሉንም ምርቶች ያስሱ' : 'Browse All Products'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-5 text-center">
          <div className="spinner-border text-success" role="status"></div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
