'use client';

import Image from 'next/image';
import { COMPANY } from '@/lib/company';

interface CompanyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  circle?: boolean;
}

export function CompanyLogo({ size = 44, className = '', showText = false, circle = false }: CompanyLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex-none overflow-hidden ${circle ? 'rounded-full' : 'rounded-xl'}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={COMPANY.logoSvg}
          alt={COMPANY.name}
          width={size}
          height={size}
          priority
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="min-w-0">
          <p className="font-bold leading-tight text-gray-900" style={{ fontSize: Math.max(13, size * 0.34) }}>
            MOHD.HMS
          </p>
          <p
            className="text-green-600 font-semibold tracking-[0.22em]"
            style={{ fontSize: Math.max(9, size * 0.22), marginTop: 2 }}
          >
            ENTERPRISE
          </p>
        </div>
      )}
    </div>
  );
}