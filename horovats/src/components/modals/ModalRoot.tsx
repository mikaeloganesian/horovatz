import { type FC, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import './ModalRoot.css';

const ModalRoot: FC = observer(() => {
  const { uiStore } = useStore();
  const modal = uiStore.modal;
  const modalActive = modal != null;

  useEffect(() => {
    if (!modalActive) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const m = uiStore.modal;
      if (!m) return;
      if (m.kind === 'alert') {
        m.onClose();
      } else {
        m.onResult(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalActive]);

  if (!modal) return null;

  const overlayClick = () => {
    if (modal.kind === 'alert') {
      modal.onClose();
    } else {
      modal.onResult(false);
    }
  };

  let heading: string | undefined;
  let variantClass = '';
  if (modal.kind === 'alert') {
    heading =
      modal.title ??
      (modal.variant === 'error' ? 'Внимание' : modal.variant === 'success' ? 'Готово' : undefined);
    variantClass =
      modal.variant === 'success'
        ? 'global-modal-dialog--success'
        : modal.variant === 'error'
          ? 'global-modal-dialog--error'
          : '';
  } else {
    heading = modal.title ?? 'Подтверждение';
  }

  const content = (
    <div className="global-modal-overlay" role="presentation" onClick={overlayClick}>
      <div
        className={`global-modal-dialog global-modal-dialog--${modal.kind} ${variantClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={heading ? 'global-modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {heading && (
          <h2 id="global-modal-title" className="global-modal-title">
            {heading}
          </h2>
        )}
        <p className="global-modal-message">{modal.message}</p>
        <div className="global-modal-actions">
          {modal.kind === 'alert' && (
            <button type="button" className="global-modal-btn global-modal-btn--primary" onClick={() => modal.onClose()}>
              ОК
            </button>
          )}
          {modal.kind === 'confirm' && (
            <>
              <button type="button" className="global-modal-btn global-modal-btn--ghost" onClick={() => modal.onResult(false)}>
                {modal.cancelLabel}
              </button>
              <button
                type="button"
                className={`global-modal-btn ${modal.danger ? 'global-modal-btn--danger' : 'global-modal-btn--primary'}`}
                onClick={() => modal.onResult(true)}
              >
                {modal.confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

export default ModalRoot;
