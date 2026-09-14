'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSubmittedEmail(email);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light p-3">
      <div className="w-100" style={{ maxWidth: '480px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <ArdabLogo size={50} textSize="fs-4" href="/" subtitle="PASSWORD RECOVERY" />
        </div>

        {/* Card */}
        <div className="ardab-card p-4 p-sm-5 shadow-sm">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-4">
                <div
                  className="ardab-icon-box icon-box-green mx-auto mb-3"
                  style={{ width: 56, height: 56, fontSize: '1.5rem' }}
                >
                  <i className="bi bi-key-fill"></i>
                </div>
                <h1 className="h4 fw-bold text-dark mb-1">Forgot Password</h1>
                <p className="text-muted small mb-0">
                  Enter your registered Super Admin email address and we will generate a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="form-label">
                    Super Admin Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="admin@ardabmarket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-ardab-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill"></i>
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link href="/login" className="small text-muted text-decoration-none">
                    <i className="bi bi-arrow-left me-1"></i> Back to Login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <div
                className="ardab-icon-box icon-box-green mx-auto mb-3"
                style={{ width: 64, height: 64, fontSize: '1.75rem' }}
              >
                <i className="bi bi-envelope-check-fill"></i>
              </div>
              <h2 className="h4 fw-bold text-dark mb-2">Check Your Inbox</h2>
              <div className="alert alert-success p-3 rounded-3 small text-start mb-4">
                <i className="bi bi-shield-lock-fill me-2 text-success"></i>
                If an account exists for <strong>{submittedEmail}</strong>, a password reset link has been dispatched.
              </div>
              <p className="text-muted small mb-4">
                For security reasons, we do not confirm whether this address is registered to a Super Admin. Please review your email inbox and spam folder.
              </p>
              <div className="d-flex flex-column gap-2">
                <Link href="/login" className="btn btn-ardab-outline btn-sm">
                  Return to Admin Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
