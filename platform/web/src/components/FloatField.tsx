/**
 * Floating-label input — deliberate spec element for the admin sign-in.
 * The label rests inside the field and lifts into an uppercase micro-label
 * on focus or once the field has a value (CSS :placeholder-shown trick).
 */
import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

interface FloatFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
}

export function FloatField({
  label,
  error,
  hint,
  type = "text",
  ...rest
}: FloatFieldProps) {
  const id = useId();
  const isPassword = type === "password";
  const [show, setShow] = useState(false);

  return (
    <div
      className={`ffield${isPassword ? " has-eye" : ""}${error ? " invalid" : ""}`}
    >
      <input
        id={id}
        type={isPassword && show ? "text" : type}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      <label htmlFor={id}>{label}</label>
      {isPassword && (
        <button
          type="button"
          className="ffield-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
        </button>
      )}
      {error && (
        <div className="ffield-msg" id={`${id}-err`} role="alert">
          {error}
        </div>
      )}
      {!error && hint && (
        <div className="ffield-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
    </div>
  );
}
