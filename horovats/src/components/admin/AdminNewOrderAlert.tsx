import { type FC, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import $api from '../../api/axios';
import type { Order } from '../../stores/OrderStore';

const POLL_MS = 12_000;
const BEEP_INTERVAL_MS = 900;
const BEEP_DURATION_S = 0.22;
const BEEP_FREQ = 880;

/**
 * Для админа: опрос новых заказов; пока вкладка в фоне — повторяющийся звук до переключения на вкладку.
 */
const AdminNewOrderAlert: FC = observer(() => {
  const { authStore } = useStore();
  const lastMaxOrderIdRef = useRef<number | null>(null);
  const beepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopBeeping = () => {
    if (beepTimerRef.current !== null) {
      clearInterval(beepTimerRef.current);
      beepTimerRef.current = null;
    }
  };

  const playOneBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctx();
        audioCtxRef.current = ctx;
      }
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(BEEP_FREQ, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + BEEP_DURATION_S);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + BEEP_DURATION_S);
    } catch {
      /* autoplay / AudioContext */
    }
  };

  const startBeeping = () => {
    if (beepTimerRef.current !== null) return;
    playOneBeep();
    beepTimerRef.current = setInterval(playOneBeep, BEEP_INTERVAL_MS);
  };

  useEffect(() => {
    const onVisibleOrFocus = () => {
      if (!document.hidden) {
        stopBeeping();
      }
    };
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener('focus', onVisibleOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener('focus', onVisibleOrFocus);
    };
  }, []);

  useEffect(() => {
    const isAdmin = authStore.isAuth && authStore.user?.role === 'admin';
    if (!isAdmin) {
      lastMaxOrderIdRef.current = null;
      stopBeeping();
      return;
    }

    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await $api.get<Order[]>('/admin/orders');
        if (cancelled || !data) return;
        const paidOrders = data.filter((o) => o.status !== 'pending_payment' && o.status !== 'payment_canceled');
        if (paidOrders.length === 0) {
          if (lastMaxOrderIdRef.current === null) {
            lastMaxOrderIdRef.current = 0;
          }
          return;
        }
        const maxId = Math.max(...paidOrders.map((o) => o.id));
        const prev = lastMaxOrderIdRef.current;
        if (prev === null) {
          lastMaxOrderIdRef.current = maxId;
          return;
        }
        if (maxId > prev) {
          lastMaxOrderIdRef.current = maxId;
          if (document.hidden) {
            startBeeping();
          }
        }
      } catch {
        /* 401 и т.д. — молча */
      }
    };

    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      stopBeeping();
    };
  }, [authStore.isAuth, authStore.user?.role]);

  return null;
});

export default AdminNewOrderAlert;
