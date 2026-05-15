import { type FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { Category } from '../../types';
import type MenuStore from '../../stores/MenuStore';
import type AdminStore from '../../stores/AdminStore';

type Props = {
  menuStore: MenuStore;
  adminStore: AdminStore;
  onRefresh: () => void;
};

const CategoriesSection: FC<Props> = observer(({ menuStore, adminStore, onRefresh }) => {
  const { uiStore, toastStore } = useStore();
  const [newCat, setNewCat] = useState<Partial<Category>>({ id: '', title: '', subtitle: '', icon: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', subtitle: '', icon: '' });

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditDraft({ title: c.title, subtitle: c.subtitle || '', icon: c.icon || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await adminStore.createCategory(newCat as Category)) {
      toastStore.success('Категория добавлена');
      setNewCat({ id: '', title: '', subtitle: '', icon: '' });
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось создать категорию');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (await adminStore.updateCategory(id, editDraft)) {
      toastStore.success('Категория обновлена');
      setEditingId(null);
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось сохранить категорию');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await uiStore.confirm('Удалить категорию? Связанные блюда могут потерять привязку.', {
      title: 'Удаление категории',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      danger: true,
    });
    if (!ok) return;
    if (await adminStore.deleteCategory(id)) {
      toastStore.success('Категория удалена');
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось удалить категорию');
    }
  };

  return (
    <>
      <div className="admin-card">
        <h2 className="admin-card__title">Новая категория</h2>
        <form onSubmit={handleCreate}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>ID (slug)</label>
              <input
                className="admin-input"
                value={newCat.id || ''}
                onChange={(e) => setNewCat({ ...newCat, id: e.target.value })}
                placeholder="salads"
                required
              />
            </div>
            <div className="admin-field">
              <label>Название</label>
              <input
                className="admin-input"
                value={newCat.title || ''}
                onChange={(e) => setNewCat({ ...newCat, title: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label>Подзаголовок</label>
              <input
                className="admin-input"
                value={newCat.subtitle || ''}
                onChange={(e) => setNewCat({ ...newCat, subtitle: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Иконка (URL или emoji)</label>
              <input
                className="admin-input"
                value={newCat.icon || ''}
                onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
              />
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={adminStore.isLoading}>
              Добавить
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Все категории</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Подзаголовок</th>
                <th>Иконка</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {menuStore.categories.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.id}</code></td>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input
                          className="admin-input"
                          value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="admin-input"
                          value={editDraft.subtitle}
                          onChange={(e) => setEditDraft({ ...editDraft, subtitle: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="admin-input"
                          value={editDraft.icon}
                          onChange={(e) => setEditDraft({ ...editDraft, icon: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            disabled={adminStore.isLoading}
                            onClick={() => handleSaveEdit(c.id)}
                          >
                            Сохранить
                          </button>
                          <button type="button" className="admin-btn admin-btn--ghost" onClick={cancelEdit}>
                            Отмена
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.title}</td>
                      <td>{c.subtitle || '—'}</td>
                      <td className="admin-meta-muted">{c.icon || '—'}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => startEdit(c)}>
                            Изменить
                          </button>
                          <button type="button" className="admin-btn admin-btn--danger" onClick={() => handleDelete(c.id)}>
                            Удалить
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
});

export default CategoriesSection;
