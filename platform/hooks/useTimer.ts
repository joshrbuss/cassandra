"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTimerReturn {
  elapsedMs: number;
  isRunning: boolean;
  start: () => void;
  stop: () => number; // returns final elapsed ms
  reset: () => void;
}

/**
 * Count-up timer with ms precision.
 * Updates at ~100ms intervals (smooth enough for display, not CPU-heavy).
 */
export function useTimer(): UseTimerReturn {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    clear();
    startTimeRef.current = Date.now() - elapsedMs;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()));
    }, 100);
  }, [elapsedMs]);

  const stop = useCallback((): number => {
    clear();
    setIsRunning(false);
    const final = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : elapsedMs;
    setElapsedMs(final);
    return final;
  }, [elapsedMs]);

  const reset = useCallback(() => {
    clear();
    setIsRunning(false);
    setElapsedMs(0);
    startTimeRef.current = null;
  }, []);

  useEffect(() => () => clear(), []);

  return { elapsedMs, isRunning, start, stop, reset };
}
