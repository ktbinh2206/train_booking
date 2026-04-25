'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VN } from '@/lib/translations';
import { getAdminSettings, saveAdminSettings, type AdminSystemSettings } from '@/lib/api';

const DEFAULT_SETTINGS: AdminSystemSettings = {
  HOLD_EXPIRE_MINUTES: '5',
  REMINDER_BEFORE_MINUTES: '60',
  REFUND_POLICY_1: '75',
  REFUND_POLICY_2: '50',
  REFUND_POLICY_3: '25'
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminSettings();
        if (active) {
          setSettings(data);
        }
      } catch (unknownError) {
        if (!active) return;
        setError(unknownError instanceof Error ? unknownError.message : 'Không thể tải cài đặt.');
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

  const updateSetting = (key: keyof AdminSystemSettings, value: string) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      const saved = await saveAdminSettings(settings);
      setSettings(saved);
      setMessage('Đã lưu cài đặt thành công.');
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setMessage('Đã khôi phục giá trị mặc định trên màn hình.');
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: 'Quản trị', href: '/admin/dashboard' },
          { label: 'Cài đặt hệ thống' }
        ]}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">System settings</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Cài đặt vận hành thực tế</h1>
            <p className="mt-2 text-sm text-slate-600">Các giá trị này được lưu trong cơ sở dữ liệu và áp dụng cho giữ chỗ, nhắc chuyến, và hoàn tiền.</p>
          </div>
          <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900 border border-teal-100">
            <div className="font-semibold">Lưu ý</div>
            <div>Thay đổi sẽ có hiệu lực ngay sau khi lưu.</div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải cài đặt...
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Giữ chỗ và nhắc chuyến</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="holdExpireMinutes" className="mb-2 block text-sm font-medium text-slate-700">Thời gian giữ ghế (phút)</Label>
                    <Input
                      id="holdExpireMinutes"
                      type="number"
                      min="1"
                      value={settings.HOLD_EXPIRE_MINUTES}
                      onChange={(event) => updateSetting('HOLD_EXPIRE_MINUTES', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminderBeforeMinutes" className="mb-2 block text-sm font-medium text-slate-700">Nhắc trước khi khởi hành (phút)</Label>
                    <Input
                      id="reminderBeforeMinutes"
                      type="number"
                      min="1"
                      value={settings.REMINDER_BEFORE_MINUTES}
                      onChange={(event) => updateSetting('REMINDER_BEFORE_MINUTES', event.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Chính sách hoàn tiền</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="refund48" className="mb-2 block text-sm font-medium text-slate-700">Trước hơn 48 giờ (%)</Label>
                    <Input
                      id="refund48"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.REFUND_POLICY_1}
                      onChange={(event) => updateSetting('REFUND_POLICY_1', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="refund24" className="mb-2 block text-sm font-medium text-slate-700">Từ 24 đến 48 giờ (%)</Label>
                    <Input
                      id="refund24"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.REFUND_POLICY_2}
                      onChange={(event) => updateSetting('REFUND_POLICY_2', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="refundUnder24" className="mb-2 block text-sm font-medium text-slate-700">Dưới 24 giờ (%)</Label>
                    <Input
                      id="refundUnder24"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.REFUND_POLICY_3}
                      onChange={(event) => updateSetting('REFUND_POLICY_3', event.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Khôi phục mặc định
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}