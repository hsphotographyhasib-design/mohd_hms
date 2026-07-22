'use client';

import { BrandLogo } from '@/shared/components/brand/brand-logo';

interface CompanyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  circle?: boolean;
}

export function CompanyLogo({ size = 44, className = '', showText = false, circle = false }: CompanyLogoProps) {
  const sizeVariant = size <= 20 ? 'xs' : size <= 28 ? 'sm' : size <= 40 ? 'md' : 'lg';

  if (!showText) {
    return (
      <div className={`flex-none overflow-hidden ${circle ? 'rounded-full' : 'rounded-xl'}`} style={{ width: size, height: size }}>
        <div className="w-full h-full flex items-center justify-center">
          <BrandLogo variant="icon" size={sizeVariant} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandLogo variant="full" size={sizeVariant} compact />
    </div>
  );
}