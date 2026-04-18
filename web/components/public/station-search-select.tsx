'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { listStations } from '@/lib/api';
import { cn } from '@/lib/utils';

type StationSearchSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  exclude?: string;
};

export function StationSearchSelect({ label, value, placeholder, onChange, exclude }: StationSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<string[]>([]);

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
    () => stations.filter((station) => !exclude || station.toLowerCase() !== exclude.toLowerCase()),
    [stations, exclude]
  );

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm ga..." />
            <CommandList>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách ga...
                </div>
              ) : (
                <>
                  <CommandEmpty>Không tìm thấy ga phù hợp.</CommandEmpty>
                  <CommandGroup>
                    {options.map((station) => (
                      <CommandItem
                        key={station}
                        value={station}
                        onSelect={() => {
                          onChange(station);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', value === station ? 'opacity-100' : 'opacity-0')} />
                        {station}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
