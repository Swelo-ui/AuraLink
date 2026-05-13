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
            {/* Toast Container - bottom on mobile for thumb reach */}
            <div className="fixed bottom-20 md:top-4 md:bottom-auto left-4 right-4 md:left-auto md:right-4 z-[300] flex flex-col gap-2 pointer-events-none md:max-w-sm md:w-full">
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

    const styles = {
        success: { icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />, border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
        error: { icon: <AlertCircle size={18} className="text-red-400 shrink-0" />, border: 'border-red-500/20', bg: 'bg-red-500/5' },
        info: { icon: <Info size={18} className="text-aura-primary-light shrink-0" />, border: 'border-aura-primary/20', bg: 'bg-aura-primary/5' },
    };

    const { icon, border, bg } = styles[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto glass-strong ${border} ${bg} rounded-xl p-3.5 shadow-2xl flex items-center gap-3`}
        >
            {icon}
            <p className="text-sm text-white font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 text-aura-lavender/30 hover:text-white transition-colors shrink-0"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
