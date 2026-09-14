'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { categoriesApi } from '@/lib/api';
import { Category } from '@/types/product';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: 'bi-box-seam',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.getAll();
      setCategories(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    categoriesApi.getAll().then((res) => {
      if (isMounted) setCategories(res);
    }).catch((e) => {
      console.error(e);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      icon: 'bi-basket3',
      description: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      description: cat.description || '',
      status: cat.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, ...formData } : c
        )
      );
    } else {
      await categoriesApi.create({
        ...formData,
        status: formData.status,
      });
      loadCategories();
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : c
      )
    );
  };

  return (
    <AdminLayout>
      <PageContainer
        title="Product Categories"
        subtitle="Organize marketplace commodities into clear regional sectors and classification trees"
        breadcrumbs={[{ label: 'Marketplace' }, { label: 'Categories' }]}
        actions={
          <button
            type="button"
            className="btn btn-ardab-primary d-flex align-items-center gap-2"
            onClick={handleOpenAdd}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Add Category</span>
          </button>
        }
      >
        {/* Categories Grid */}
        <div className="row g-3 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="col-12 col-md-6 col-lg-4">
              <div className="ardab-card ardab-card-hover h-100 p-4">
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div
                    className="ardab-icon-box icon-box-green"
                    style={{ width: 48, height: 48, fontSize: '1.4rem' }}
                  >
                    <i className={`bi ${cat.icon}`}></i>
                  </div>
                  <span
                    className={`ardab-badge ${
                      cat.status === 'ACTIVE' ? 'badge-success-soft' : 'badge-danger-soft'
                    }`}
                  >
                    {cat.status}
                  </span>
                </div>

                <h2 className="h5 fw-bold text-dark mb-1">{cat.name}</h2>
                <p className="text-muted small mb-3 lh-sm" style={{ minHeight: '38px' }}>
                  {cat.description || 'Standard marketplace commodity category.'}
                </p>

                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <div>
                    <span className="text-muted small">Catalog Items: </span>
                    <strong className="text-dark">{cat.productCount}</strong>
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      onClick={() => handleOpenEdit(cat)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        cat.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                      }`}
                      onClick={() => handleToggleStatus(cat.id)}
                    >
                      {cat.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add / Edit Category */}
        {isModalOpen && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsModalOpen(false)}
                  ></button>
                </div>
                <form onSubmit={handleSave}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label">Category Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value,
                            slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                          })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Bootstrap Icon Class</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="bi-box-seam"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-ardab-outline"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-ardab-primary">
                      Save Category
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
