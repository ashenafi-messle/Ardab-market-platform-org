'use client';

import React from 'react';

export interface RatingDisplayProps {
  average: number | string | null | undefined;
  count: number | string | null | undefined;
  showCount?: boolean;
}

export function RatingDisplay({ average, count, showCount = true }: RatingDisplayProps) {
  const numCount = typeof count === 'number' ? count : parseInt(String(count || 0), 10) || 0;
  const rawAvg = typeof average === 'number' ? average : parseFloat(String(average || 0));
  const numAvg = isNaN(rawAvg) ? 0 : rawAvg;

  if (numCount === 0 || numAvg <= 0) {
    return <span className="text-muted small">No ratings yet</span>;
  }

  // Round to nearest 0.5 for authoritative five-star visual system
  const normalizedAverage = Math.round(numAvg * 2) / 2;
  const formattedAverage = numAvg.toFixed(1);

  return (
    <div
      className="d-flex align-items-center gap-1 text-nowrap"
      aria-label={`${formattedAverage} out of 5 from ${numCount} ${numCount === 1 ? 'review' : 'reviews'}`}
    >
      <span className="d-inline-flex text-warning" aria-hidden="true" style={{ fontSize: '0.82rem' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const icon =
            normalizedAverage >= star
              ? 'bi-star-fill'
              : normalizedAverage >= star - 0.5
                ? 'bi-star-half'
                : 'bi-star';
          return <i key={star} className={`bi ${icon}`}></i>;
        })}
      </span>
      <span className="fw-semibold small ms-1">{formattedAverage}</span>
      {showCount && <span className="text-muted small ms-1">({numCount})</span>}
    </div>
  );
}

export default RatingDisplay;

