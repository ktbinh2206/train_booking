'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrainTable } from './train-table';
import { TrainModal } from './train-modal';
import { CarriageTemplateModal } from './carriage-template-modal';
import { createAdminCarriage, createAdminTrain, deleteAdminCarriage, deleteAdminTrain, getAdminCarriages, getAdminTrains, updateAdminCarriage, updateAdminTrain, type AdminCarriage, type AdminTrain } from '@/lib/api';

export function TrainPage() {
  const [trains, setTrains] = useState<AdminTrain[]>([]);
  const [templates, setTemplates] = useState<AdminCarriage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [trainModalOpen, setTrainModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTrain, setEditingTrain] = useState<AdminTrain | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AdminCarriage | null>(null);

  const load = async () => {
    const [trainsData, templatesData] = await Promise.all([
      getAdminTrains({ page, pageSize: 10 }),
      getAdminCarriages({ page: 1, pageSize: 100 })
    ]);
    setTrains(trainsData.data);
    setTotalPages(trainsData.totalPages);
    setTemplates(templatesData.data);
  };

  useEffect(() => { void load(); }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Train management</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingTrain(null); setTrainModalOpen(true); }}>New train</Button>
          <Button variant="outline" onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true); }}>New carriage template</Button>
        </div>
      </div>
      <TrainTable
        trains={trains}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onCreate={() => { setEditingTrain(null); setTrainModalOpen(true); }}
        onEdit={(id) => { setEditingTrain(trains.find((train) => train.id === id) ?? null); setTrainModalOpen(true); }}
        onDelete={async (id) => { await deleteAdminTrain(id); await load(); }}
      />
      <div className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Carriage templates</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border p-3">
              <p className="font-medium">{template.code}</p>
              <p className="text-xs text-slate-500">{template.type}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(template); setTemplateModalOpen(true); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={async () => { await deleteAdminCarriage(template.id); await load(); }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TrainModal
        open={trainModalOpen}
        initialValue={editingTrain}
        onClose={() => setTrainModalOpen(false)}
        onSave={async (value) => {
          if (editingTrain) await updateAdminTrain(editingTrain.id, value);
          else await createAdminTrain(value);
          setTrainModalOpen(false);
          await load();
        }}
      />
      <CarriageTemplateModal
        open={templateModalOpen}
        template={editingTemplate}
        onClose={() => setTemplateModalOpen(false)}
        onSave={async (value) => {
          if (editingTemplate) await updateAdminCarriage(editingTemplate.id, value);
          else await createAdminCarriage(value);
          setTemplateModalOpen(false);
          await load();
        }}
      />
    </div>
  );
}
