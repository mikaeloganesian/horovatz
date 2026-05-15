import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/axios";

export interface OrderItem {
    id: number;
    dishId: string;
    dishTitle: string;
    quantity: number;
    price: number;
    imageUrl: string;
}

export interface Order {
    id: number;
    userId: number | null;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    status: string;
    totalPrice: number;
    deliveryAddress: string;
    created_at: string;
    items: OrderItem[];
}

export default class OrderStore {
    orders: Order[] = [];
    isLoading: boolean = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    clearError() {
        this.error = null;
    }

    async fetchOrders() {
        try {
            this.isLoading = true;
            const response = await $api.get<Order[]>('/orders');
            runInAction(() => {
                this.orders = response.data;
                this.isLoading = false;
            });
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Failed to load orders";
                this.isLoading = false;
            });
        }
    }

    async createOrder(
        items: { dishId: string; dishTitle: string; quantity: number; price: number; imageUrl: string }[],
        deliveryAddress: string,
        guest?: { name: string; phone: string; email?: string }
    ) {
        try {
            this.isLoading = true;
            this.error = null;
            const payload: Record<string, unknown> = { items, deliveryAddress };
            if (guest) {
                payload.guestName = guest.name;
                payload.guestPhone = guest.phone;
                payload.guestEmail = guest.email ?? '';
            }
            await $api.post('/orders', payload);
            runInAction(() => {
                this.isLoading = false;
            });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось оформить заказ";
                this.isLoading = false;
            });
            return false;
        }
    }
}
