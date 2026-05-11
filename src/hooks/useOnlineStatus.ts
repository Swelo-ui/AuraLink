import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline status with debouncing
 * to avoid flickering on unstable connections.
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const handleOnline = () => {
            clearTimeout(timeout);
            setIsOnline(true);
        };

        const handleOffline = () => {
            // Debounce offline detection to avoid false positives
            clearTimeout(timeout);
            timeout = setTimeout(() => setIsOnline(false), 1000);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
