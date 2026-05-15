/**
 * Cart totals for display. Must match horovats-backend/handlers/orders.go finalizeOrderTotal.
 */
export function finalizeOrderTotal(subtotal: number): {
  finalTotal: number;
  deliveryCost: number;
  discountLabel: string;
} {
  let discounted = subtotal;
  let deliveryCost = 399;
  let discountLabel = '';

  if (subtotal >= 10000) {
    discounted = subtotal * 0.8;
    discountLabel = '-20%';
    deliveryCost = 0;
  } else if (subtotal >= 5000) {
    discounted = subtotal * 0.85;
    discountLabel = '-15%';
  } else if (subtotal >= 3000) {
    discounted = subtotal * 0.9;
    discountLabel = '-10%';
  }

  return {
    finalTotal: discounted + deliveryCost,
    deliveryCost,
    discountLabel,
  };
}
