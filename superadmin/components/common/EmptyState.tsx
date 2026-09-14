'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = 'bi-inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-5 px-4 my-3 bg-light rounded-3 border border-dashed ${className}`}
    >
      <div
        className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm mb-3"
        style={{ width: '64px', height: '64px' }}
      >
        <i className={`bi ${icon} text-muted fs-2`} />
      </div>
      <h5 className="fw-bold text-dark mb-2">{title}</h5>
      <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '420px', fontSize: '0.925rem' }}>
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
          {actionLabel && onAction && (
            <button
              type="button"
              className="btn btn-sm btn-primary px-3 shadow-sm d-flex align-items-center gap-2"
              onClick={onAction}
            >
              <i className="bi bi-arrow-counterclockwise" />
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
