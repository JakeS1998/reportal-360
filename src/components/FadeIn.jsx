import React, { useEffect, useState } from "react";

export default function FadeIn({ children, className, delay = 0 }) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setM(true), 10 + delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`transition-all duration-500 ease-out ${m ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"} ${className || ""}`}>
      {children}
    </div>
  );
}