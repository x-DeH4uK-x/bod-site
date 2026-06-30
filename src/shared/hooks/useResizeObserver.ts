import { type RefObject, useEffect } from "react";

export function useResizeObserver<T extends HTMLElement>(elementRef: RefObject<T | null>, callback: ResizeObserverCallback) {
  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) return;

    const observer = new ResizeObserver(callback);
    observer.observe(currentElement);

    return () => {
      observer.unobserve(currentElement);
    };
  }, [elementRef.current, callback]);
}
