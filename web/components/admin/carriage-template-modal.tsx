'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SeatLayoutEditor } from './seat-layout-editor';
import { createEmptyTrainLayout, layoutJsonToTrainGrid, trainGridToLayoutJson, type TrainSeatGrid } from '@/lib/train-management';
import type { AdminCarriage } from '@/lib/api';

type Props = {
  open: boolean;
  mode?: 'create' | 'edit' | 'view';
  template?: AdminCarriage | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: { code: string; type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER'; layout: ReturnType<typeof trainGridToLayoutJson> }) => Promise<void> | void;
};

export function CarriageTemplateModal({ open, mode = 'create', template, saving, onClose, onSave }: Props) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER'>('SOFT_SEAT');
  const [layout, setLayout] = useState<TrainSeatGrid>(createEmptyTrainLayout());
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(4);
  const readOnly = mode === 'view';

  useEffect(() => {
    if (!open) return;
    const nextLayout = layoutJsonToTrainGrid(template?.layout ?? null);
    setCode(template?.code ?? '');
    setType(template?.type ?? 'SOFT_SEAT');
    setLayout(nextLayout);
    setRows(nextLayout.length || 8);
    setCols(nextLayout[0]?.length || 4);
  }, [open, template]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'View carriage template' : mode === 'edit' ? 'Edit carriage template' : 'Create carriage template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="A1" disabled={readOnly} />
          <select className="h-10 rounded-md border px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as typeof type)} disabled={readOnly}>
            <option value="SOFT_SEAT">SOFT_SEAT</option>
            <option value="HARD_SEAT">HARD_SEAT</option>
            <option value="SLEEPER">SLEEPER</option>
          </select>
          <SeatLayoutEditor
            layout={layout}
            rows={rows}
            cols={cols}
            readOnly={readOnly}
            onRowsChange={setRows}
            onColsChange={setCols}
            onChange={setLayout}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly ? <Button onClick={() => void onSave({ code, type, layout: trainGridToLayoutJson(layout) })} disabled={saving}>Save</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
