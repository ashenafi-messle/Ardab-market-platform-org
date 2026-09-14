'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to an error reporting service if available
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-4">
      <div className="card border-0 shadow-sm p-4 p-md-5 text-center" style={{ maxWidth: '520px', borderRadius: '1rem' }}>
        <div className="d-flex justify-content-center mb-4">
          <ArdabLogo size={48} />
        </div>

        <div
          className="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mx-auto mb-3"
          style={{ width: '64px', height: '64px' }}
        >
          <i className="bi bi-exclamation-triangle-fill fs-2" />
        </div>

        <h3 className="fw-bold text-dark mb-2">Something Went Wrong</h3>
        <p className="text-muted mb-4 small">
          An unexpected error occurred while processing your request. Our engineering team has been notified.
          {error.digest && (
            <span className="d-block mt-1 font-monospace text-secondary">
              Ref ID: {error.digest}
            </span>
          )}
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <button
            type="button"
            className="btn btn-primary px-4 d-flex align-items-center justify-content-center gap-2"
            onClick={() => reset()}
          >
            <i className="bi bi-arrow-clockwise" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="btn btn-outline-secondary px-4 d-flex align-items-center justify-content-center gap-2"
          >
            <i className="bi bi-house" />
            Dashboard
          </Link>
        </div>
      </div>
      <p className="text-muted small mt-4 text-center">
        Ardab Market Platform &copy; 2026 &bull; Production Infrastructure
      </p>
    </div>
  );
}
