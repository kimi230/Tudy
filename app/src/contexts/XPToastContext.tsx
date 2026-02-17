import { createContext, useState, useCallback, type ReactNode } from 'react';
import XPToast from '../components/rewards/XPToast';

interface ToastItem {
  id: number;
  xp: number;
  label: string;
}

export interface XPToastContextType {
  showXPToast: (xp: number, label: string) => void;
}

export const XPToastContext = createContext<XPToastContextType | null>(null);

let toastId = 0;

export function XPToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showXPToast = useCallback((xp: number, label: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, xp, label }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <XPToastContext.Provider value={{ showXPToast }}>
      {children}
      {toasts.map((t) => (
        <XPToast key={t.id} xp={t.xp} label={t.label} onDone={() => removeToast(t.id)} />
      ))}
    </XPToastContext.Provider>
  );
}
