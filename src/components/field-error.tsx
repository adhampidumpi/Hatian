/** Inline validation message, linked to its input via aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-owe">
      {message}
    </p>
  );
}
