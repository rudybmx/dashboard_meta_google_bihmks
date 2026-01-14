import React, { useEffect, useRef, useState } from "react";
import { Error } from "@/components/ui/error";
import clsx from "clsx";

const sizes = { xSmall: "h-6 text-xs rounded-md", small: "h-8 text-sm rounded-md", mediumSmall: "h-10 text-sm rounded-md", medium: "h-10 text-sm rounded-md", large: "h-12 text-base rounded-lg" };

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: React.ReactNode | string; suffix?: React.ReactNode | string; prefixStyling?: boolean | string; suffixStyling?: boolean | string;
  error?: string | boolean; label?: string; wrapperClassName?: string; size?: keyof typeof sizes;
}

export const Input = ({ placeholder, size = "medium", prefix, suffix, prefixStyling = true, suffixStyling = true, disabled = false, error, label, value, onChange, onFocus, onBlur, className, wrapperClassName, ...rest }: InputProps) => {
  const [_value, set_value] = useState(value || "");
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => { set_value(e.target.value); if (onChange) onChange(e); };
  useEffect(() => { if (value !== undefined) set_value(value); }, [value]);

  return (
    <div className="flex flex-col gap-2">
      {label && <div className="capitalize text-[13px] text-gray-900">{label}</div>}
      <div className={clsx("flex items-center duration-150 font-sans", error ? "shadow-error-input" : "border border-gray-alpha-400 focus-within:border-transparent focus-within:shadow-focus-input", sizes[size], disabled ? "cursor-not-allowed bg-gray-100" : "bg-background-100", wrapperClassName)}>
        {prefix && <div className={clsx("text-gray-700 fill-gray-700 h-full flex items-center justify-center", prefixStyling === true ? "bg-background-200 border-r border-gray-alpha-400 px-3" : `pl-3 ${prefixStyling}`)}>{prefix}</div>}
        <input className={clsx("w-full inline-flex appearance-none placeholder:text-gray-900 placeholder:opacity-70 outline-none", (size === "xSmall" || size === "mediumSmall") ? "px-2" : "px-3", disabled ? "cursor-not-allowed bg-gray-100" : "bg-background-100", className)} placeholder={placeholder} disabled={disabled} value={_value} onChange={_onChange} onFocus={onFocus} onBlur={onBlur} {...rest} />
        {suffix && <div className={clsx("text-gray-700 fill-gray-700 h-full flex items-center justify-center", suffixStyling === true ? "bg-background-200 border-l border-gray-alpha-400 px-3" : `pr-3 ${suffixStyling}`)}>{suffix}</div>}
      </div>
      {typeof error === "string" && <Error size={size === "large" ? "large" : "small"}>{error}</Error>}
    </div>
  );
};
