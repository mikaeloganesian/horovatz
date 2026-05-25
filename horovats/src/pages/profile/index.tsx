import { type FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import { Navigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/image';
import MapPicker from '../../components/MapPicker';
import { orderStatusLabel } from '../../utils/orderStatus';
import './Profile.css';

const ProfilePage: FC = observer(() => {
  const { authStore, orderStore } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (authStore.user) {
      setName(authStore.user.name || '');
      setPhone(authStore.user.phone || '');
      setAddress(authStore.user.address || '');
    }
  }, [authStore.user]);

  useEffect(() => {
    if (authStore.isAuth) {
      orderStore.fetchOrders();
    }
  }, [authStore.isAuth, orderStore]);

  if (authStore.isLoading) {
    return <div className="profile-loading">Загрузка...</div>;
  }

  if (!authStore.isAuth || !authStore.user) {
    return <Navigate to="/auth" />;
  }

  const handleSave = async () => {
    const success = await authStore.updateProfile(name, phone, address);
    if (success) {
      setIsEditing(false);
    }
  };

  return (
    <div className="profile-page">
      {showMap && (
        <MapPicker
          onClose={() => setShowMap(false)}
          onAddressSelect={(addr) => setAddress(addr)}
        />
      )}

      <h1>Мой профиль</h1>

      <div className="profile-card">
        <div className="profile-card__head">
          <h2>Личные данные</h2>
          {!isEditing ? (
            <button type="button" onClick={() => setIsEditing(true)} className="profile-btn profile-btn--primary">
              Редактировать
            </button>
          ) : (
            <button type="button" onClick={handleSave} className="profile-btn profile-btn--success">
              Сохранить
            </button>
          )}
        </div>

        {authStore.error && <div className="profile-error">{authStore.error}</div>}

        <div className="profile-fields">
          <strong>Email:</strong>
          <span>{authStore.user.email} (нельзя изменить)</span>

          <strong>Имя:</strong>
          {isEditing ? (
            <input className="profile-input" value={name} onChange={(e) => setName(e.target.value)} />
          ) : (
            <span>{authStore.user.name || 'Не указано'}</span>
          )}

          <strong>Телефон:</strong>
          {isEditing ? (
            <input className="profile-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          ) : (
            <span>{authStore.user.phone || 'Не указано'}</span>
          )}

          <strong>Адрес доставки:</strong>
          {isEditing ? (
            <div className="profile-address-row">
              <input
                className="profile-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="г. Москва, ул. Примерная..."
              />
              <button type="button" onClick={() => setShowMap(true)} className="profile-map-btn">
                Карта
              </button>
            </div>
          ) : (
            <span>{authStore.user.address || 'Не указано'}</span>
          )}
        </div>
      </div>

      <h2 className="profile-orders-title">История заказов</h2>
      {orderStore.isLoading && <p>Загрузка заказов...</p>}
      {!orderStore.isLoading && orderStore.orders.length === 0 && (
        <p style={{ color: '#666' }}>Вы еще ничего не заказывали.</p>
      )}

      <div className="profile-orders-list">
        {orderStore.orders.map((order) => (
          <div key={order.id} className="profile-order-card">
            <div className="profile-order-head">
              <div className="profile-order-head-main">
                <strong>Заказ #{order.id}</strong>
                <span className="profile-order-meta">{new Date(order.created_at).toLocaleString('ru-RU')}</span>
              </div>
              <span
                className={`profile-order-status ${
                  order.status === 'new' ? 'profile-order-status--new' : 'profile-order-status--default'
                }`}
              >
                {orderStatusLabel(order.status)}
              </span>
            </div>
            <div className="profile-order-body">
              <div className="profile-order-items">
                {order.items.map((item) => (
                  <div key={item.id} className="profile-order-item">
                    <img src={getImageUrl(item.imageUrl)} alt={item.dishTitle} />
                    <div className="profile-order-item-info">
                      <div style={{ fontWeight: 'bold' }}>{item.dishTitle}</div>
                      <div style={{ color: '#666', fontSize: '0.9rem' }}>
                        {item.price} ₽ × {item.quantity} шт.
                      </div>
                    </div>
                    <div className="profile-order-item-price">{item.price * item.quantity} ₽</div>
                  </div>
                ))}
              </div>
              <div className="profile-order-footer">
                <span className="profile-order-address">
                  Адрес доставки: {order.deliveryAddress || 'Не указан'}
                </span>
                <strong className="profile-order-total">Итого: {order.totalPrice} ₽</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default ProfilePage;
