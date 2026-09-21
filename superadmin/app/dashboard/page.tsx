'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import {
  ordersApi,
  fleetApi,
  customersApi,
  productsApi,
  suppliersApi,
  securityApi,
} from '@/lib/api';
import { Order } from '@/types/order';
import { Trip } from '@/types/trip';
import { Customer } from '@/types/customer';
import { Product } from '@/types/product';
import { Supplier } from '@/types/supplier';
import { SecurityEventItem } from '@/types/security';

export default function DashboardPage() {
  const { user, isLoading: authLoading, selectedCity } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customerWebEvents, setCustomerWebEvents] = useState<SecurityEventItem[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    let isMounted = true;
    Promise.all([
      ordersApi.getAll(selectedCity),
      fleetApi.getTrips(selectedCity),
      customersApi.getAll(selectedCity),
      productsApi.getAll(selectedCity),
      suppliersApi.getAll(selectedCity),
      securityApi.getEvents({ source: 'CUSTOMER_WEB', pageSize: 6 }).catch(() => ({ data: [] })),
    ]).then(([ordersRes, tripsRes, customersRes, productsRes, suppliersRes, eventsRes]) => {
      if (isMounted) {
        setOrders(ordersRes);
        setTrips(tripsRes);
        setCustomers(customersRes);
        setProducts(productsRes);
        setSuppliers(suppliersRes);
        setCustomerWebEvents(eventsRes?.data || []);
      }
    }).catch((err) => {
      console.error('Failed to load dashboard:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, authLoading, user]);

  if (authLoading || !user) {
    return (
      <AdminLayout>
        <PageContainer
          title="Super Admin Command Center"
          subtitle="Authenticating and preparing operational overview..."
        >
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </PageContainer>
      </AdminLayout>
    );
  }

  const pendingOrders = orders.filter((o) => o.orderStatus === 'PENDING');
  const activeTrips = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'LOADING');
  const activeDeliveriesCount = orders.filter(
    (o) => o.orderStatus === 'IN_TRANSIT' || o.orderStatus === 'READY_FOR_DELIVERY'
  ).length;

  return (
    <AdminLayout>
      <PageContainer
        title="Super Admin Command Center"
        subtitle={`Central operations: Products, Suppliers, Customers, Incoming Orders, and Deliveries (${selectedCity})`}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link href="/products" className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-plus-circle"></i>
              <span>Post Product</span>
            </Link>
            <Link href="/suppliers" className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-1">
              <i className="bi bi-building-add"></i>
              <span>Register Supplier</span>
            </Link>
          </div>
        }
      >
        {/* Incoming Orders Attention Banner */}
        {pendingOrders.length > 0 && (
          <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', borderLeft: '5px solid #d97706' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="d-flex align-items-start gap-3">
                <div className="p-2 rounded-circle bg-warning bg-opacity-25 text-warning-emphasis fs-4">
                  <i className="bi bi-bell-fill"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">
                    {pendingOrders.length} Incoming Order{pendingOrders.length > 1 ? 's' : ''} Awaiting Confirmation
                  </h6>
                  <p className="text-muted small mb-0">
                    New marketplace orders require Super Admin verification before dispatching to delivery hubs and notifying sellers.
                  </p>
                </div>
              </div>
              <Link
                href="/orders"
                className="btn btn-warning fw-semibold px-4 text-nowrap align-self-start align-self-md-center shadow-sm"
              >
                Review Incoming Orders &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* 5 Core Feature KPI Cards */}
        <div className="row g-3 mb-4">
          {/* 1. Incoming & Total Orders */}
          <div className="col-12 col-sm-6 col-xl">
            <Link href="/orders" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Incoming Orders</span>
                  <div className="ardab-icon-box icon-box-warning" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>
                    <i className="bi bi-inbox-fill"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{orders.length}</h3>
                  {pendingOrders.length > 0 && (
                    <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.7rem' }}>
                      {pendingOrders.length} New
                    </span>
                  )}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {orders.filter((o) => o.orderStatus === 'IN_TRANSIT').length} en route to customer
                </div>
              </div>
            </Link>
          </div>

          {/* 2. Deliveries */}
          <div className="col-12 col-sm-6 col-xl">
            <Link href="/deliveries" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Deliveries</span>
                  <div className="ardab-icon-box icon-box-teal" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>
                    <i className="bi bi-truck"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{activeDeliveriesCount}</h3>
                  <span className="badge badge-info-soft" style={{ fontSize: '0.7rem' }}>
                    {activeTrips.length} active runs
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  5,000 KG fleet trucks
                </div>
              </div>
            </Link>
          </div>

          {/* 3. Products */}
          <div className="col-12 col-sm-6 col-xl">
            <Link href="/products" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Products</span>
                  <div className="ardab-icon-box icon-box-green" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>
                    <i className="bi bi-box-seam-fill"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{products.length}</h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    With Sellers
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {products.filter((p) => p.discountPercent && p.discountPercent > 0).length} active discount items
                </div>
              </div>
            </Link>
          </div>

          {/* 4. Suppliers */}
          <div className="col-12 col-sm-6 col-xl">
            <Link href="/suppliers" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Suppliers</span>
                  <div className="ardab-icon-box icon-box-primary" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>
                    <i className="bi bi-building"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{suppliers.length}</h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    100% Active
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  Verified Ethiopian sellers
                </div>
              </div>
            </Link>
          </div>

          {/* 5. Customers */}
          <div className="col-12 col-sm-6 col-xl">
            <Link href="/customers" className="text-decoration-none">
              <div className="ardab-card ardab-card-hover h-100 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-medium">Customers</span>
                  <div className="ardab-icon-box icon-box-info" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                </div>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <h3 className="fw-bold mb-0 text-dark">{customers.length}</h3>
                  <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                    Verified
                  </span>
                </div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  {selectedCity} hub clients
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Row 2: Incoming Orders Priority Queue & Deliveries Overview */}
        <div className="row g-3 mb-4">
          {/* Left: Incoming Orders Priority Queue */}
          <div className="col-12 col-lg-7">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-inbox text-warning me-2"></i>
                    Incoming Orders &amp; Control
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Manage customer orders across sellers and delivery stages
                  </span>
                </div>
                <Link href="/orders" className="small text-success text-decoration-none fw-semibold">
                  Control Panel &rarr;
                </Link>
              </div>

              {/* Order List */}
              <div className="d-flex flex-column gap-2">
                {orders.slice(0, 4).map((order) => {
                  const isPending = order.orderStatus === 'PENDING';
                  return (
                    <div
                      key={order.id}
                      className={`p-3 rounded-3 border ${isPending ? 'bg-warning bg-opacity-10 border-warning' : 'bg-light'}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-success">{order.id}</span>
                          {isPending && <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>NEW INCOMING</span>}
                        </div>
                        <span
                          className={`ardab-badge ${
                            order.orderStatus === 'DELIVERED'
                              ? 'badge-success-soft'
                              : order.orderStatus === 'IN_TRANSIT'
                              ? 'badge-info-soft'
                              : order.orderStatus === 'PENDING'
                              ? 'badge-danger-soft'
                              : 'badge-warning-soft'
                          }`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {order.orderStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                        <span>
                          <strong className="text-dark">{order.customerName}</strong> &bull; {order.city} ({order.deliveryZone})
                        </span>
                        <span className="fw-bold text-dark">{order.totalEtb.toLocaleString()} ETB</span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ fontSize: '0.75rem' }}>
                        <span className="text-muted text-truncate" style={{ maxWidth: '70%' }}>
                          <i className="bi bi-shop me-1 text-primary"></i>
                          Seller: {order.items[0]?.sellerName || 'Direct Ardab Hub'}
                        </span>
                        <Link href="/orders" className="text-success fw-semibold text-decoration-none">
                          {isPending ? 'Approve &rarr;' : 'Details &rarr;'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Active Deliveries & Load Capacity */}
          <div className="col-12 col-lg-5">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-truck text-success me-2"></i>
                    Deliveries &amp; Capacity
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Active 5,000 KG fleet delivery runs
                  </span>
                </div>
                <Link href="/deliveries" className="small text-success text-decoration-none fw-semibold">
                  All Deliveries &rarr;
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                {activeTrips.slice(0, 3).map((trip) => (
                  <div key={trip.id} className="p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark small">{trip.id}</span>
                      <span
                        className={`badge ${
                          trip.status === 'IN_PROGRESS' ? 'badge-info-soft' : 'badge-warning-soft'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                      {trip.vehicleRegistration} &bull; Driver: {trip.driverName}
                    </div>

                    <div className="d-flex justify-content-between small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                      <span>{trip.orderCount} Orders Assigned</span>
                      <span className="fw-semibold text-dark">
                        {trip.currentLoadKg.toLocaleString()} / 5,000 KG ({trip.utilizationPercentage}%)
                      </span>
                    </div>

                    <div className="ardab-progress mb-2" style={{ height: 6 }}>
                      <div
                        className="ardab-progress-bar bg-success"
                        style={{ width: `${trip.utilizationPercentage}%` }}
                      ></div>
                    </div>

                    <div className="d-flex gap-1 flex-wrap">
                      {trip.deliveryZones.map((z) => (
                        <span key={z} className="badge badge-info-soft" style={{ fontSize: '0.65rem' }}>
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Registered Suppliers & Posted Products with Sellers */}
        <div className="row g-3">
          {/* Registered Suppliers */}
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-building text-primary me-2"></i>
                    Registered Platform Suppliers
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Onboarded cooperatives and producers
                  </span>
                </div>
                <Link href="/suppliers" className="small text-success text-decoration-none fw-semibold">
                  Manage Suppliers &rarr;
                </Link>
              </div>

              <div className="d-flex flex-column gap-2">
                {suppliers.slice(0, 4).map((sup) => (
                  <div key={sup.id} className="p-2 px-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold text-dark small">{sup.companyName}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {sup.name} &bull; {sup.city} &bull; {sup.category}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge badge-success-soft" style={{ fontSize: '0.7rem' }}>
                        {sup.productCount} Products
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Posted Marketplace Products with Sellers */}
          <div className="col-12 col-lg-6">
            <div className="ardab-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-0">
                    <i className="bi bi-box-seam text-success me-2"></i>
                    Marketplace Products with Sellers
                  </h2>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Published commodities, prices, and discounts
                  </span>
                </div>
                <Link href="/products" className="small text-success text-decoration-none fw-semibold">
                  Post / Manage &rarr;
                </Link>
              </div>

              <div className="d-flex flex-column gap-2">
                {products.slice(0, 4).map((prod) => (
                  <div key={prod.id} className="p-2 px-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold text-dark small">{prod.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-shop me-1 text-primary"></i>
                        {prod.sellerName || 'Direct Ardab Hub'} &bull; {prod.weightKg} KG
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-dark small">{prod.sellingPrice.toLocaleString()} ETB</div>
                      {prod.discountPercent && prod.discountPercent > 0 ? (
                        <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>
                          {prod.discountPercent}% OFF
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>Standard</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Live Customer Web App Activity & Security Telemetry Stream */}
        <div className="row g-3 mt-1">
          <div className="col-12">
            <div className="ardab-card">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle bg-success d-inline-block"
                    style={{ width: '8px', height: '8px', animation: 'pulse 1.5s infinite' }}
                  ></div>
                  <div>
                    <h2 className="h6 fw-bold text-dark mb-0">
                      <i className="bi bi-broadcast text-info me-2"></i>
                      Live Customer Web App Activity &amp; Telemetry
                    </h2>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Real-time cross-platform events streamed from the customer shopping interface
                    </span>
                  </div>
                </div>
                <Link href="/subadmin/security" className="small text-success text-decoration-none fw-semibold">
                  Security Control Panel &rarr;
                </Link>
              </div>

              {customerWebEvents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr style={{ fontSize: '0.75rem' }}>
                        <th className="py-2">Event</th>
                        <th className="py-2">Actor / Customer</th>
                        <th className="py-2">Endpoint / Details</th>
                        <th className="py-2">IP &amp; Client</th>
                        <th className="py-2 text-end">Time</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.8rem' }}>
                      {customerWebEvents.map((evt) => (
                        <tr key={evt.id}>
                          <td>
                            <span className={`badge ${evt.eventType.includes('SUCCESS') || evt.eventType.includes('ORDER') ? 'bg-success' : evt.eventType.includes('FAILED') ? 'bg-danger' : 'bg-primary'}`}>
                              {evt.eventType.replace('CUSTOMER_', '')}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{evt.actorEmail || 'Customer User'}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{evt.actorType || 'CUSTOMER'}</small>
                          </td>
                          <td>
                            <span className="font-monospace small text-secondary">{evt.endpoint || '/'}</span>
                            {Boolean(evt.metadata && typeof evt.metadata === 'object' && 'searchQuery' in evt.metadata) && (
                              <div className="small text-muted">
                                Query: &quot;{String((evt.metadata as Record<string, any>).searchQuery)}&quot;
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="text-muted small">{evt.ipAddress || '127.0.0.1'}</div>
                            <small className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>CUSTOMER_WEB</small>
                          </td>
                          <td className="text-end text-muted small">
                            {new Date(evt.occurredAt || (evt as any).createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 bg-light rounded-3">
                  <i className="bi bi-activity fs-3 text-muted mb-2"></i>
                  <p className="text-muted small mb-0">No recent customer web events recorded. Activity streams automatically as customers browse and shop.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
