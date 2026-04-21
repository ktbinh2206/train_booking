import Link from 'next/link';
import { Trip } from '@/lib/types';
import { StatusBadge } from '@/components/shared/status-badge';
import { Clock, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyVND, formatDateVn } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {trip.source} → {trip.destination}
            </h3>
            <StatusBadge status={trip.status} />
          </div>
          <p className="text-sm text-gray-500">
            Tàu {trip.trainNumber} • {trip.trainName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
        {/* Departure */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Khởi hành</p>
          <p className="font-semibold text-gray-900">{trip.departureTime}</p>
          {trip.status === 'delayed' && trip.delayedDepartureTime && (
            <p className="text-xs text-amber-600">Dời sang: {new Date(trip.delayedDepartureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
          )}
          <p className="text-xs text-gray-500">
            {formatDateVn(trip.date)}
          </p>
        </div>

        {/* Duration */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Thời gian</p>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="font-semibold text-gray-900">{trip.duration}</p>
          </div>
          <p className="text-xs text-gray-500">{trip.distance} km</p>
        </div>

        {/* Arrival */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Đến nơi</p>
          <p className="font-semibold text-gray-900">{trip.arrivalTime}</p>
        </div>

        {/* Seats */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Ghế trống</p>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="font-semibold text-gray-900">{trip.availableSeats}</p>
          </div>
          <p className="text-xs text-gray-500">/ {trip.totalSeats} ghế</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Từ</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrencyVND(trip.basePrice)}</p>
        </div>
        <Link href={`/trip/${trip.id}`}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Xem và đặt
          </Button>
        </Link>
      </div>
    </div>
  );
}
