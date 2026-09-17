'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, citiesApi, searchApi, ApiResponseError } from '@/lib/api';
import { NotificationSummary } from '@/types/notification';

interface AdminHeaderProps {
  onToggleMobileMenu: () => void;
}

export default function AdminHeader({ onToggleMobileMenu }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, selectedCity, setSelectedCity, logout } = useAuth();
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [cities, setCities] = useState<string[]>(['All Cities', 'Gondar', 'Bahir Dar', 'Addis Ababa']);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, { id: string; title: string; subtitle?: string; meta?: string; href?: string }[]>>({});
  const [searchTotal, setSearchTotal] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary | null>(null);

  // Load operational cities from API
  useEffect(() => {
    citiesApi.getCityNames().then(setCities).catch(() => {
      // Keep default fallback already in state
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    async function fetchNotifications() {
      try {
        const res = await notificationsApi.getSummary();
        if (!isCancelled) {
          setNotificationSummary(res);
        }
      } catch (err: unknown) {
        if (
          err instanceof ApiResponseError &&
          (err.statusCode === 401 ||
            err.code === 'SESSION_EXPIRED' ||
            err.code === 'SESSION_REVOKED' ||
            err.code === 'TOKEN_EXPIRED')
        ) {
          return;
        }
        console.error('Failed to load notifications', err);
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Debounced global search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!q || q.trim().length < 2) {
      setSearchResults({});
      setSearchTotal(0);
      setShowSearchResults(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchApi.search(q, { limit: 4 });
        setSearchResults(res.results);
        setSearchTotal(res.totalMatches);
        setShowSearchResults(true);
      } catch {
        setSearchResults({});
        setSearchTotal(0);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleSearchResultClick = (href?: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (href) router.push(href);
  };

  const isSubRoute = pathname?.startsWith('/subadmin');
  const isSubAdmin = user?.role === 'SUB_ADMIN' || (!user && isSubRoute);
  const displayName = user?.name || (isSubAdmin ? 'Sub Admin' : 'Super Admin');
  const displayEmail = user?.email || (isSubAdmin ? 'subadmin@ardabmarket.com' : 'admin@ardabmarket.com');
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : isSubAdmin
    ? 'SA'
    : 'AD';

  const cityRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notificationSummary?.unreadCount || 0;
  const recentAlerts = notificationSummary?.recentAlerts || [];
  const allSearchResults = Object.values(searchResults).flat();

  return (
    <header className="ardab-header d-flex align-items-center justify-content-between px-3 px-lg-4">
      {/* Left side: Hamburger & Global City Selector */}
      <div className="d-flex align-items-center gap-3">
        <button
          type="button"
          className="btn btn-outline-secondary d-lg-none border-0 p-1"
          onClick={onToggleMobileMenu}
          aria-label="Open Navigation"
        >
          <i className="bi bi-list fs-3 text-dark"></i>
        </button>

        {/* Multi-City Scope Selector */}
        <div className="position-relative" ref={cityRef}>
          <button
            type="button"
            className="btn btn-sm btn-ardab-outline d-flex align-items-center gap-2"
            onClick={() => setShowCityDropdown(!showCityDropdown)}
          >
            <i className="bi bi-geo-alt-fill text-success"></i>
            <span className="fw-semibold text-dark">{selectedCity}</span>
            <i className="bi bi-chevron-down text-muted" style={{ fontSize: '0.75rem' }}></i>
          </button>

          {showCityDropdown && (
            <div
              className="position-absolute shadow-sm bg-white rounded-3 border py-1 mt-1 start-0"
              style={{ zIndex: 1050, minWidth: '180px' }}
            >
              <div className="px-3 py-1 text-muted small fw-semibold">OPERATIONAL CITY</div>
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`dropdown-item px-3 py-2 text-start w-100 border-0 bg-transparent d-flex align-items-center justify-content-between ${
                    selectedCity === city ? 'fw-bold text-success' : 'text-dark'
                  }`}
                  onClick={() => {
                    setSelectedCity(city);
                    setShowCityDropdown(false);
                  }}
                >
                  <span>{city}</span>
                  {selectedCity === city && <i className="bi bi-check-lg text-success"></i>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Search, Notifications & Admin Profile */}
      <div className="d-flex align-items-center gap-3">
        {/* Global Operational Search */}
        <div className="d-none d-md-flex align-items-center position-relative" style={{ width: 260 }} ref={searchRef}>
          <i className="bi bi-search position-absolute start-0 ms-3 text-muted" style={{ fontSize: '0.9rem', zIndex: 2 }}></i>
          {isSearching && (
            <div className="position-absolute end-0 me-3" style={{ zIndex: 2 }}>
              <div className="spinner-border spinner-border-sm text-secondary" style={{ width: 14, height: 14 }} role="status"><span className="visually-hidden">Searching...</span></div>
            </div>
          )}
          <input
            type="text"
            className="form-control form-control-sm ps-5 bg-light"
            placeholder="Search orders, trips, drivers..."
            style={{ borderRadius: 20 }}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.length >= 2) setShowSearchResults(true); }}
          />

          {/* Search Results Dropdown */}
          {showSearchResults && allSearchResults.length > 0 && (
            <div
              className="position-absolute bg-white shadow-lg rounded-3 border py-1 mt-1 top-100 start-0"
              style={{ zIndex: 1055, width: 340, maxHeight: 400, overflowY: 'auto' }}
            >
              <div className="px-3 py-1 border-bottom d-flex justify-content-between align-items-center">
                <span className="text-muted small fw-semibold">{searchTotal} result{searchTotal !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</span>
              </div>
              {Object.entries(searchResults).map(([type, items]) =>
                items.length > 0 ? (
                  <div key={type}>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{type}</span>
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-100 text-start border-0 bg-transparent px-3 py-2 d-flex align-items-start gap-2 search-result-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSearchResultClick(item.href)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <i className="bi bi-arrow-right-circle text-success mt-1" style={{ fontSize: '0.8rem' }}></i>
                        <div className="lh-sm">
                          <div className="fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>{item.title}</div>
                          {item.subtitle && <div className="text-muted" style={{ fontSize: '0.72rem' }}>{item.subtitle}</div>}
                          {item.meta && <div className="text-muted" style={{ fontSize: '0.68rem' }}>{item.meta}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="position-relative" ref={notifRef}>
          <button
            type="button"
            className="btn btn-light position-relative rounded-circle d-flex align-items-center justify-content-center border"
            style={{ width: 40, height: 40 }}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <i className="bi bi-bell text-dark"></i>
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.65rem' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="position-absolute shadow-lg bg-white rounded-3 border p-0 mt-2 end-0"
              style={{ zIndex: 1050, width: '320px', maxWidth: '90vw' }}
            >
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                <span className="fw-bold text-dark">Operational Alerts</span>
                <span className="badge badge-success-soft">{unreadCount} new</span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                {recentAlerts.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No recent alerts</div>
                ) : (
                  recentAlerts.map((n) => (
                    <div key={n.id} className={`p-3 border-bottom ${n.isRead ? 'bg-white' : 'bg-light'}`}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold text-dark small">{n.title}</span>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted small mb-0 lh-sm">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-center bg-light rounded-bottom">
                <Link
                  href="/notifications"
                  className="small fw-semibold text-success text-decoration-none"
                  onClick={() => setShowNotifications(false)}
                >
                  View All Notifications &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="position-relative" ref={userRef}>
          <button
            type="button"
            className="btn btn-light d-flex align-items-center gap-2 p-1 pe-2 rounded-pill border"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: 32,
                height: 32,
                backgroundColor: isSubAdmin ? '#0d9488' : 'var(--ardab-green)',
                fontSize: '0.85rem',
              }}
              suppressHydrationWarning
            >
              {userInitials}
            </div>
            <div className="d-none d-sm-block text-start lh-1">
              <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }} suppressHydrationWarning>
                {displayName}
              </div>
              <span className="text-muted" style={{ fontSize: '0.7rem' }} suppressHydrationWarning>
                {isSubAdmin ? 'Sub Admin' : 'Super Admin'}
              </span>
            </div>
            <i className="bi bi-chevron-down text-muted ms-1" style={{ fontSize: '0.75rem' }}></i>
          </button>

          {showUserDropdown && (
            <div
              className="position-absolute shadow-sm bg-white rounded-3 border py-1 mt-2 end-0"
              style={{ zIndex: 1050, minWidth: '210px' }}
            >
              <div className="px-3 py-2 border-bottom">
                <div className="fw-bold text-dark" suppressHydrationWarning>
                  {displayName}
                </div>
                <div className="text-muted small text-truncate" suppressHydrationWarning>
                  {displayEmail}
                </div>
                <span className="badge mt-1 badge-neutral-soft" style={{ fontSize: '0.65rem' }}>
                  {isSubAdmin ? 'SUB ADMIN' : 'SUPER ADMIN'}
                </span>
              </div>
              {isSubAdmin && (
                <Link
                  href="/subadmin/security"
                  className="dropdown-item px-3 py-2 d-flex align-items-center gap-2 text-dark text-decoration-none"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <i className="bi bi-shield-lock text-muted"></i>
                  <span>Security &amp; Super Admins</span>
                </Link>
              )}
              <div className="dropdown-divider my-1"></div>
              <button
                type="button"
                className="dropdown-item px-3 py-2 d-flex align-items-center gap-2 text-danger w-100 border-0 bg-transparent"
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
