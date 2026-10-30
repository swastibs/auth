import { useEffect, useRef, useState } from "react";

const DEFAULT_OPTIONS = {};

/** Reveals a section once, with a safe fallback when IntersectionObserver is unavailable. */
export default function useIntersectionObserver(options = DEFAULT_OPTIONS) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
