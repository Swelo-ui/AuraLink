import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    const icons = {
        success: <CheckCircle2 size={18} className="text-green-400 shrink-0" />,
        error: <AlertCircle size={18} className="text-red-400 shrink-0" />,
        info: <Info size={18} className="text-blue-400 shrink-0" />,
    };

    const borders = {
        success: 'border-green-500/20',
        error: 'border-red-500/20',
        info: 'border-blue-500/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`pointer-events-auto bg-aura-panel/95 backdrop-blur-xl border ${borders[toast.type]} rounded-xl p-3 shadow-2xl flex items-center gap-3`}
        >
            {icons[toast.type]}
            <p className="text-sm text-white font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 text-aura-lavender/40 hover:text-white transition-colors shrink-0"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
