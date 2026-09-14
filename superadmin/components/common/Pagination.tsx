'use client';

import React from 'react';
import { PAGE_SIZE_OPTIONS } from '@/lib/constants';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[] | number[];
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className = '',
}: PaginationProps) {
  if (totalRecords === 0) return null;

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate pagination items with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 pt-3 border-top ${className}`}
    >
      {/* Record info & page size */}
      <div className="d-flex align-items-center gap-3 text-muted small">
        <span>
          Showing <strong className="text-dark">{startRecord}</strong> to{' '}
          <strong className="text-dark">{endRecord}</strong> of{' '}
          <strong className="text-dark">{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div className="d-flex align-items-center gap-1">
            <span>Show</span>
            <select
              className="form-select form-select-sm py-1 px-2"
              style={{ width: 'auto' }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Records per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav aria-label="Table navigation">
          <ul className="pagination pagination-sm mb-0">
            {/* Previous */}
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <i className="bi bi-chevron-left" />
              </button>
            </li>

            {/* Pages */}
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <li key={`ellipsis-${idx}`} className="page-item disabled">
                    <span className="page-link border-0 text-muted">&hellip;</span>
                  </li>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPage;
              return (
                <li
                  key={pageNum}
                  className={`page-item ${isActive ? 'active' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() => onPageChange(pageNum)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                </li>
              );
            })}

            {/* Next */}
            <li
              className={`page-item ${
                currentPage === totalPages ? 'disabled' : ''
              }`}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
