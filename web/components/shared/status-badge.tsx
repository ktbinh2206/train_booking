import { STATUS_COLORS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  variant?: 'solid' | 'outline';
}

export function StatusBadge({ status, variant = 'solid' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;

  if (variant === 'outline') {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
