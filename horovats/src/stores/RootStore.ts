import AuthStore from "./AuthStore";
import MenuStore from "./MenuStore";
import CartStore from "./CartStore";
import AdminStore from "./AdminStore";
import OrderStore from "./OrderStore";
import UiStore from "./UiStore";
import ToastStore from "./ToastStore";

export class RootStore {
    authStore: AuthStore;
    menuStore: MenuStore;
    cartStore: CartStore;
    adminStore: AdminStore;
    orderStore: OrderStore;
    uiStore: UiStore;
    toastStore: ToastStore;

    constructor() {
        this.authStore = new AuthStore();
        this.menuStore = new MenuStore();
        this.cartStore = new CartStore();
        this.adminStore = new AdminStore();
        this.orderStore = new OrderStore();
        this.uiStore = new UiStore();
        this.toastStore = new ToastStore();
    }
}

export const rootStore = new RootStore();
