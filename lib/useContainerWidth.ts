"use client";

import { useEffect, useRef, useState } from "react";

/** Tracks an element's content width via ResizeObserver. */
export function useContainerWidth<T extends HTMLElement>(initial = 400) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
