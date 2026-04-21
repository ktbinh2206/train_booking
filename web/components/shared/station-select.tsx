'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type StationOption = {
  id: string;
  name: string;
  code: string;
};

type StationSelectProps = {
  label: string;
  placeholder: string;
  value: string; // stationId
  options: StationOption[];
  onChange: (stationId: string) => void;
  emptyText?: string;
  searchPlaceholder?: string;
};

/**
 * Component cho phép chọn ga
 * Hiển thị: station.name (ví dụ: "Hà Nội")
 * Lưu giá trị: station.id
 */
export function StationSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  emptyText = 'Không có ga nào',
  searchPlaceholder = 'Tìm ga...'
}: StationSelectProps) {
  const [open, setOpen] = useState(false);

  // Tìm station được chọn bằng ID
  const selectedLabel = useMemo(() => {
    const found = options.find((option) => option.id === value);
    return found ? found.name : placeholder;
  }, [options, placeholder, value]);

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
            aria-expanded={open}
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === option.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <div className="flex flex-col">
                      <span>{option.name}</span>
                      <span className="text-xs text-gray-500">{option.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
