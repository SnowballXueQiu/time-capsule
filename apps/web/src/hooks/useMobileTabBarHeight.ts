"use client";

import { useState, useEffect } from "react";

export function useMobileTabBarHeight() {
  const [height, setHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const updateHeight = () => {
      checkMobile();
      if (window.innerWidth < 768) {
        const tabBar = document.querySelector(".mobile-tab-bar");
        if (tabBar) {
          const rect = tabBar.getBoundingClientRect();
          setHeight(rect.height);
        } else {
          // Fallback height if tab bar not found yet
          setHeight(72);
        }
      } else {
        setHeight(0);
      }
    };

    // Initial measurement
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Use ResizeObserver for more accurate detection
    const resizeObserver = new ResizeObserver(updateHeight);
    const tabBar = document.querySelector(".mobile-tab-bar");
    if (tabBar) {
      resizeObserver.observe(tabBar);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  return { height, isMobile };
}
