'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/Cards/ProductCard';
import { catalogApi, Product, Category } from '@/lib/api';

export default function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const categoryId = resolvedParams.id;

  const { t, language } = useLanguage();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getProducts({ categoryId, limit: 24 }),
        ]);

        if (catRes && catRes.data) {
          const current = catRes.data.find((c: Category) => c.id === categoryId);
          if (current) setCategory(current);
        }

        if (prodRes && prodRes.data) {
          setProducts(prodRes.data);
        }
      } catch (err) {
        console.error('Error loading category data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryData();
  }, [categoryId]);

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/categories" className="text-decoration-none text-muted">{t('categories')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {category ? category.name : t('category')}
          </li>
        </ol>
      </nav>

      {/* Category Hero Header */}
      <div className="bg-light p-4 p-md-5 rounded-4 mb-4 border">
        <div className="row align-items-center">
          <div className="col-md-8">
            <span className="badge bg-success rounded-pill px-3 py-1 mb-2">{t('category')}</span>
            <h1 className="display-6 fw-bold text-dark mb-2">
              {category ? category.name : t('category')}
            </h1>
            {category?.description && (
              <p className="text-muted lead mb-0">{category.description}</p>
            )}
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <span className="fs-5 fw-bold text-success">
              {products.length} {t('products')}
            </span>
          </div>
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
        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4">
          {products.map((prod) => (
            <div key={prod.id} className="col">
              <ProductCard product={prod} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 text-center py-5">
          <i className="bi bi-box2 display-3 text-muted mb-3"></i>
          <h5>{t('no_products_in_category')}</h5>
          <p className="text-muted small">
            {language === 'am' ? 'በዚህ ምድብ ውስጥ ምንም ምርቶች አልተገኙም።' : 'No products available under this category.'}
          </p>
          <div className="mt-2">
            <Link href="/products" className="btn btn-fresh rounded-pill px-4">
              {t('view_all_products')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
