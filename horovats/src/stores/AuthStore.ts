import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/axios";

export interface User {
    id: number;
    email: string;
    phone: string;
    name: string;
    address: string;
    role: string;
    created_at?: string;
}

export default class AuthStore {
    user: User | null = null;
    isAuth: boolean = false;
    isLoading: boolean = true;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.checkAuth();
    }

    setAuth(bool: boolean) {
        this.isAuth = bool;
    }

    setUser(user: User | null) {
        this.user = user;
    }

    setError(err: string | null) {
        this.error = err;
    }

    async login(email: string, password: string) {
        try {
            this.isLoading = true;
            this.setError(null);
            const response = await $api.post<{token: string, user: User}>('/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            runInAction(() => {
                this.setAuth(true);
                this.setUser(response.data.user);
                this.isLoading = false;
            });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.setError(e.response?.data?.error || "Login failed");
                this.isLoading = false;
            });
            return false;
        }
    }

    async register(email: string, phone: string, name: string, password: string) {
        try {
            this.isLoading = true;
            this.setError(null);
            await $api.post('/auth/register', { email, phone, name, password });
            runInAction(() => {
                this.isLoading = false;
            });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.setError(e.response?.data?.error || "Registration failed");
                this.isLoading = false;
            });
            return false;
        }
    }

    async updateProfile(name: string, phone: string, address: string) {
        try {
            this.isLoading = true;
            this.setError(null);
            const response = await $api.put<User>('/users/profile', { name, phone, address });
            runInAction(() => {
                this.setUser(response.data);
                this.isLoading = false;
            });
            return true;
        } catch (e: any) {
            runInAction(() => {
                this.setError(e.response?.data?.error || "Failed to update profile");
                this.isLoading = false;
            });
            return false;
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.setAuth(false);
        this.setUser(null);
    }

    async checkAuth() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                runInAction(() => {
                    this.isLoading = false;
                });
                return;
            }
            const response = await $api.get<User>('/users/profile');
            runInAction(() => {
                this.setAuth(true);
                this.setUser(response.data);
                this.isLoading = false;
            });
        } catch (e) {
            runInAction(() => {
                this.setAuth(false);
                this.setUser(null);
                this.isLoading = false;
            });
            localStorage.removeItem('token');
        }
    }
}
