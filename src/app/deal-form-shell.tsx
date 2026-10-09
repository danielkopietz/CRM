"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { isHartmannCustomer } from "@/lib/customers";

export function DealFormShell({
  action,
  defaultCustomer,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultCustomer?: string | null;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [hartmann, setHartmann] = useState(() => isHartmannCustomer(defaultCustomer));

  useEffect(() => {
    for (const name of ["liefertermin", "po"]) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.required = hartmann;
    }
  }, [hartmann]);

  function handleChange(event: FormEvent<HTMLFormElement>) {
    const field = event.target;
    if (field instanceof HTMLSelectElement && field.name === "kunde") {
      setHartmann(isHartmannCustomer(field.value));
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      onChange={handleChange}
      data-hartmann={hartmann ? "true" : "false"}
      className="deal-form mt-4 grid gap-4"
    >
      {children}
    </form>
  );
}
