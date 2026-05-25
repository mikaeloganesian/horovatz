import { type FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type AdminStore from '../../stores/AdminStore';
import { getImageUrl } from '../../utils/image';
import { ORDER_STATUS_LABELS } from '../../utils/orderStatus';

type Props = {
  adminStore: AdminStore;
};

const statusLabels = ORDER_STATUS_LABELS;

const OrdersSection: FC<Props> = observer(({ adminStore }) => {
  const { uiStore, toastStore } = useStore();
  const [drafts, setDrafts] = useState<Record<number, { status: string; deliveryAddress: string }>>({});

  useEffect(() => {
    adminStore.fetchAllOrders();
  }, [adminStore]);

  useEffect(() => {
    const next: Record<number, { status: string; deliveryAddress: string }> = {};
    for (const o of adminStore.orders) {
      next[o.id] = { status: o.status, deliveryAddress: o.deliveryAddress };
    }
    setDrafts(next);
  }, [adminStore.orders]);

  const updateDraft = (id: number, patch: Partial<{ status: string; deliveryAddress: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const save = async (id: number) => {
    const d = drafts[id];
    if (!d) return;
    if (await adminStore.updateOrder(id, d)) {
      toastStore.success('Заказ обновлён');
      adminStore.fetchAllOrders();
    } else {
      toastStore.error(adminStore.error || 'Не удалось сохранить заказ');
    }
  };

  const remove = async (id: number) => {
    const ok = await uiStore.confirm('Удалить заказ безвозвратно?', {
      title: 'Удаление заказа',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      danger: true,
    });
    if (!ok) return;
    if (await adminStore.deleteOrder(id)) {
      toastStore.success('Заказ удалён');
      adminStore.fetchAllOrders();
    } else {
      toastStore.error(adminStore.error || 'Не удалось удалить заказ');
    }
  };

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Заказы</h2>
      {adminStore.orders.length === 0 && <p className="admin-meta-muted">Заказов пока нет.</p>}
      {adminStore.orders.map((o) => (
        <div key={o.id} className="admin-order-card">
          <div className="admin-order-head">
            <div>
              <strong>#{o.id}</strong>
              <span className="admin-meta-muted" style={{ marginLeft: 12 }}>
                {o.userId != null
                  ? `пользователь ${o.userId}`
                  : `гость: ${[o.guestName, o.guestPhone, o.guestEmail].filter(Boolean).join(' · ') || '—'}`}{' '}
                · {new Date(o.created_at).toLocaleString('ru-RU')}
              </span>
            </div>
            <strong>{o.totalPrice.toFixed(0)} ₽</strong>
          </div>
          <div className="admin-form-grid" style={{ alignItems: 'flex-end' }}>
            <div className="admin-field">
              <label>Статус</label>
              <select
                className="admin-select"
                value={drafts[o.id]?.status ?? o.status}
                onChange={(e) => updateDraft(o.id, { status: e.target.value })}
              >
                {['pending_payment', 'new', 'processing', 'completed', 'payment_canceled'].map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s] || s}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field" style={{ gridColumn: 'span 2', minWidth: 200 }}>
              <label>Адрес доставки</label>
              <input
                className="admin-input"
                value={drafts[o.id]?.deliveryAddress ?? o.deliveryAddress}
                onChange={(e) => updateDraft(o.id, { deliveryAddress: e.target.value })}
              />
            </div>
            <button type="button" className="admin-btn admin-btn--primary" disabled={adminStore.isLoading} onClick={() => save(o.id)}>
              Сохранить
            </button>
            <button type="button" className="admin-btn admin-btn--danger" disabled={adminStore.isLoading} onClick={() => remove(o.id)}>
              Удалить
            </button>
          </div>
          <div className="admin-order-items">
            {o.items?.map((it) => (
              <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                <img src={getImageUrl(it.imageUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                <span>
                  {it.dishTitle} × {it.quantity} — {(it.price * it.quantity).toFixed(0)} ₽
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default OrdersSection;
