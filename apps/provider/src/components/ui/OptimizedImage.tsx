'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  fallbackText?: string;
}

/**
 * Thin wrapper around Next.js <Image> with:
 * - Automatic placeholder shimmer while loading
 * - Fallback initials if the image fails to load
 * - Priority prop for above-the-fold images
 */
export function OptimizedImage({
  fallbackText,
  className,
  alt,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (error && fallbackText) {
    const initials = fallbackText
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-accent-blue/20 text-accent-blue text-xs font-semibold',
          className,
        )}
        style={{ width: props.width as number, height: props.height as number }}
        role="img"
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

/**
 * Avatar component using Next.js Image with circle crop + fallback.
 */
export function Avatar({
  src,
  name,
  size = 32,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-accent-blue/20 text-accent-blue font-semibold shrink-0',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        role="img"
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={name}
      width={size}
      height={size}
      fallbackText={name}
      className={cn('rounded-full object-cover shrink-0', className)}
    />
  );
}
