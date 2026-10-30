import usePrefersReducedMotion from "./usePrefersReducedMotion";

/** Detects constrained devices so decorative work can be reduced early. */
export default function usePerformance() {
  const reducedMotion = usePrefersReducedMotion();
  const memory =
    typeof navigator === "undefined" ? 8 : navigator.deviceMemory || 8;
  const cores =
    typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency || 8;
  const saveData =
    typeof navigator !== "undefined" && navigator.connection?.saveData === true;
  const lowSpec = memory <= 4 || cores <= 4;

  return {
    lowSpec: lowSpec || saveData,
    reducedMotion,
    animationEnabled: !reducedMotion && !lowSpec && !saveData,
  };
}
