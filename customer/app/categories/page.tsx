'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { catalogApi, Category } from '@/lib/api';

export default function CategoriesPage() {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await catalogApi.getCategories();
        if (res && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-decoration-none text-muted">{t('home')}</Link>
          </li>
          <li className="breadcrumb-item active text-success fw-semibold" aria-current="page">
            {t('categories')}
          </li>
        </ol>
      </nav>

      <div className="text-center mb-5">
        <h1 className="h3 fw-bold mb-2">{t('browse_categories')}</h1>
        <p className="text-muted">
          {language === 'am'
            ? 'ሁሉንም የምርት ምድቦች ይመልከቱ እና የሚፈልጉትን በቀላሉ ይምረጡ'
            : 'Explore all marketplace categories and discover authentic regional items'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : categories.length > 0 ? (
        <div className="row g-4">
          {categories.map((cat) => (
            <div key={cat.id} className="col-6 col-md-4 col-lg-3">
              <Link href={`/category/${cat.id}`} className="text-decoration-none">
                <div className="card h-100 border-0 shadow-sm rounded-4 text-center p-4 hover-elevate transition-all">
                  <div className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3" style={{ width: '70px', height: '70px' }}>
                    <i className="bi bi-tag-fill fs-2"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">{cat.name}</h5>
                  {cat.description && (
                    <p className="small text-muted mb-2 text-truncate-2">{cat.description}</p>
                  )}
                  <span className="badge bg-light text-success fw-bold rounded-pill px-3 py-1">
                    {cat.productCount || cat._count?.products || 0} {t('products')}
                  </span>
                </div>
              </Link>

            </div>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 text-center py-5">
          <i className="bi bi-folder-x display-4 text-muted mb-3"></i>
          <h5>{t('no_categories')}</h5>
        </div>
      )}
    </div>
  );
}
