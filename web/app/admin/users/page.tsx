'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from '@/lib/api';

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Awaited<ReturnType<typeof getAdminUsers>>['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN'
  });

  const loadUsers = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminUsers({ page: targetPage, pageSize: 10 });
      setUsers(Array.isArray(payload.data) ? payload.data : []);
      setPage(payload.page);
      setTotalPages(payload.totalPages);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách người dùng.';
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers(1);
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const safeUsers = Array.isArray(users) ? users : [];
    if (!normalized) return safeUsers;
    return safeUsers.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalized));
  }, [users, query]);

  const handleEdit = (userId: string) => {
    const found = users.find((user) => user.id === userId);
    if (!found) return;
    setEditingId(found.id);
    setShowForm(true);
    setForm({
      name: found.name,
      email: found.email,
      password: '',
      role: found.role
    });
  };

  const handleDelete = async (userId: string) => {
    try {
      setError(null);
      await deleteAdminUser(userId);
      await loadUsers(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Xóa người dùng thất bại.';
      setError(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await updateAdminUser(editingId, {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          role: form.role
        });
      } else {
        if (!form.password) {
          setError('Mật khẩu là bắt buộc khi tạo mới user.');
          return;
        }

        await createAdminUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role
        });
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', email: '', password: '', role: 'USER' });
      await loadUsers(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Lưu người dùng thất bại.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => {
          setShowForm((previous) => !previous);
          setEditingId(null);
          setForm({ name: '', email: '', password: '', role: 'USER' });
        }}>
          <Plus className="w-4 h-4" />
          {showForm ? 'Đóng form' : 'Thêm người dùng'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Họ tên" value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} />
          <Input placeholder={editingId ? 'Mật khẩu mới (optional)' : 'Mật khẩu'} type="password" value={form.password} onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))} />
          <select className="px-3 py-2 border rounded" value={form.role} onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value as 'USER' | 'ADMIN' }))}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <div className="md:col-span-4 flex gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? 'Cập nhật' : 'Tạo mới'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input placeholder="Tìm theo tên hoặc email..." className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{error}</div>}
        {loading && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 mb-4">Đang tải người dùng...</div>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Số lần đặt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Ngày tham gia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.role}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user._count?.bookings ?? 0}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(user.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => loadUsers(page - 1)}>Prev</Button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => loadUsers(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
