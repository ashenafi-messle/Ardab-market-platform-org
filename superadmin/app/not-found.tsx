import React from 'react';
import Link from 'next/link';
import ArdabLogo from '@/components/common/ArdabLogo';

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-4">
      <div className="card border-0 shadow-sm p-4 p-md-5 text-center" style={{ maxWidth: '520px', borderRadius: '1rem' }}>
        <div className="d-flex justify-content-center mb-4">
          <ArdabLogo size={48} />
        </div>

        <div className="display-1 fw-bold text-primary mb-2" style={{ lineHeight: 1 }}>
          404
        </div>

        <h4 className="fw-bold text-dark mb-2">Resource Not Found</h4>
        <p className="text-muted mb-4 small">
          The page or operational resource you requested does not exist or has been relocated within the Ardab Platform.
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link
            href="/dashboard"
            className="btn btn-primary px-4 d-flex align-items-center justify-content-center gap-2"
          >
            <i className="bi bi-house" />
            Return to Dashboard
          </Link>
          <Link
            href="/login"
            className="btn btn-outline-secondary px-4 d-flex align-items-center justify-content-center gap-2"
          >
            <i className="bi bi-box-arrow-in-right" />
            Switch Account
          </Link>
        </div>
      </div>
      <p className="text-muted small mt-4 text-center">
        Ardab Market Platform &copy; 2026 &bull; Ethiopian Commerce Network
      </p>
    </div>
  );
}
