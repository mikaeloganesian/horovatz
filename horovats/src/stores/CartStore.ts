import { makeAutoObservable } from "mobx";
import type { Dish, CartItem } from "../types";

export default class CartStore {
    items: CartItem[] = [];
    isCartOpen: boolean = false;

    constructor() {
        makeAutoObservable(this);
    }

    addToCart = (dish: Dish) => {
        const existingItem = this.items.find((item) => item.id === dish.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({ ...dish, quantity: 1 });
        }
        this.isCartOpen = true;
    };

    removeFromCart = (dishId: string) => {
        this.items = this.items.filter((item) => item.id !== dishId);
    };

    updateQuantity = (dishId: string, quantity: number) => {
        if (quantity <= 0) {
            this.removeFromCart(dishId);
            return;
        }
        const item = this.items.find((i) => i.id === dishId);
        if (item) {
            item.quantity = quantity;
        }
    };

    clearCart = () => {
        this.items = [];
    };

    setIsCartOpen = (isOpen: boolean) => {
        this.isCartOpen = isOpen;
    };

    get totalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    get totalPrice() {
        return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
}
