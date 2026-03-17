"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** CSS class for the placeholder skeleton */
  className?: string;
  /** Minimum height for the placeholder to prevent layout shift */
  minHeight?: number;
}

/**
 * Defers rendering of children until the section scrolls into view.
 * Uses IntersectionObserver with a 200px rootMargin so content loads
 * just before it becomes visible — no layout jank.
 */
export default function LazySection({ children, className, minHeight = 100 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (visible) return <>{children}</>;

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight }}
      aria-hidden
    />
  );
}
