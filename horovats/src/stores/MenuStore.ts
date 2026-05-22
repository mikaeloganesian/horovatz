import { makeAutoObservable, runInAction } from "mobx";
import type { Dish, Category } from "../types";
import $api from "../api/axios";
import { getImageUrl } from "../utils/image";
import { preloadImages } from "../utils/preloadImages";

export default class MenuStore {
    categories: Category[] = [];
    dishes: Dish[] = [];
    isLoading: boolean = false;
    initialLoadDone: boolean = false;
    error: string | null = null;

    private bootstrapPromise: Promise<void> | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    /** Loads menu + preloads dish images for the splash screen. */
    bootstrap(): Promise<void> {
        if (this.initialLoadDone) {
            return Promise.resolve();
        }
        if (this.bootstrapPromise) {
            return this.bootstrapPromise;
        }

        this.bootstrapPromise = this.runBootstrap();
        return this.bootstrapPromise;
    }

    private async runBootstrap(): Promise<void> {
        this.isLoading = true;
        this.error = null;
        try {
            const [categoriesRes, dishesRes] = await Promise.all([
                $api.get<Category[]>('/categories'),
                $api.get<Dish[]>('/dishes'),
            ]);

            const categories = categoriesRes.data;
            const dishes = dishesRes.data;
            const imageUrls = dishes
                .map((d) => getImageUrl(d.imageUrl))
                .filter((url): url is string => Boolean(url));

            await preloadImages(imageUrls);

            runInAction(() => {
                this.categories = categories;
                this.dishes = dishes;
                this.initialLoadDone = true;
            });
        } catch {
            runInAction(() => {
                this.error = "Failed to load menu";
            });
        } finally {
            runInAction(() => {
                this.isLoading = false;
            });
        }
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
