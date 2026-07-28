import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const ConfirmDialogContext = createContext(null);

// Replaces window.confirm()/window.alert() with a styled dialog that matches
// the rest of the app instead of the browser's own "localhost says" chrome.
// Mounted once near the root (see App.jsx); any component calls
// useConfirmDialog() to get `confirm()`/`alert()`, both of which resolve the
// same way their native counterparts did (confirm -> boolean, alert -> void)
// so call sites barely change shape, just `await` instead of a blocking call.
export function ConfirmDialogProvider({ children }) {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const open = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog(options);
    });
  }, []);

  function close(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }

  const confirm = useCallback(
    ({ message, danger = true, confirmLabel, cancelLabel } = {}) =>
      open({ variant: 'confirm', message, danger, confirmLabel, cancelLabel }),
    [open],
  );

  const alertDialog = useCallback(
    ({ message, tone = 'warning' } = {}) => open({ variant: 'alert', message, tone }),
    [open],
  );

  useEffect(() => {
    if (!dialog) return undefined;
    // Default focus onto the safer action — Cancel for a destructive confirm
    // (so a stray Enter key doesn't delete anything), OK for a plain alert.
    (dialog.variant === 'confirm' ? cancelBtnRef : confirmBtnRef).current?.focus();
    function handleKey(e) {
      if (e.key === 'Escape') close(dialog.variant === 'confirm' ? false : undefined);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  // Red for an active "you're about to delete this" confirmation; amber for
  // a plain "here's why that didn't happen" alert — visually distinct so a
  // blocked action doesn't read as alarming as the destructive prompt itself.
  const isDanger = dialog?.variant === 'confirm' && dialog.danger;

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert: alertDialog }}>
      {children}
      {dialog && (
        <div className="confirm-backdrop" onClick={() => close(dialog.variant === 'confirm' ? false : undefined)}>
          <div
            className="confirm-card"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirm-icon ${isDanger ? 'confirm-icon-danger' : 'confirm-icon-info'}`}>
              {isDanger ? <AlertTriangle size={20} strokeWidth={2} /> : <Info size={20} strokeWidth={2} />}
            </div>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              {dialog.variant === 'confirm' && (
                <button
                  ref={cancelBtnRef}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => close(false)}
                >
                  {dialog.cancelLabel ?? t('common.cancel')}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                type="button"
                className={dialog.variant === 'confirm' && dialog.danger ? 'btn btn-danger' : 'btn'}
                onClick={() => close(dialog.variant === 'confirm' ? true : undefined)}
              >
                {dialog.variant === 'confirm' ? dialog.confirmLabel ?? t('common.delete') : t('common.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  return ctx;
}
