'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrainPreview } from './train-preview';
import { layoutJsonToTrainGrid } from '@/lib/train-management';
import type { AdminCarriage, AdminStation, AdminTrain, AdminTripDetail } from '@/lib/api';
import type { TrainLayoutJson } from '@/lib/train-layout';

type DraftCarriage = {
  templateId: string;
  code: string;
  orderIndex: number;
  basePrice: number;
  layout?: TrainLayoutJson | null;
};

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
  const [templateQuery, setTemplateQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const readOnly = mode === 'view';

  const toUiStatus = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'COMPLETED') => {
    if (status === 'ON_TIME') return 'Đúng giờ';
    if (status === 'DELAYED') return 'Trễ';
    if (status === 'DEPARTED') return 'Đã khởi hành';
    if (status === 'COMPLETED') return 'Đã hoàn thành';
    return 'Đã hủy';
  };

  const toStatusClass = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'COMPLETED') => {
    if (status === 'ON_TIME') return 'bg-green-100 text-green-800';
    if (status === 'DELAYED') return 'bg-yellow-100 text-yellow-800';
    if (status === 'DEPARTED') return 'bg-blue-100 text-blue-800';
    if (status === 'COMPLETED') return 'bg-purple-100 text-purple-800';
    return 'bg-red-100 text-red-800';
  };

  const nextCarriageOrderIndex = (items: DraftCarriage[]) => {
    if (items.length === 0) {
      return 0;
    }

    return Math.max(...items.map((item) => item.orderIndex)) + 1;
  };

  const addCarriageFromTemplate = (template: AdminCarriage) => {
    setCarriages((current) => {
      const sameTemplateCount = current.filter((item) => item.templateId === template.id).length;
      return [
        ...current,
        {
          templateId: template.id,
          code: `${template.code}-${sameTemplateCount + 1}`,
          orderIndex: nextCarriageOrderIndex(current),
          basePrice: price,
          layout: template.layout ?? null
        }
      ];
    });
  };

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
          orderIndex: item.orderIndex,
          basePrice: Number(item.basePrice),
          layout: item.layout ?? null
        }))
    );
  }, [open, initialTrip, templates]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [open, templates, selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    if (!query) {
      return templates;
    }

    return templates.filter((template) =>
      template.code.toLowerCase().includes(query) || template.type.toLowerCase().includes(query)
    );
  }, [templates, templateQuery]);

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
      <DialogContent className="sm:max-w-6xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create trip' : mode === 'edit' ? 'Edit trip' : 'View trip'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-auto">
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
              {initialTrip && (
                <div className="bg-gray-50 p-3 rounded">
                  Trạng thái:
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${toStatusClass(initialTrip.status)}`}>
                    {toUiStatus(initialTrip.status)}
                  </span>

                  {initialTrip.status === 'DELAYED' && (
                    <div className="text-yellow-600">
                      Delay {initialTrip.delayMinutes} phút
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              {/* LEFT: TEMPLATE LIST */}
              <div className="border rounded-md flex flex-col ">
                <div className="p-3 border-b font-medium">Templates</div>

                <div className="p-2">
                  <Input
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder="Search..."
                    disabled={readOnly || loadingInitial}
                  />
                </div>

                {/* SCROLL */}
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTemplates.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2">{t.code}</td>
                          <td className="px-3 py-2">{t.type}</td>
                          <td className="px-3 py-2">
                            <Button size="sm" onClick={() => addCarriageFromTemplate(t)}>
                              Add
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT: SELECTED CARRIAGES */}
              <div className="border rounded-md flex flex-col overflow-hidden">
                <div className="p-3 border-b font-medium">Carriages</div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {carriages.map((c, i) => (
                    <div key={`${c.orderIndex}-${i}`} className="border rounded p-2">
                      <div className="flex gap-2">
                        <Input
                          value={c.code}
                          disabled={readOnly}
                          onChange={(e) =>
                            setCarriages((prev) =>
                              prev.map((it, idx) =>
                                idx === i ? { ...it, code: e.target.value } : it
                              )
                            )
                          }
                        />
                        <Input
                          type="number"
                          value={c.basePrice}
                          disabled={readOnly}
                          onChange={(e) =>
                            setCarriages((prev) =>
                              prev.map((it, idx) =>
                                idx === i
                                  ? { ...it, basePrice: Number(e.target.value) }
                                  : it
                              )
                            )
                          }
                        />
                        <Button
                          variant="destructive"
                          disabled={readOnly || loadingInitial}
                          onClick={() =>
                            setCarriages((prev) => prev.filter((_, idx) => idx !== i))
                          }
                        >
                          X
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        Seats:{' '}
                        {layoutJsonToTrainGrid(c.layout ?? null)
                          .flat()
                          .filter(Boolean).length}
                      </div>
                    </div>
                  ))}
                </div>
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
              carriages: carriages.map((item) => ({
                templateId: item.templateId,
                code: item.code,
                orderIndex: item.orderIndex,
                basePrice: item.basePrice
              }))
            })}
          >
            {mode === 'edit' ? 'Update Trip' : 'Save Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog> 
  );
}
