import { type FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { Dish } from '../../types';
import { getImageUrl } from '../../utils/image';
import type MenuStore from '../../stores/MenuStore';
import type AdminStore from '../../stores/AdminStore';

type Props = {
  menuStore: MenuStore;
  adminStore: AdminStore;
  onRefresh: () => void;
};

const emptyDish = (): Partial<Dish> => ({
  id: '',
  title: '',
  description: '',
  price: 0,
  weight: '',
  categoryId: '',
  imageUrl: '',
  ingredients: '',
  recommendation: '',
  recommendedDishId: '',
});

const DishesSection: FC<Props> = observer(({ menuStore, adminStore, onRefresh }) => {
  const { uiStore, toastStore } = useStore();
  const [newDish, setNewDish] = useState<Partial<Dish>>(emptyDish);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Dish>>({});
  const [editFile, setEditFile] = useState<File | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = newDish.imageUrl;
    if (imageFile) {
      const url = await adminStore.uploadImage(imageFile);
      if (url) finalUrl = url;
    }
    if (await adminStore.createDish({ ...newDish, imageUrl: finalUrl } as Dish)) {
      toastStore.success('Блюдо добавлено');
      setNewDish(emptyDish());
      setImageFile(null);
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось создать блюдо');
    }
  };

  const startEdit = (d: Dish) => {
    setEditingId(d.id);
    setEditForm({
      title: d.title,
      description: d.description,
      price: d.price,
      weight: d.weight || '',
      categoryId: d.categoryId,
      imageUrl: d.imageUrl || '',
      ingredients: d.ingredients || '',
      recommendation: d.recommendation || '',
      recommendedDishId: d.recommendedDishId || '',
    });
    setEditFile(null);
  };

  const saveEdit = async (id: string) => {
    let imageUrl = editForm.imageUrl;
    if (editFile) {
      const url = await adminStore.uploadImage(editFile);
      if (url) imageUrl = url;
    }
    const payload = {
      title: editForm.title!,
      description: editForm.description!,
      price: editForm.price!,
      weight: editForm.weight || '',
      categoryId: editForm.categoryId!,
      imageUrl: imageUrl || '',
      ingredients: editForm.ingredients || '',
      recommendation: editForm.recommendation || '',
      recommendedDishId: editForm.recommendedDishId || '',
    };
    if (await adminStore.updateDish(id, payload)) {
      toastStore.success('Блюдо обновлено');
      setEditingId(null);
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось сохранить блюдо');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await uiStore.confirm('Удалить это блюдо?', {
      title: 'Удаление блюда',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      danger: true,
    });
    if (!ok) return;
    if (await adminStore.deleteDish(id)) {
      toastStore.success('Блюдо удалено');
      onRefresh();
    } else {
      toastStore.error(adminStore.error || 'Не удалось удалить блюдо');
    }
  };

  return (
    <>
      <div className="admin-card">
        <h2 className="admin-card__title">Новое блюдо</h2>
        <form onSubmit={handleCreate}>
          <div className="admin-form-stack">
            <div className="admin-field">
              <label>ID</label>
              <input
                className="admin-input"
                value={newDish.id || ''}
                onChange={(e) => setNewDish({ ...newDish, id: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label>Название</label>
              <input
                className="admin-input"
                value={newDish.title || ''}
                onChange={(e) => setNewDish({ ...newDish, title: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label>Описание</label>
              <textarea
                className="admin-textarea"
                value={newDish.description || ''}
                onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                required
              />
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Цена (₽)</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step={1}
                  value={newDish.price === undefined ? '' : newDish.price}
                  onChange={(e) => setNewDish({ ...newDish, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="admin-field">
                <label>Вес / порция</label>
                <input
                  className="admin-input"
                  value={newDish.weight || ''}
                  onChange={(e) => setNewDish({ ...newDish, weight: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Категория</label>
                <select
                  className="admin-select"
                  value={newDish.categoryId || ''}
                  onChange={(e) => setNewDish({ ...newDish, categoryId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Выберите категорию
                  </option>
                  {menuStore.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-field">
              <label>Ингредиенты</label>
              <textarea
                className="admin-textarea"
                value={newDish.ingredients || ''}
                onChange={(e) => setNewDish({ ...newDish, ingredients: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Рекомендуемое блюдо</label>
              <select
                className="admin-select"
                value={newDish.recommendedDishId || ''}
                onChange={(e) => setNewDish({ ...newDish, recommendedDishId: e.target.value })}
              >
                <option value="">Не выбрано</option>
                {menuStore.dishes
                  .filter((d) => d.id !== newDish.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="admin-field">
              <label>Рекомендация шефа</label>
              <textarea
                className="admin-textarea"
                value={newDish.recommendation || ''}
                onChange={(e) => setNewDish({ ...newDish, recommendation: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Изображение</label>
              <input className="admin-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={adminStore.isLoading} style={{ alignSelf: 'flex-start' }}>
              Добавить блюдо
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Все блюда</h2>
        <div className="admin-dish-grid">
          {menuStore.dishes.map((d) => (
            <div key={d.id} className="admin-dish-card">
              <img className="admin-dish-card__img" src={getImageUrl(d.imageUrl)} alt="" />
              <div>
                {editingId === d.id ? (
                  <div className="admin-form-stack" style={{ maxWidth: '100%' }}>
                    <input
                      className="admin-input"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                    <textarea
                      className="admin-textarea"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                    <div className="admin-form-grid">
                      <input
                        className="admin-input"
                        type="number"
                        value={editForm.price ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                      />
                      <input
                        className="admin-input"
                        placeholder="Вес"
                        value={editForm.weight || ''}
                        onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      />
                      <select
                        className="admin-select"
                        value={editForm.categoryId || ''}
                        onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                      >
                        {menuStore.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      className="admin-textarea"
                      placeholder="Ингредиенты"
                      value={editForm.ingredients || ''}
                      onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })}
                    />
                    <textarea
                      className="admin-textarea"
                      placeholder="Рекомендация"
                      value={editForm.recommendation || ''}
                      onChange={(e) => setEditForm({ ...editForm, recommendation: e.target.value })}
                    />
                    <select
                      className="admin-select"
                      value={editForm.recommendedDishId || ''}
                      onChange={(e) => setEditForm({ ...editForm, recommendedDishId: e.target.value })}
                    >
                      <option value="">Рекомендуемое блюдо не выбрано</option>
                      {menuStore.dishes
                        .filter((dishOption) => dishOption.id !== d.id)
                        .map((dishOption) => (
                          <option key={dishOption.id} value={dishOption.id}>
                            {dishOption.title}
                          </option>
                        ))}
                    </select>
                    <input type="file" accept="image/*" className="admin-input" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
                    <div className="admin-table-actions">
                      <button type="button" className="admin-btn admin-btn--primary" disabled={adminStore.isLoading} onClick={() => saveEdit(d.id)}>
                        Сохранить
                      </button>
                      <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setEditingId(null)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: '0 0 8px', color: 'var(--color-secondary)' }}>{d.title}</h3>
                    <div className="admin-dish-card__meta">
                      {d.price} ₽ · {d.weight || '—'} · категория: {d.categoryId}
                    </div>
                    {d.description && <p className="admin-meta-muted" style={{ margin: '8px 0 0' }}>{d.description}</p>}
                  </>
                )}
              </div>
              {editingId !== d.id && (
                <div className="admin-table-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => startEdit(d)}>
                    Изменить
                  </button>
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => handleDelete(d.id)}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default DishesSection;
