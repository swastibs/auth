import { Suspense } from "react";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";

const DEFERRED_OPTIONS = { rootMargin: "240px 0px" };

/** Defers a heavy interactive module until it is near the viewport. */
export default function DeferredModule({ children, minHeight = "min-h-96" }) {
  const { ref, isVisible } = useIntersectionObserver(DEFERRED_OPTIONS);
  return (
    <div ref={ref} className={minHeight}>
      {isVisible ? (
        <Suspense
          fallback={
            <div className="grid min-h-96 place-items-center text-sm text-muted-foreground">
              Loading preview...
            </div>
          }
        >
          {children}
        </Suspense>
      ) : null}
    </div>
  );
}
