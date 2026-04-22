'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  initialValue?: { code?: string; name?: string } | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: { code: string; name: string }) => Promise<void> | void;
};

export function TrainModal({ open, initialValue, saving, onClose, onSave }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setCode(initialValue?.code ?? '');
    setName(initialValue?.name ?? '');
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Train</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="SE1" />
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tau Thong Nhat" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void onSave({ code, name })} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
