import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    let baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    let sizeStyles = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";

    let variantStyles = "";
    if (variant === "primary") {
      variantStyles = "bg-[#3b82f6] text-white hover:bg-[#2563eb]";
    } else if (variant === "danger") {
      variantStyles = "bg-[#161922] border border-[#ef4444]/40 text-[#f87171] hover:bg-[#ef4444]/15";
    } else if (variant === "ghost") {
      variantStyles = "bg-transparent text-[#94a3b8] hover:text-[#f3f4f6] hover:bg-[#1e222f]";
    } else {
      // secondary / outline
      variantStyles = "bg-[#161922] border border-[#262a36] text-[#f3f4f6] hover:bg-[#1e222f]";
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
