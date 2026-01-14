import React from "react";
import { Error } from "@/components/ui/error";
import clsx from "clsx";

const sizes = [ { xsmall: "h-6 text-xs pl-1.5 pr-[22px]", small: "h-8 text-sm pl-3 pr-9", medium: "h-10 text-sm pl-3 pr-9", large: "h-12 text-base pl-3 pr-9 rounded-lg" }, { xsmall: "h-6 text-xs px-[22px]", small: "h-8 text-sm px-9", medium: "h-10 text-sm px-9", large: "h-12 text-base px-9 rounded-lg" } ];
const ArrowBottom = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M14.0607 5.49999L13.5303 6.03032L8.7071 10.8535C8.31658 11.2441 7.68341 11.2441 7.29289 10.8535L2.46966 6.03032L1.93933 5.49999L2.99999 4.43933L3.53032 4.96966L7.99999 9.43933L12.4697 4.96966L13 4.43933L14.0607 5.49999Z"/></svg>);

export interface Option { value: string; label: string; }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'prefix'> {
  options?: Option[];
  label?: string;
  placeholder?: string;
  size?: "xsmall" | "small" | "medium" | "large";
  prefix?: React.ReactNode; 
  suffix?: React.ReactNode;
  error?: string;
  variant?: "default" | "ghost";
  value?: string | number | readonly string[] | undefined;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  className?: string;
}

export const Select = ({ variant = "default", options, label, value, placeholder, size = "medium", suffix, prefix, disabled = false, error, onChange, className, ...rest }: SelectProps) => {
  return (
    <div>
      {label && <label className="cursor-text block font-sans text-[13px] text-gray-900 capitalize mb-2">{label}</label>}
      <div className={clsx("relative flex items-center", disabled ? "fill-[#8f8f8f]" : "fill-[#666666]")}>
        <select disabled={disabled} value={value} onChange={onChange} className={clsx("font-sans appearance-none w-full border rounded-[5px] duration-200 outline-none", sizes[prefix ? 1 : 0][size], disabled ? "cursor-not-allowed bg-gray-100 text-gray-700" : variant === "default" ? "text-gray-1000 bg-background-100 cursor-pointer" : "bg-transparent text-accents-5", error ? "border-error ring-red-900-alpha-160 ring-[3px]" : `ring-gray-alpha-500 focus:ring-[3px] ${variant === "default" ? "border-gray-alpha-400" : "border-transparent ring-none"}`, className)} {...rest}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options && options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {prefix && <span className={clsx("inline-flex absolute pointer-events-none", size === "xsmall" ? "left-[5px]" : "left-3")}>{prefix}</span>}
        <span className={clsx("inline-flex absolute pointer-events-none", size === "xsmall" ? "right-[5px]" : "right-3")}>{suffix ? suffix : <ArrowBottom />}</span>
      </div>
      {error && <div className="mt-2"><Error size={size === "large" ? "large" : "small"}>{error}</Error></div>}
    </div>
  );
};
