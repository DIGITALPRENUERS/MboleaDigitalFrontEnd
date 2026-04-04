import { useState, useEffect } from 'react';
import * as usersApi from '../../services/usersApi';
import { withContext } from '../../utils/errorNotifications';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Users } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'SALES_POINT', label: 'Sales point' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'TFRA', label: 'TFRA' },
  { value: 'SYSTEM_ADMIN', label: 'System admin' },
];

function formatRole(r) {
  if (!r) return '—';
  return String(r).replace(/^ROLE_/, '');
}

export default function AdminUsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TFRA',
    companyName: '',
    companyCode: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    companyCode: '',
    isActive: true,
    userRole: 'TFRA',
    password: '',
  });

  const load = () => {
    setLoading(true);
    usersApi
      .listUsers()
      .then(setUsers)
      .catch((err) => {
        toast.error(withContext('Load users', err));
        setUsers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name ?? '',
      companyName: u.companyName ?? '',
      companyCode: u.companyCode ?? '',
      isActive: u.isActive !== false,
      userRole: formatRole(u.role),
      password: '',
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        companyName: createForm.companyName.trim() || null,
        companyCode: createForm.companyCode.trim() || null,
      });
      toast.success('User created. They can sign in with email and password.');
      setCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'TFRA',
        companyName: '',
        companyCode: '',
      });
      load();
    } catch (err) {
      toast.error(withContext('Create user', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatch = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setSubmitting(true);
    try {
      const body = {
        name: editForm.name.trim(),
        companyName: editForm.companyName.trim() || null,
        companyCode: editForm.companyCode.trim() || null,
        isActive: editForm.isActive,
        userRole: editForm.userRole,
      };
      if (editForm.password.trim().length > 0) {
        body.password = editForm.password;
      }
      await usersApi.updateUser(editUser.id, body);
      toast.success('User updated.');
      setEditUser(null);
      load();
    } catch (err) {
      toast.error(withContext('Update user', err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Users &amp; roles
        </CardTitle>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create user
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-600">
          TFRA and other accounts can be created and updated here. Self-signup does not include TFRA.
        </p>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Active</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{formatRole(u.role)}</td>
                    <td className="py-2">{u.isActive ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      <Button size="sm" variant="ghost" type="button" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create user" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            required
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Company name (optional)"
            value={createForm.companyName}
            onChange={(e) => setCreateForm((f) => ({ ...f, companyName: e.target.value }))}
          />
          <Input
            label="Company code (optional)"
            value={createForm.companyCode}
            onChange={(e) => setCreateForm((f) => ({ ...f, companyCode: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} isLoading={submitting}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editUser != null} onClose={() => setEditUser(null)} title="Edit user" size="md">
        {editUser && (
          <form onSubmit={handlePatch} className="space-y-4">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{editUser.email}</span>
            </p>
            <Input
              label="Name"
              required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Company name"
              value={editForm.companyName}
              onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
            />
            <Input
              label="Company code"
              value={editForm.companyCode}
              onChange={(e) => setEditForm((f) => ({ ...f, companyCode: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select
                value={editForm.userRole}
                onChange={(e) => setEditForm((f) => ({ ...f, userRole: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Account active
            </label>
            <Input
              label="New password (optional)"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} isLoading={submitting}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  );
}
