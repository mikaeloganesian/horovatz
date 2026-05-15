import { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import './CartSidebar.css';
import dishImagePlaceholder from '../../assets/hero-img.jpg';
import { getImageUrl } from '../../utils/image';
import { finalizeOrderTotal } from '../../utils/orderPricing';
import MapPicker from '../MapPicker';

const CartSidebar: FC = observer(() => {
  const { cartStore, authStore, orderStore, uiStore, menuStore } = useStore();
  const { isCartOpen, items, updateQuantity, removeFromCart, totalPrice } = cartStore;
  const navigate = useNavigate();
  const [address, setAddress] = useState(authStore.user?.address || '');
  const [showMap, setShowMap] = useState(false);
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    if (authStore.user?.address) {
      setAddress(authStore.user.address);
    }
  }, [authStore.user]);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  const { finalTotal: finalPrice, deliveryCost, discountLabel } = finalizeOrderTotal(totalPrice);
  const cartItemIds = new Set(items.map((item) => item.id));

  const buildOrderItems = () =>
    items.map((item) => ({
      dishId: item.id,
      dishTitle: item.title,
      quantity: item.quantity,
      price: item.price,
      imageUrl: item.imageUrl || '',
    }));

  const handleCheckoutAuth = async () => {
    if (!address.trim()) {
      await uiStore.alert('Пожалуйста, укажите адрес доставки перед оформлением заказа.', {
        title: 'Адрес доставки',
        variant: 'error',
      });
      return;
    }

    const success = await orderStore.createOrder(buildOrderItems(), address.trim());
    if (success) {
      cartStore.clearCart();
      cartStore.setIsCartOpen(false);
      navigate('/profile');
    }
  };

  const handleCheckoutClick = async () => {
    orderStore.clearError();
    if (!address.trim()) {
      await uiStore.alert('Пожалуйста, укажите адрес доставки перед оформлением заказа.', {
        title: 'Адрес доставки',
        variant: 'error',
      });
      return;
    }
    if (!authStore.isAuth) {
      setShowGuestCheckout(true);
      return;
    }
    await handleCheckoutAuth();
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) {
      await uiStore.alert('Укажите имя и телефон — так мы сможем связаться по заказу.', {
        title: 'Контакты',
        variant: 'error',
      });
      return;
    }
    if (!address.trim()) {
      await uiStore.alert('Укажите адрес доставки.', {
        title: 'Адрес доставки',
        variant: 'error',
      });
      return;
    }

    const success = await orderStore.createOrder(buildOrderItems(), address.trim(), {
      name: guestName.trim(),
      phone: guestPhone.trim(),
      email: guestEmail.trim() || undefined,
    });

    if (success) {
      cartStore.clearCart();
      setShowGuestCheckout(false);
      cartStore.setIsCartOpen(false);
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      await uiStore.alert('Спасибо! Заказ принят. Мы свяжемся с вами для подтверждения.', {
        title: 'Заказ оформлен',
        variant: 'success',
      });
    }
  };

  const portalContent = (
    <>
      {showMap && (
        <MapPicker onClose={() => setShowMap(false)} onAddressSelect={(addr) => setAddress(addr)} />
      )}
      {showGuestCheckout && (
        <div
          className="guest-checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-checkout-title"
          onClick={() => setShowGuestCheckout(false)}
        >
          <div className="guest-checkout-dialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="guest-checkout-close" onClick={() => setShowGuestCheckout(false)} aria-label="Закрыть">
              ×
            </button>
            <h3 id="guest-checkout-title" className="guest-checkout-title">
              Контакты для заказа
            </h3>
            <p className="guest-checkout-hint">Оставьте данные — мы подтвердим заказ по телефону.</p>
            <form onSubmit={handleGuestSubmit}>
              <label className="guest-checkout-label">
                Имя *
                <input
                  className="guest-checkout-input"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="guest-checkout-label">
                Телефон *
                <input
                  className="guest-checkout-input"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="guest-checkout-label">
                Email
                <input
                  className="guest-checkout-input"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <p className="guest-checkout-mini">
                Адрес доставки: <strong>{address || 'не указан'}</strong>
              </p>
              <div className="guest-checkout-actions">
                <button type="button" className="guest-checkout-btn ghost" onClick={() => setShowGuestCheckout(false)}>
                  Отмена
                </button>
                <button type="submit" className="guest-checkout-btn primary" disabled={orderStore.isLoading}>
                  {orderStore.isLoading ? 'Отправка…' : 'Подтвердить заказ'}
                </button>
              </div>
              {orderStore.error && <div className="guest-checkout-error">{orderStore.error}</div>}
            </form>
          </div>
        </div>
      )}
      <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => cartStore.setIsCartOpen(false)} />
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Корзина</h2>
          <button type="button" className="close-cart-btn" onClick={() => cartStore.setIsCartOpen(false)}>
            &times;
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart">
              <span style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</span>
              <p>Ваша корзина пуста</p>
              <span style={{ fontSize: '0.9rem' }}>Добавьте блюда из меню, чтобы оформить заказ</span>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={getImageUrl(item.imageUrl) || dishImagePlaceholder} alt={item.title} className="cart-item-img" />
                <div className="cart-item-info">
                  <h4 className="cart-item-title">{item.title}</h4>
                  <div className="cart-item-price">{item.price} ₽</div>
                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <button type="button" className="remove-btn" onClick={() => removeFromCart(item.id)}>
                      Удалить
                    </button>
                  </div>
                  {(() => {
                    const linked = item.recommendedDishId
                      ? menuStore.dishes.find((dish) => dish.id === item.recommendedDishId)
                      : null;
                    if (!linked) return null;
                    const alreadyInCart = cartItemIds.has(linked.id);
                    return (
                      <div className="cart-recommendation">
                        <div className="cart-recommendation-label">Рекомендуем с этим</div>
                        <div className="cart-recommendation-row">
                          <img
                            className="cart-recommendation-img"
                            src={getImageUrl(linked.imageUrl) || dishImagePlaceholder}
                            alt={linked.title}
                          />
                          <div className="cart-recommendation-meta">
                            <div className="cart-recommendation-title">{linked.title}</div>
                            <div className="cart-recommendation-price">{linked.price} ₽</div>
                          </div>
                          <button
                            type="button"
                            className="cart-recommendation-add"
                            disabled={alreadyInCart}
                            onClick={() => cartStore.addToCart(linked)}
                          >
                            {alreadyInCart ? 'Уже в корзине' : 'Добавить'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-secondary)' }}>
              <span>Стоимость товаров:</span>
              <span>{totalPrice} ₽</span>
            </div>
            {discountLabel && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#28a745',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                }}
              >
                <span>Скидка по лояльности:</span>
                <span>{discountLabel}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.9rem', color: 'var(--color-secondary)' }}>
              <span>Доставка:</span>
              <span style={{ fontWeight: deliveryCost === 0 ? 'bold' : 'normal', color: deliveryCost === 0 ? '#28a745' : 'inherit' }}>
                {deliveryCost === 0 ? 'Бесплатно' : `${deliveryCost} ₽`}
              </span>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Адрес доставки:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Введите адрес доставки"
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  style={{
                    padding: '0 10px',
                    backgroundColor: '#eee',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  📍
                </button>
              </div>
            </div>

            <div className="cart-total" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <span className="cart-total-label">Итого:</span>
              <span className="cart-total-value">{finalPrice} ₽</span>
            </div>

            {orderStore.error && !showGuestCheckout && (
              <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '10px', textAlign: 'center' }}>{orderStore.error}</div>
            )}

            <button type="button" className="checkout-btn" onClick={handleCheckoutClick} disabled={orderStore.isLoading}>
              {orderStore.isLoading ? 'Оформление...' : 'Оформить заказ'}
            </button>
            {!authStore.isAuth && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-accent-gray)', marginTop: '12px', textAlign: 'center', marginBottom: 0 }}>
                Регистрация не обязательна — откроется форма с именем и телефоном.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(portalContent, document.getElementById('root')!);
});

export default CartSidebar;
