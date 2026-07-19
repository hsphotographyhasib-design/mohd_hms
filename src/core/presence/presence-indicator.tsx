'use client';

import { CircleDot } from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { usePresenceStatus, formatLastSeen } from './use-presence-status';

interface PresenceIndicatorProps {
  userId: string | undefined;
  dbIsOnline?: boolean;
  showLabel?: boolean;
  showLastSeen?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function PresenceIndicator({
  userId,
  dbIsOnline,
  showLabel,
  showLastSeen,
  className,
  size = 'sm',
}: PresenceIndicatorProps) {
  const { status, lastSeen } = usePresenceStatus(userId, dbIsOnline);

  const colorMap = {
    online: 'bg-emerald-500 text-emerald-500',
    away: 'bg-amber-400 text-amber-400',
    offline: 'bg-gray-400 text-gray-400',
  };

  const labelMap = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  const dotSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('relative flex', dotSize)}>
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            colorMap[status],
          )}
        />
        <CircleDot
          className={cn(
            'relative inline-flex rounded-full',
            colorMap[status],
            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
          )}
        />
      </span>
      {showLabel && (
        <span className={cn('text-xs font-medium', colorMap[status])}>{labelMap[status]}</span>
      )}
      {showLastSeen && status !== 'online' && lastSeen && (
        <span className="text-xs text-muted-foreground">Last seen: {formatLastSeen(lastSeen)}</span>
      )}
    </div>
  );
}