"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";

const CloseDealDetailsContext = createContext<(() => void) | null>(null);

export function DealDetailsShell({
  initiallyOpen = false,
  children,
}: {
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(initiallyOpen);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

  return (
    <CloseDealDetailsContext.Provider value={close}>
      <details ref={detailsRef} className="group" open={open} onToggle={handleToggle}>
        {children}
      </details>
    </CloseDealDetailsContext.Provider>
  );
}

export function useCloseDealDetails() {
  return useContext(CloseDealDetailsContext);
}
