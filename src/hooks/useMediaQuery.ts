import { useState, useEffect } from 'react';

/**
 * Hook to detect responsive breakpoints.
 * Matches Tailwind's default breakpoints.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

        mql.addEventListener('change', handler);
        setMatches(mql.matches);

        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1024px)');
}

/**
 * Detect if the app is running as an installed PWA
 */
export function useIsPWA(): boolean {
    return useMediaQuery('(display-mode: standalone)');
}

/**
 * Detect if the device supports touch
 */
export function useIsTouch(): boolean {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    return isTouch;
}
