'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import ArdabLogo from '@/components/common/ArdabLogo';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('This password reset link is invalid or missing a security token.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Failed to reset password. Link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !isSuccess) {
    return (
      <div className="text-center py-2">
        <div
          className="ardab-icon-box icon-box-red mx-auto mb-3"
          style={{ width: 56, height: 56, fontSize: '1.5rem', backgroundColor: '#fee2e2', color: '#dc2626' }}
        >
          <i className="bi bi-exclamation-octagon-fill"></i>
        </div>
        <h1 className="h4 fw-bold text-dark mb-2">Invalid Reset Link</h1>
        <p className="text-muted small mb-4">
          This password reset link is missing a security token or is malformed. Please request a new link.
        </p>
        <div className="d-flex flex-column gap-2">
          <Link href="/forgot-password" className="btn btn-ardab-primary btn-sm">
            Request New Reset Link
          </Link>
          <Link href="/login" className="btn btn-ardab-outline btn-sm">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return !isSuccess ? (
    <>
      <div className="text-center mb-4">
        <div
          className="ardab-icon-box icon-box-teal mx-auto mb-3"
          style={{ width: 56, height: 56, fontSize: '1.5rem' }}
        >
          <i className="bi bi-shield-lock-fill"></i>
        </div>
        <h1 className="h4 fw-bold text-dark mb-1">Set New Password</h1>
        <p className="text-muted small mb-0">
          Please create a strong new password for your Super Admin access.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-danger p-3 rounded-3 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="newPassword" className="form-label">
            New Password (min. 8 characters)
          </label>
          <div className="position-relative">
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              className="form-control pe-5"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label="Toggle password view"
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            className="form-control"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
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
              <span>Resetting Password...</span>
            </>
          ) : (
            <>
              <i className="bi bi-check-circle-fill"></i>
              <span>Save New Password</span>
            </>
          )}
        </button>

        <div className="text-center">
          <Link href="/login" className="small text-muted text-decoration-none">
            <i className="bi bi-arrow-left me-1"></i> Cancel &amp; Return to Login
          </Link>
        </div>
      </form>
    </>
  ) : (
    <div className="text-center py-3">
      <div
        className="ardab-icon-box icon-box-green mx-auto mb-3"
        style={{ width: 64, height: 64, fontSize: '1.75rem' }}
      >
        <i className="bi bi-check-circle-fill"></i>
      </div>
      <h2 className="h4 fw-bold text-dark mb-2">Password Updated!</h2>
      <p className="text-muted small mb-4">
        Your Super Admin password has been successfully reset. Redirecting you to login...
      </p>
      <Link href="/login" className="btn btn-ardab-primary w-100">
        Go to Login Now
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light p-3">
      <div className="w-100" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <ArdabLogo size={50} textSize="fs-4" href="/" subtitle="NEW CREDENTIALS" />
        </div>
        <div className="ardab-card p-4 p-sm-5 shadow-sm">
          <Suspense
            fallback={
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span className="text-muted small">Loading security form...</span>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
