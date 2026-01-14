import React from "react";
import { Spinner } from "@/components/ui/spinner-1";
import clsx from "clsx";

const sizes = [ { tiny: "px-1.5 h-6 text-sm", small: "px-1.5 h-8 text-sm", medium: "px-2.5 h-10 text-sm", large: "px-3.5 h-12 text-base" }, { tiny: "w-6 h-6 text-sm", small: "w-8 h-8 text-sm", medium: "w-10 h-10 text-sm", large: "w-12 h-12 text-base" } ];
const types = { primary: "bg-gray-1000 hover:bg-gray-1000-h text-background-100 fill-background-100", secondary: "bg-background-100 hover:bg-gray-alpha-200 text-gray-1000 fill-gray-1000 border border-gray-alpha-400", tertiary: "bg-none hover:bg-gray-alpha-200 text-gray-1000 fill-gray-1000", error: "bg-red-800 hover:bg-red-900 text-white fill-white", warning: "bg-amber-800 hover:bg-amber-850 text-black fill-black" };
const shapes = { square: { tiny: "rounded", small: "rounded-md", medium: "rounded-md", large: "rounded-lg" }, circle: { tiny: "rounded-full", small: "rounded-full", medium: "rounded-full", large: "rounded-full" }, rounded: { tiny: "rounded-full", small: "rounded-full", medium: "rounded-full", large: "rounded-full" } };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { size?: "tiny" | "small" | "medium" | "large"; type?: keyof typeof types; variant?: "styled" | "unstyled"; shape?: keyof typeof shapes; svgOnly?: boolean; prefix?: React.ReactNode; suffix?: React.ReactNode; shadow?: boolean; loading?: boolean; fullWidth?: boolean; className?: string; }

export const Button = ({ size = "medium", type = "primary", variant = "styled", shape = "square", svgOnly = false, children, prefix, suffix, shadow = false, loading = false, disabled = false, fullWidth = false, className, ...rest }: ButtonProps) => {
  return (
    <button disabled={disabled} className={clsx("flex justify-center items-center gap-0.5 duration-150", sizes[+svgOnly][size], (disabled || loading) ? "bg-gray-100 text-gray-700 border border-gray-400 cursor-not-allowed" : types[type], shapes[shape][size], shadow && "shadow-border-small border-none", fullWidth && "w-full", variant === "unstyled" ? "outline-none px-0 h-fit bg-transparent hover:bg-transparent text-gray-1000" : "focus:shadow-focus-ring focus:outline-0", className)} {...rest}>
      {loading ? <Spinner size={size === "large" ? 24 : 16} /> : prefix}
      <span className={clsx("relative overflow-hidden whitespace-nowrap overflow-ellipsis font-sans", size !== "tiny" && variant !== "unstyled" && "px-1.5")}>{children}</span>
      {!loading && suffix}
    </button>
  );
};
