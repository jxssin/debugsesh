// hooks/useWalletRefresh.ts

import { useEffect } from 'react';

/**
 * Custom hook that manages refreshing wallet balances based on defined criteria:
 * - Only refreshes Developer and Funder wallets when:
 *   1. Refreshing the browser
 *   2. Switching tabs from a different website to the app
 *   3. Switching from a sidebar within the app back to the app
 * 
 * @param refreshMainWalletsOnly Function to refresh only the main wallets (Developer + Funder)
 */
export function useWalletRefresh(refreshMainWalletsOnly: () => Promise<void>) {
  useEffect(() => {
    let wasHidden = false;
    let lastFocusTime = 0;
    const visibilityThreshold = 1000; // 1 second threshold to prevent multiple refreshes
    
    // Function to handle visibility changes
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.visibilityState === 'hidden') {
        // Page is now hidden
        wasHidden = true;
      } else if (document.visibilityState === 'visible' && wasHidden) {
        // Page is now visible after being hidden
        wasHidden = false;
        
        // Only refresh if enough time has passed since last refresh
        if (now - lastFocusTime > visibilityThreshold) {
          lastFocusTime = now;
          refreshMainWalletsOnly();
        }
      }
    };

    // Function to handle window focus (for tab switching)
    const handleFocus = () => {
      const now = Date.now();
      
      // Only refresh if enough time has passed since last refresh
      if (now - lastFocusTime > visibilityThreshold) {
        lastFocusTime = now;
        refreshMainWalletsOnly();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial refresh when component mounts
    refreshMainWalletsOnly();
    lastFocusTime = Date.now();

    // Cleanup event listeners on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshMainWalletsOnly]);
}