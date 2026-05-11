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
            className="flex flex-col items-center justify-center gap-4"
        >
            {/* Animated logo pulse */}
            <div className="relative">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-aura-primary to-aura-pink flex items-center justify-center shadow-lg shadow-aura-primary/30"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
                    </svg>
                </motion.div>
                {/* Orbiting dot */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0"
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-aura-teal rounded-full shadow-lg shadow-aura-teal/50" />
                </motion.div>
            </div>

            {/* Loading text */}
            <div className="flex flex-col items-center gap-1">
                <p className="text-white font-semibold text-sm">{message}</p>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
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
                <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                    <div
                        className={`rounded-2xl ${i % 2 === 0 ? 'bg-aura-panel/50' : 'bg-aura-primary/20'} animate-pulse`}
                        style={{
                            width: `${Math.random() * 40 + 30}%`,
                            height: `${Math.random() * 20 + 40}px`,
                        }}
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
        <div className="space-y-2 px-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-aura-border/50" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-aura-border/50 rounded w-24" />
                        <div className="h-2 bg-aura-border/30 rounded w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}
