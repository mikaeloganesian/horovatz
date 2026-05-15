import { makeAutoObservable, runInAction } from "mobx";
import type { Dish, Category } from "../types";
import type { User } from "./AuthStore";
import type { Order } from "./OrderStore";
import $api from "../api/axios";

export default class AdminStore {
    isLoading: boolean = false;
    error: string | null = null;
    users: User[] = [];
    orders: Order[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    clearError() {
        this.error = null;
    }

    async createCategory(category: Category) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.post('/categories', category);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось создать категорию";
                this.isLoading = false;
            });
            return false;
        }
    }

    async updateCategory(id: string, data: { title: string; subtitle: string; icon: string }) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.put(`/categories/${id}`, data);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось обновить категорию";
                this.isLoading = false;
            });
            return false;
        }
    }

    async deleteCategory(id: string) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.delete(`/categories/${id}`);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось удалить категорию";
                this.isLoading = false;
            });
            return false;
        }
    }

    async createDish(dish: Dish) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.post('/dishes', dish);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось создать блюдо";
                this.isLoading = false;
            });
            return false;
        }
    }

    async updateDish(id: string, dish: Partial<Dish>) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.put(`/dishes/${id}`, dish);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось обновить блюдо";
                this.isLoading = false;
            });
            return false;
        }
    }

    async deleteDish(id: string) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.delete(`/dishes/${id}`);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось удалить блюдо";
                this.isLoading = false;
            });
            return false;
        }
    }

    async uploadImage(file: File) {
        try {
            this.isLoading = true;
            this.error = null;
            const formData = new FormData();
            formData.append('image', file);
            const response = await $api.post<{ url: string }>('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            runInAction(() => { this.isLoading = false; });
            return response.data.url;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось загрузить изображение";
                this.isLoading = false;
            });
            return null;
        }
    }

    async fetchUsers() {
        try {
            this.isLoading = true;
            this.error = null;
            const response = await $api.get<User[]>('/admin/users');
            runInAction(() => {
                this.users = response.data;
                this.isLoading = false;
            });
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось загрузить пользователей";
                this.isLoading = false;
            });
        }
    }

    async updateUser(id: number, body: { name: string; phone: string; address: string; role: string }) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.put(`/admin/users/${id}`, body);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось обновить пользователя";
                this.isLoading = false;
            });
            return false;
        }
    }

    async deleteUser(id: number) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.delete(`/admin/users/${id}`);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось удалить пользователя";
                this.isLoading = false;
            });
            return false;
        }
    }

    async fetchAllOrders() {
        try {
            this.isLoading = true;
            this.error = null;
            const response = await $api.get<Order[]>('/admin/orders');
            runInAction(() => {
                this.orders = response.data;
                this.isLoading = false;
            });
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось загрузить заказы";
                this.isLoading = false;
            });
        }
    }

    async updateOrder(id: number, body: { status: string; deliveryAddress: string }) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.put(`/admin/orders/${id}`, body);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось обновить заказ";
                this.isLoading = false;
            });
            return false;
        }
    }

    async deleteOrder(id: number) {
        try {
            this.isLoading = true;
            this.error = null;
            await $api.delete(`/admin/orders/${id}`);
            runInAction(() => { this.isLoading = false; });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.error = e.response?.data?.error || "Не удалось удалить заказ";
                this.isLoading = false;
            });
            return false;
        }
    }
}
