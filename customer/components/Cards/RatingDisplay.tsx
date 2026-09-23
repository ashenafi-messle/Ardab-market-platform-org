'use client';

interface RatingDisplayProps {
  average: number;
  count: number;
}

export function RatingDisplay({ average, count }: RatingDisplayProps) {
  const normalizedAverage = Math.round(average * 2) / 2;

  return (
    <div
      className="d-flex align-items-center gap-1"
      aria-label={`${average.toFixed(1)} out of 5 from ${count} reviews`}
    >
      <span className="d-inline-flex text-warning" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const icon = normalizedAverage >= star
            ? 'bi-star-fill'
            : normalizedAverage >= star - 0.5
              ? 'bi-star-half'
              : 'bi-star';
          return <i key={star} className={`bi ${icon}`}></i>;
        })}
      </span>
      <span className="fw-semibold small">{average.toFixed(1)}</span>
      <span className="text-muted small">({count})</span>
    </div>
  );
}

export default RatingDisplay;
