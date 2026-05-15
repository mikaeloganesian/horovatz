import { makeAutoObservable, runInAction } from "mobx";
import type { Dish, Category } from "../types";
import $api from "../api/axios";

export default class MenuStore {
    categories: Category[] = [];
    dishes: Dish[] = [];
    isLoading: boolean = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    async fetchCategories() {
        this.isLoading = true;
        try {
            const response = await $api.get<Category[]>('/categories');
            runInAction(() => {
                this.categories = response.data;
                this.isLoading = false;
            });
        } catch (e) {
            runInAction(() => {
                this.error = "Failed to load categories";
                this.isLoading = false;
            });
        }
    }

    async fetchDishes() {
        this.isLoading = true;
        try {
            const response = await $api.get<Dish[]>('/dishes');
            runInAction(() => {
                this.dishes = response.data;
                this.isLoading = false;
            });
        } catch (e) {
            runInAction(() => {
                this.error = "Failed to load dishes";
                this.isLoading = false;
            });
        }
    }
}
