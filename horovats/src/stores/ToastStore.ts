import { makeAutoObservable, runInAction } from "mobx";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
}

export default class ToastStore {
    items: ToastItem[] = [];
    private defaultDurationMs = 4500;

    constructor() {
        makeAutoObservable(this);
    }

    success(message: string, durationMs?: number) {
        this.push(message, "success", durationMs);
    }

    error(message: string, durationMs?: number) {
        this.push(message, "error", durationMs ?? 7000);
    }

    info(message: string, durationMs?: number) {
        this.push(message, "info", durationMs);
    }

    push(message: string, variant: ToastVariant = "info", durationMs?: number) {
        const id =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const ms = durationMs ?? this.defaultDurationMs;
        runInAction(() => {
            this.items.push({ id, message, variant });
        });
        window.setTimeout(() => {
            this.dismiss(id);
        }, ms);
    }

    dismiss = (id: string) => {
        runInAction(() => {
            this.items = this.items.filter((t) => t.id !== id);
        });
    };

    clear() {
        runInAction(() => {
            this.items = [];
        });
    }
}
