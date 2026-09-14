'use client';

import React from 'react';

export type ConfirmationVariant = 'danger' | 'warning' | 'primary' | 'success';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  affectedItemsCount?: number;
  affectedItemNames?: string[];
  isIrreversible?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  affectedItemsCount,
  affectedItemNames,
  isIrreversible = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          headerBg: 'bg-danger text-white',
          btnClass: 'btn-danger',
          icon: 'bi-exclamation-triangle-fill',
          iconColor: 'text-danger',
        };
      case 'warning':
        return {
          headerBg: 'bg-warning text-dark',
          btnClass: 'btn-warning text-dark',
          icon: 'bi-exclamation-circle-fill',
          iconColor: 'text-warning',
        };
      case 'success':
        return {
          headerBg: 'bg-success text-white',
          btnClass: 'btn-success',
          icon: 'bi-check-circle-fill',
          iconColor: 'text-success',
        };
      case 'primary':
      default:
        return {
          headerBg: 'bg-primary text-white',
          btnClass: 'btn-primary',
          icon: 'bi-info-circle-fill',
          iconColor: 'text-primary',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060 }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content shadow-lg border-0">
            {/* Header */}
            <div className={`modal-header ${styles.headerBg} py-3`}>
              <h5 className="modal-title fs-6 fw-bold d-flex align-items-center gap-2" id="confirmation-modal-title">
                <i className={`bi ${styles.icon}`} />
                {title}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onCancel}
                disabled={isLoading}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              <p className="text-secondary mb-3">{message}</p>

              {/* Affected Items Details */}
              {affectedItemsCount !== undefined && affectedItemsCount > 0 && (
                <div className="alert alert-light border p-2 mb-3 small">
                  <div className="fw-semibold text-dark">
                    <i className="bi bi-layers me-1" />
                    Target Records: {affectedItemsCount} item{affectedItemsCount > 1 ? 's' : ''}
                  </div>
                  {affectedItemNames && affectedItemNames.length > 0 && (
                    <ul className="mb-0 mt-1 ps-3 text-muted">
                      {affectedItemNames.slice(0, 5).map((name, i) => (
                        <li key={i} className="text-truncate" style={{ maxWidth: '350px' }}>
                          {name}
                        </li>
                      ))}
                      {affectedItemNames.length > 5 && (
                        <li>and {affectedItemNames.length - 5} more...</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Irreversible notice */}
              {isIrreversible && (
                <div className="alert alert-danger py-2 px-3 mb-0 small d-flex align-items-center gap-2">
                  <i className="bi bi-shield-slash-fill fs-6" />
                  <div>
                    <strong>Irreversible Action:</strong> This operation cannot be undone.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer bg-light py-2 px-4 border-top">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${styles.btnClass} px-3 d-flex align-items-center gap-2`}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading && (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
