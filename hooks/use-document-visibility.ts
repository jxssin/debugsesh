// hooks/use-document-visibility.ts

import { useEffect } from 'react';

/**
 * Custom hook that detects when a browser tab becomes visible or hidden
 * but prevents automatic refresh when the tab becomes visible again
 * 
 * @param onVisibleCallback Optional callback that runs when page becomes visible
 * @param onHiddenCallback Optional callback that runs when page becomes hidden
 */
export function useDocumentVisibility(
  onVisibleCallback?: () => void,
  onHiddenCallback?: () => void
) {
  useEffect(() => {
    let wasHidden = false;
    
    // Function to handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is now hidden
        wasHidden = true;
        onHiddenCallback?.();
      } else if (document.visibilityState === 'visible' && wasHidden) {
        // Page is now visible after being hidden
        wasHidden = false;
        onVisibleCallback?.();
      }
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisibleCallback, onHiddenCallback]);
}