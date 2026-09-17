'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === 'true') {
        setSessionExpiredNotice(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login({ email, password });
      if (res.success && res.user) {
        if (res.user.role === 'SUB_ADMIN') {
          router.push('/subadmin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubAdminEmail = email.toLowerCase().includes('subadmin');

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center bg-light py-4 px-3">
      <div className="container" style={{ maxWidth: '980px' }}>
        <div className="ardab-card p-0 shadow-md border overflow-hidden">
          <div className="row g-0">
            {/* Left Branding Side (Desktop only) */}
            <div
              className="col-lg-5 d-none d-lg-flex flex-column justify-content-between p-5 text-white"
              style={{
                background: isSubAdminEmail
                  ? 'linear-gradient(145deg, #0d9488 0%, #0284c7 100%)'
                  : 'linear-gradient(145deg, var(--ardab-green) 0%, var(--ardab-teal) 100%)',
              }}
            >
              <div>
                <div className="mb-4">
                  <ArdabLogo
                    size={52}
                    textSize="fs-4"
                    href="/"
                    badgeType={isSubAdminEmail ? 'sub' : 'super'}
                    light={true}
                  />
                </div>

                <h2 className="fw-bold fs-3 text-white mb-3">
                  {isSubAdminEmail ? 'Operational Support & System Health' : 'Central Operational Intelligence'}
                </h2>
                <p className="text-white-50 small mb-4">
                  {isSubAdminEmail
                    ? 'Dedicated management portal for Customer Support tickets, platform Security audits, system Maintenance health, and user Feedback.'
                    : 'Manage marketplace operations, city delivery hubs, 5,000 KG fleet capacity, and driver logistics across Gondar, Bahir Dar, and Addis Ababa.'}
                </p>

                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-25">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-shield-check fs-5"></i>
                    <span className="fw-semibold small">Role-Based Access Gateway</span>
                  </div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                    Authenticates Super Admin and Sub Admin accounts with automated secure redirection.
                  </div>
                </div>
              </div>

              <div className="text-white-50 small pt-4 border-top border-white border-opacity-25" style={{ fontSize: '0.75rem' }}>
                &copy; {new Date().getFullYear()} Ardab Market Platform. All rights reserved.
              </div>
            </div>

            {/* Right Login Form Side */}
            <div className="col-lg-7 p-4 p-sm-5 bg-white d-flex flex-column justify-content-center">
              <div className="mb-4">
                {/* Brand Header */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <ArdabLogo size={46} textSize="fs-5" href="/" subtitle="Central Management Portal" />
                  <span className={`badge ${isSubAdminEmail ? 'badge-info-soft' : 'badge-success-soft'}`}>
                    {isSubAdminEmail ? 'Sub Admin' : 'Super Admin'}
                  </span>
                </div>

                <h1 className="h4 fw-bold text-dark mb-1">Platform Admin Login</h1>
                <p className="text-muted small mb-0">
                  Enter your credentials to access your designated administration portal.
                </p>
              </div>

              {sessionExpiredNotice && !errorMessage && (
                <div className="alert alert-warning d-flex align-items-center gap-2 p-3 rounded-3 mb-4 border-warning" role="alert">
                  <i className="bi bi-clock-history flex-shrink-0 fs-5 text-warning"></i>
                  <div className="small">Your session has expired. Please sign in again to continue.</div>
                </div>
              )}

              {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center gap-2 p-3 rounded-3 mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                  <div className="small">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark mb-1" htmlFor="email">
                    Administrator Email Address
                  </label>
                  <div className="position-relative">
                    <i className="bi bi-envelope position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                    <input
                      type="email"
                      id="email"
                      className="form-control ps-5"
                      placeholder="Enter administrator email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-dark mb-0" htmlFor="password">
                      Security Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-muted small text-decoration-none hover-underline"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="position-relative">
                    <i className="bi bi-lock position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className="form-control ps-5 pe-5"
                      placeholder="Enter administrator password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn position-absolute end-0 top-50 translate-middle-y border-0 text-muted p-2 me-1"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label className="form-check-label small text-muted" htmlFor="rememberMe">
                      Keep me signed in
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-ardab-primary w-100 py-2 fs-6 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying &amp; Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In ({isSubAdminEmail ? 'Sub Admin' : 'Super Admin'})</span>
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
