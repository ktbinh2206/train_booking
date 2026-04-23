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
  const [templateModalMode, setTemplateModalMode] = useState<'create' | 'edit' | 'view'>('create');
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
          <Button variant="outline" onClick={() => { setTemplateModalMode('create'); setEditingTemplate(null); setTemplateModalOpen(true); }}>New carriage template</Button>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{template.code}</td>
                  <td className="py-2 pr-3 text-slate-600">{template.type}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setTemplateModalMode('view'); setEditingTemplate(template); setTemplateModalOpen(true); }}>View</Button>
                      <Button size="sm" variant="outline" onClick={() => { setTemplateModalMode('edit'); setEditingTemplate(template); setTemplateModalOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await deleteAdminCarriage(template.id); await load(); }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        mode={templateModalMode}
        template={editingTemplate}
        onClose={() => setTemplateModalOpen(false)}
        onSave={async (value) => {
          if (templateModalMode === 'edit' && editingTemplate) await updateAdminCarriage(editingTemplate.id, value);
          else await createAdminCarriage(value);
          setTemplateModalOpen(false);
          await load();
        }}
      />
    </div>
  );
}
