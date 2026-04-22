'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrainPreview } from './train-preview';
import { layoutJsonToTrainGrid } from '@/lib/train-management';
import type { AdminCarriage, AdminStation, AdminTrain, AdminTripDetail } from '@/lib/api';
import type { TrainLayoutJson } from '@/lib/train-layout';

type DraftCarriage = { templateId: string; code: string; basePrice: number; layout?: TrainLayoutJson | null };

type Props = {
  open: boolean;
  mode?: 'create' | 'edit' | 'view';
  trains: AdminTrain[];
  stations: AdminStation[];
  templates: AdminCarriage[];
  initialTrip?: AdminTripDetail | null;
  loadingInitial?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    trainId: string;
    originStationId: string;
    destinationStationId: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    carriages: Array<{ templateId: string; code: string; orderIndex: number; basePrice: number }>;
  }) => Promise<void> | void;
};

function toLocalDatetime(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function TripBuilderModal({ open, mode = 'create', trains, stations, templates, initialTrip, loadingInitial, saving, onClose, onSave }: Props) {
  const [step, setStep] = useState(1);
  const [trainId, setTrainId] = useState('');
  const [originStationId, setOriginStationId] = useState('');
  const [destinationStationId, setDestinationStationId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState(0);
  const [carriages, setCarriages] = useState<DraftCarriage[]>([]);
  const readOnly = mode === 'view';

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!initialTrip) {
      setStep(1);
      setTrainId('');
      setOriginStationId('');
      setDestinationStationId('');
      setDepartureTime('');
      setArrivalTime('');
      setPrice(0);
      setCarriages([]);
      return;
    }

    setTrainId(initialTrip.trainId);
    setOriginStationId(initialTrip.originStationId ?? '');
    setDestinationStationId(initialTrip.destinationStationId ?? '');
    setDepartureTime(toLocalDatetime(initialTrip.departureTime));
    setArrivalTime(toLocalDatetime(initialTrip.arrivalTime));
    setPrice(initialTrip.price);
    setCarriages(
      (initialTrip.tripCarriages ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item, index) => ({
          templateId: item.templateId ?? templates[index]?.id ?? '',
          code: item.code,
          basePrice: Number(item.basePrice),
          layout: item.layout ?? null
        }))
    );
  }, [open, initialTrip, templates]);

  const previewCarriages = useMemo(() => carriages.map((item) => {
    const template = templates.find((tmp) => tmp.id === item.templateId);
    const layout = item.layout ?? template?.layout ?? null;
    return {
      code: item.code,
      layout: layoutJsonToTrainGrid(layout),
      basePrice: item.basePrice
    };
  }), [carriages, templates]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create trip' : mode === 'edit' ? 'Edit trip' : 'View trip'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loadingInitial ? <p className="text-sm text-slate-500">Loading trip data...</p> : null}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((index) => <Button key={index} size="sm" variant={step === index ? 'default' : 'outline'} onClick={() => setStep(index)} disabled={loadingInitial}>{`Step ${index}`}</Button>)}
          </div>
          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <select className="h-10 rounded-md border px-3 text-sm" value={trainId} onChange={(event) => setTrainId(event.target.value)} disabled={readOnly || loadingInitial}>
                <option value="">Train</option>
                {trains.map((train) => <option key={train.id} value={train.id}>{train.code} - {train.name}</option>)}
              </select>
              <Input type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value || 0))} placeholder="Base price" disabled={readOnly || loadingInitial} />
              <select className="h-10 rounded-md border px-3 text-sm" value={originStationId} onChange={(event) => setOriginStationId(event.target.value)} disabled={readOnly || loadingInitial}>
                <option value="">Origin</option>
                {stations.map((station) => <option key={station.id} value={station.id}>{station.code} - {station.name}</option>)}
              </select>
              <select className="h-10 rounded-md border px-3 text-sm" value={destinationStationId} onChange={(event) => setDestinationStationId(event.target.value)} disabled={readOnly || loadingInitial}>
                <option value="">Destination</option>
                {stations.map((station) => <option key={station.id} value={station.id}>{station.code} - {station.name}</option>)}
              </select>
              <Input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} disabled={readOnly || loadingInitial} />
              <Input type="datetime-local" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} disabled={readOnly || loadingInitial} />
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    disabled={readOnly || loadingInitial}
                    onClick={() => setCarriages((current) => [...current, { templateId: template.id, code: `${template.code}-${current.length + 1}`, basePrice: price, layout: template.layout ?? null }])}
                  >
                    Add {template.code}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {carriages.map((carriage, index) => (
                  <div key={`${carriage.templateId}-${index}`} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-5" value={carriage.code} onChange={(event) => setCarriages((current) => current.map((it, i) => i === index ? { ...it, code: event.target.value } : it))} disabled={readOnly || loadingInitial} />
                    <Input className="col-span-4" type="number" value={carriage.basePrice} onChange={(event) => setCarriages((current) => current.map((it, i) => i === index ? { ...it, basePrice: Number(event.target.value || 0) } : it))} disabled={readOnly || loadingInitial} />
                    <Button className="col-span-3" variant="outline" onClick={() => setCarriages((current) => current.filter((_, i) => i !== index))} disabled={readOnly || loadingInitial}>Remove</Button>
                    <p className="col-span-12 text-xs text-slate-500">
                      Seats: {layoutJsonToTrainGrid(carriage.layout ?? null).flat().filter(Boolean).length}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {step === 3 ? <TrainPreview carriages={previewCarriages} /> : null}
          {step === 4 ? <p className="text-sm text-slate-600">Save to create trip, snapshot carriage layouts, and bulk-generate trip seats.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            disabled={saving || readOnly || loadingInitial}
            onClick={() => void onSave({
              trainId,
              originStationId,
              destinationStationId,
              departureTime: new Date(departureTime).toISOString(),
              arrivalTime: new Date(arrivalTime).toISOString(),
              price,
              carriages: carriages.map((item, index) => ({ ...item, orderIndex: index }))
            })}
          >
            {mode === 'edit' ? 'Update Trip' : 'Save Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
