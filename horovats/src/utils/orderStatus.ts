export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Ожидает оплаты',
  payment_canceled: 'Оплата отменена',
  new: 'Новый',
  processing: 'В работе',
  completed: 'Выполнен',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function isOrderPaid(status: string): boolean {
  return status === 'new' || status === 'processing' || status === 'completed';
}

export const PENDING_PAYMENT_STORAGE_KEY = 'horovats_pending_payment';

export type PendingPaymentInfo = {
  orderId: number;
  token: string;
};

export function savePendingPayment(info: PendingPaymentInfo) {
  sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(info));
}

export function loadPendingPayment(): PendingPaymentInfo | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPaymentInfo;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
}
