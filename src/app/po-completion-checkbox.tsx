"use client";

import { useRef } from "react";

export function PoCompletionCheckbox({
  action,
  checked,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  checked: boolean;
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center">
      <input
        aria-label={label}
        name="completed"
        type="checkbox"
        defaultChecked={checked}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-5 w-5 cursor-pointer accent-emerald-600"
      />
    </form>
  );
}
