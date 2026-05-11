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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full text-center p-8 gap-4"
        >
            <div className="w-20 h-20 bg-aura-panel rounded-2xl flex items-center justify-center border border-aura-border shadow-inner">
                {icon}
            </div>
            <div className="space-y-1.5">
                <h3 className="text-white font-bold text-lg">{title}</h3>
                <p className="text-aura-lavender/50 text-sm max-w-xs mx-auto leading-relaxed">
                    {description}
                </p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-2 px-6 py-2.5 bg-aura-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-aura-primary/20"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}
