import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  height?: number;
}

export default function TableSkeleton({
  rows = 5,
  columns = 5,
  height = 20,
}: TableSkeletonProps) {
  return (
    <tbody className="placeholder-glow">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={`skeleton-col-${cIdx}`} className="py-3 align-middle">
              <span
                className="placeholder col-12 rounded"
                style={{
                  height: `${height}px`,
                  display: 'inline-block',
                  opacity: 0.15 + (cIdx % 3) * 0.08,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
