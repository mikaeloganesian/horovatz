import { type FC, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import {
  clearPendingPayment,
  isOrderPaid,
  loadPendingPayment,
  orderStatusLabel,
  savePendingPayment,
} from '../../utils/orderStatus';
import './PaymentReturn.css';

type PageState = 'loading' | 'success' | 'failed' | 'pending';

const PaymentReturnPage: FC = observer(() => {
  const { orderStore, cartStore, authStore } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PageState>('loading');
  const [retrying, setRetrying] = useState(false);

  const orderId = Number(searchParams.get('orderId') || loadPendingPayment()?.orderId || 0);
  const token = searchParams.get('token') || loadPendingPayment()?.token || '';

  useEffect(() => {
    if (!orderId || !token) {
      setState('failed');
      return;
    }

    savePendingPayment({ orderId, token });

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const result = await orderStore.fetchPaymentStatus(orderId, token);
      if (cancelled) return;

      if (!result) {
        if (attempts >= 15) setState('pending');
        else setTimeout(poll, 2000);
        return;
      }

      if (isOrderPaid(result.status)) {
        clearPendingPayment();
        cartStore.clearCart();
        setState('success');
        return;
      }

      if (result.status === 'payment_canceled') {
        setState('failed');
        return;
      }

      if (attempts < 15) {
        setTimeout(poll, 2000);
      } else {
        setState('pending');
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, token, orderStore, cartStore]);

  const handleRetry = async () => {
    if (!orderId || !token) return;
    setRetrying(true);
    const url = await orderStore.retryPayment(orderId, token);
    setRetrying(false);
    if (url) window.location.href = url;
  };

  const goNext = () => {
    navigate(authStore.isAuth ? '/profile' : '/menu');
  };

  const messages: Record<PageState, string> = {
    loading: 'Проверяем статус оплаты…',
    success: 'Оплата прошла успешно! Мы свяжемся с вами для подтверждения доставки.',
    failed: 'Оплата не завершена. Вы можете попробовать снова.',
    pending: 'Оплата обрабатывается. Если деньги списались — мы подтвердим заказ по телефону.',
  };

  return (
    <div className="payment-return-page">
      <div className={`payment-return-card payment-return-card--${state === 'loading' ? 'pending' : state}`}>
        <h1>Оплата заказа</h1>
        {orderId > 0 && <p className="payment-return-order">Заказ #{orderId}</p>}
        <p className="payment-return-message">{messages[state]}</p>
        {orderStore.error && <p className="payment-return-error">{orderStore.error}</p>}

        <div className="payment-return-actions">
          {state === 'success' && (
            <button type="button" className="payment-return-btn payment-return-btn--primary" onClick={goNext}>
              {authStore.isAuth ? 'К моим заказам' : 'В меню'}
            </button>
          )}
          {state === 'failed' && (
            <>
              <button
                type="button"
                className="payment-return-btn payment-return-btn--primary"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? 'Подготовка…' : 'Оплатить снова'}
              </button>
              <Link to="/menu" className="payment-return-btn payment-return-btn--ghost">
                Вернуться в меню
              </Link>
            </>
          )}
          {state === 'pending' && (
            <button type="button" className="payment-return-btn payment-return-btn--primary" onClick={goNext}>
              Понятно
            </button>
          )}
        </div>

        {state === 'loading' && (
          <p className="payment-return-hint">{orderStatusLabel('pending_payment')}</p>
        )}
      </div>
    </div>
  );
});

export default PaymentReturnPage;
