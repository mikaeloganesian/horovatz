import { makeAutoObservable, runInAction } from "mobx";

export type ModalVariant = "default" | "success" | "error";

export type ModalState =
    | {
          kind: "alert";
          title?: string;
          message: string;
          variant: ModalVariant;
          onClose: () => void;
      }
    | {
          kind: "confirm";
          title?: string;
          message: string;
          confirmLabel: string;
          cancelLabel: string;
          danger: boolean;
          onResult: (ok: boolean) => void;
      };

export default class UiStore {
    modal: ModalState | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    alert(message: string, options?: { title?: string; variant?: ModalVariant }) {
        return new Promise<void>((resolve) => {
            runInAction(() => {
                this.modal = {
                    kind: "alert",
                    message,
                    title: options?.title,
                    variant: options?.variant ?? "default",
                    onClose: () => {
                        resolve();
                        runInAction(() => {
                            this.modal = null;
                        });
                    },
                };
            });
        });
    }

    confirm(
        message: string,
        options?: {
            title?: string;
            confirmLabel?: string;
            cancelLabel?: string;
            danger?: boolean;
        }
    ) {
        return new Promise<boolean>((resolve) => {
            runInAction(() => {
                this.modal = {
                    kind: "confirm",
                    message,
                    title: options?.title,
                    confirmLabel: options?.confirmLabel ?? "ОК",
                    cancelLabel: options?.cancelLabel ?? "Отмена",
                    danger: options?.danger ?? false,
                    onResult: (ok: boolean) => {
                        resolve(ok);
                        runInAction(() => {
                            this.modal = null;
                        });
                    },
                };
            });
        });
    }
}
