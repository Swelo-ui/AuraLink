import { motion } from 'motion/react';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingScreen({ message = 'Loading...', fullScreen = true }: LoadingScreenProps) {
    const content = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-5"
        >
            {/* Animated logo */}
            <div className="relative">
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.4)]"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
                    </svg>
                </motion.div>
                {/* Orbiting dot */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-[-8px]"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-aura-primary-light rounded-full shadow-lg shadow-aura-primary/50" />
                </motion.div>
            </div>

            {/* Loading text */}
            <div className="flex flex-col items-center gap-2">
                <p className="text-white font-semibold text-sm">{message}</p>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 bg-aura-primary rounded-full"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-[200] bg-aura-navy flex items-center justify-center">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-8 min-h-[200px]">
            {content}
        </div>
    );
}

/**
 * Skeleton loader for chat messages
 */
export function MessageSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div
                        className={`rounded-2xl ${i % 2 === 0 ? 'bg-aura-surface/50' : 'bg-aura-primary/15'} animate-shimmer`}
                        style={{ width: `${Math.random() * 40 + 30}%`, height: `${Math.random() * 20 + 40}px` }}
                    />
                </div>
            ))}
        </div>
    );
}

/**
 * Skeleton loader for sidebar connections
 */
export function ConnectionSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-2 px-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-shimmer">
                    <div className="w-10 h-10 rounded-full bg-aura-surface/50" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-aura-surface/50 rounded w-24" />
                        <div className="h-2 bg-aura-surface/30 rounded w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}
