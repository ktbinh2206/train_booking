'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  minutes?: number;
  expiresAtISO?: string | null;
  onExpire?: () => void;
}

function getInitialTimeLeft(minutes: number, expiresAtISO?: string | null) {
  if (!expiresAtISO) {
    return minutes * 60;
  }

  const expiresAt = new Date(expiresAtISO).getTime();
  if (!Number.isFinite(expiresAt)) {
    return minutes * 60;
  }

  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

export function CountdownTimer({ minutes = 5, expiresAtISO, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getInitialTimeLeft(minutes, expiresAtISO));

  useEffect(() => {
    setTimeLeft(getInitialTimeLeft(minutes, expiresAtISO));

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtISO, minutes, onExpire]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isExpiringSoon = timeLeft <= 60;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
        isExpiringSoon
          ? 'bg-red-50 border border-red-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      {isExpiringSoon ? (
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
      ) : (
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className={`text-sm font-medium ${isExpiringSoon ? 'text-red-900' : 'text-blue-900'}`}>
          {isExpiringSoon ? 'Booking expires soon' : 'Booking hold expires in'}
        </p>
        <p className={`text-xs ${isExpiringSoon ? 'text-red-700' : 'text-blue-700'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
