import { useEffect, useRef } from 'react';

/**
 * useLiveSync hook connects to the backend Server-Sent Events stream (/api/events)
 * and triggers onUpdate whenever database events occur, with automatic polling fallback.
 */
export function useLiveSync(onUpdate, pollIntervalMs = 3000) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let eventSource = null;
    let isMounted = true;

    function initSSE() {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data && data.type !== 'CONNECTED') {
              if (onUpdateRef.current) onUpdateRef.current(data);
            }
          } catch {
            // keepalive or non-json message
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect in 5 seconds
          if (isMounted) {
            setTimeout(initSSE, 5000);
          }
        };
      } catch (err) {
        console.warn('SSE connection unavailable, relying on polling fallback:', err);
      }
    }

    initSSE();

    // Polling fallback to guarantee continuous sync across multiple devices
    const interval = setInterval(() => {
      if (isMounted && onUpdateRef.current) {
        onUpdateRef.current({ type: 'POLL_SYNC' });
      }
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [pollIntervalMs]);
}
