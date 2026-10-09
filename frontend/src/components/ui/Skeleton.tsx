import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-md)',
  className = '',
  style,
  ...props
}: SkeletonProps) => {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{ width, height, borderRadius, ...style }}
      {...props}
    />
  );
};
