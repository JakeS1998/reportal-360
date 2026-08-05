import { useEffect, useRef, useState } from "react";

export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (target == null || isNaN(target)) {
      setValue(0);
      return;
    }
    cancelAnimationFrame(frameRef.current);
    startTimeRef.current = null;
    const animate = (ts) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const progress = Math.min((ts - startTimeRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}