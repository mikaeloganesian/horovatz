import { type FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { User } from '../../stores/AuthStore';
import type AdminStore from '../../stores/AdminStore';

type Props = {
  adminStore: AdminStore;
  currentUserId: number;
};

const UsersSection: FC<Props> = observer(({ adminStore, currentUserId }) => {
  const { uiStore, toastStore } = useStore();
  const [drafts, setDrafts] = useState<Record<number, { name: string; phone: string; address: string; role: string }>>({});

  useEffect(() => {
    adminStore.fetchUsers();
  }, [adminStore]);

  useEffect(() => {
    const next: Record<number, { name: string; phone: string; address: string; role: string }> = {};
    for (const u of adminStore.users) {
      next[u.id] = {
        name: u.name || '',
        phone: u.phone || '',
        address: u.address || '',
        role: u.role,
      };
    }
    setDrafts(next);
  }, [adminStore.users]);

  const patchDraft = (id: number, patch: Partial<{ name: string; phone: string; address: string; role: string }>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async (id: number) => {
    const d = drafts[id];
    if (!d) return;
    if (await adminStore.updateUser(id, d)) {
      toastStore.success('Данные пользователя сохранены');
      adminStore.fetchUsers();
    } else {
      toastStore.error(adminStore.error || 'Не удалось сохранить пользователя');
    }
  };

  const remove = async (id: number) => {
    if (id === currentUserId) return;
    const ok = await uiStore.confirm('Удалить пользователя?', {
      title: 'Удаление пользователя',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      danger: true,
    });
    if (!ok) return;
    if (await adminStore.deleteUser(id)) {
      toastStore.success('Пользователь удалён');
      adminStore.fetchUsers();
    } else {
      toastStore.error(adminStore.error || 'Не удалось удалить пользователя');
    }
  };

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Пользователи</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Адрес</th>
              <th>Роль</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {adminStore.users.map((u: User) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>
                  <input
                    className="admin-input"
                    value={drafts[u.id]?.name ?? ''}
                    onChange={(e) => patchDraft(u.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={drafts[u.id]?.phone ?? ''}
                    onChange={(e) => patchDraft(u.id, { phone: e.target.value })}
                  />
                </td>
                <td style={{ minWidth: 160 }}>
                  <input
                    className="admin-input"
                    value={drafts[u.id]?.address ?? ''}
                    onChange={(e) => patchDraft(u.id, { address: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="admin-select"
                    value={drafts[u.id]?.role ?? u.role}
                    onChange={(e) => patchDraft(u.id, { role: e.target.value })}
                  >
                    <option value="customer">Клиент</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-btn admin-btn--primary" disabled={adminStore.isLoading} onClick={() => save(u.id)}>
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={adminStore.isLoading || u.id === currentUserId}
                      title={u.id === currentUserId ? 'Нельзя удалить себя' : undefined}
                      onClick={() => remove(u.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default UsersSection;
