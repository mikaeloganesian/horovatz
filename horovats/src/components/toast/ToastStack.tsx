import { type FC } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import './ToastStack.css';

const ToastStack: FC = observer(() => {
  const { toastStore } = useStore();

  if (toastStore.items.length === 0) return null;

  return createPortal(
    <div className="toast-stack" aria-live="polite">
      {toastStore.items.map((t) => (
        <div key={t.id} className={`toast toast--${t.variant}`} role="status">
          <span className="toast-text">{t.message}</span>
          <button type="button" className="toast-close" aria-label="Закрыть" onClick={() => toastStore.dismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
});

export default ToastStack;
