'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/Cards/ProductCard';
import { catalogApi, Product, Category } from '@/lib/api';

function ProductsContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Debounce search query to avoid firing API requests on every single keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
        if (debouncedSearchQuery) params.search = debouncedSearchQuery;
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
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [debouncedSearchQuery, selectedCategory, minPrice, maxPrice, sortBy, page]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('createdAt_desc');
    setPage(1);
  };

  // Helper to flatten nested category tree for indented dropdown display
  const flattenCategories = (cats: Category[], depth = 0): Array<{ id: string; name: string; depth: number; productCount?: number }> => {
    const list: Array<{ id: string; name: string; depth: number; productCount?: number }> = [];
    cats.forEach((cat) => {
      list.push({ id: cat.id, name: cat.name, depth, productCount: cat.productCount || cat._count?.products });
      if (cat.children && cat.children.length > 0) {
        list.push(...flattenCategories(cat.children, depth + 1));
      }
    });
    return list;
  };

  const flattenedCategories = flattenCategories(categories);

  return (
    <div className="container py-4">
      {/* Breadcrumb Header */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('all_products')}
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* Sidebar Filters */}
        <aside className="col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 sticky-top" style={{ top: '85px', zIndex: 10 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-funnel text-success me-2"></i>
                {t('filter_results')}
              </h5>
              {(searchQuery || selectedCategory || minPrice || maxPrice) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                >
                  {t('reset_filters')}
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">{t('search')}</label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder={language === 'am' ? 'ምርቶችን ይፈልጉ...' : 'Search items...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {searchQuery && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

              {/* Categories Filter */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">{t('categories')}</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('all_categories')}</option>
                  {flattenedCategories.map((c) => {
                    const indent = c.depth > 0 ? `${'\u00A0\u00A0'.repeat(c.depth)}↳ ` : '';
                    const countSuffix = c.productCount !== undefined && c.productCount !== null ? ` (${c.productCount})` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {indent}{c.name}{countSuffix}
                      </option>
                    );
                  })}
                </select>
              </div>

            {/* Price Range */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">{t('price_range')} (ETB)</label>
              <div className="row g-2">
                <div className="col-6">
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
                </div>
                <div className="col-6">
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
            </div>
          </div>
        </aside>

        {/* Product Grid & Top Sort */}
        <main className="col-lg-9">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2 bg-white p-3 rounded-4 shadow-sm">
            <div>
              <span className="text-muted small">
                {language === 'am' ? `ድምር ${totalCount} ምርቶች ተገኝተዋል` : `Showing ${totalCount} items`}
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0">{t('sort_by')}:</label>
              <select
                className="form-select form-select-sm w-auto"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt_desc">{t('newest')}</option>
                <option value="price_asc">{t('price_low_high')}</option>
                <option value="price_desc">{t('price_high_low')}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">{t('loading')}</p>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="row row-cols-2 row-cols-md-3 g-3">
                {products.map((product) => (
                  <div key={product.id} className="col">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4 d-flex justify-content-center">
                  <ul className="pagination pagination-sm">
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>
                        {t('previous')}
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>
                          {p}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>
                        {t('next')}
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <div className="card border-0 shadow-sm rounded-4 text-center py-5">
              <i className="bi bi-search display-3 text-muted mb-3"></i>
              <h5 className="fw-bold">{t('no_products_found')}</h5>
              <p className="text-muted small mb-3">
                {language === 'am' ? 'የፈለጉትን ምርት ማግኘት አልተቻለም። እባክዎ ፍለጋዎን ያስተካክሉ።' : 'No products matched your search criteria.'}
              </p>
              <div>
                <button onClick={handleResetFilters} className="btn btn-outline-success btn-sm rounded-pill px-3">
                  {t('clear_filters')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-success"></div></div>}>
      <ProductsContent />
    </Suspense>
  );
}
