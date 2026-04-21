'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listStations } from '@/lib/api';
import { SearchableSelect } from '@/components/shared/searchable-select';

type Station = {
  id: string;
  code: string;
  name: string;
  city: string;
  label: string;
};

type StationSearchSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  exclude?: string;
};

export function StationSearchSelect({ label, value, placeholder, onChange, exclude }: StationSearchSelectProps) {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const data = await listStations();

        if (active) {
          setStations(data);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () => stations
      .filter((station) => !exclude || station.id !== exclude)
      .map((station) => ({ value: station.id, label: station.label })),
    [stations, exclude]
  );
  
  if (loading) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
        <div className="h-10 rounded-md border border-gray-300 px-3 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách ga...
        </div>
      </div>
    );
  }

  return (
    <SearchableSelect
      label={label}
      placeholder={placeholder}
      value={value}
      options={options}
      onChange={onChange}
      searchPlaceholder="Tìm ga..."
      emptyText="Không tìm thấy ga phù hợp."
    />
  );
}
