import { useState, useRef, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    className?: string;
}

/**
 * Pull-to-refresh wrapper for mobile users.
 * Wraps scrollable content and triggers refresh on pull-down gesture.
 */
export default function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const THRESHOLD = 80;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!startY.current || isRefreshing) return;
        if (containerRef.current && containerRef.current.scrollTop > 0) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply resistance
            const distance = Math.min(diff * 0.4, THRESHOLD * 1.5);
            setPullDistance(distance);
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD * 0.6);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
        startY.current = 0;
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            ref={containerRef}
            className={clsx('relative overflow-y-auto', className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 z-10"
                style={{ transform: `translateY(${pullDistance - 40}px)` }}
            >
                <div className={clsx(
                    'w-8 h-8 rounded-full bg-aura-panel border border-aura-border flex items-center justify-center shadow-lg transition-all',
                    pullDistance >= THRESHOLD && 'bg-aura-primary border-aura-primary'
                )}>
                    <RefreshCw
                        size={16}
                        className={clsx(
                            'text-aura-lavender/60 transition-all',
                            pullDistance >= THRESHOLD && 'text-white',
                            isRefreshing && 'animate-spin'
                        )}
                        style={{ transform: `rotate(${pullDistance * 2}deg)` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div style={{ transform: `translateY(${pullDistance * 0.3}px)`, transition: pullDistance === 0 ? 'transform 0.2s ease' : 'none' }}>
                {children}
            </div>
        </div>
    );
}
