"use client";

import { useEffect, useState } from "react";

export function useDarkReader() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const check = () =>
      setActive(
        !!document.querySelector('meta[name="darkreader"]') ||
          document.documentElement.hasAttribute("data-darkreader-mode"),
      );
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.head, { childList: true });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-darkreader-mode"],
    });
    return () => mo.disconnect();
  }, []);
  return active;
}
