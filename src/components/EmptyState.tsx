import { type ReactNode } from 'react';
import { motion } from 'motion/react';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center justify-center h-full text-center p-8 gap-5"
        >
            <div className="w-16 h-16 bg-aura-surface rounded-2xl flex items-center justify-center border border-aura-border/50 shadow-inner">
                {icon}
            </div>
            <div className="space-y-2">
                <h3 className="text-white font-bold text-lg">{title}</h3>
                <p className="text-aura-lavender/40 text-sm max-w-[280px] mx-auto leading-relaxed">
                    {description}
                </p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-1 px-6 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-md shadow-aura-primary/20"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}
