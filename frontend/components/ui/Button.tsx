import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    let baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#1f4fd8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    let sizeStyles = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";

    let variantStyles = "";
    if (variant === "primary") {
      variantStyles = "bg-[#1f4fd8] text-white hover:bg-[#173eb0]";
    } else if (variant === "danger") {
      variantStyles = "bg-white border border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2]";
    } else {
      // secondary
      variantStyles = "bg-white border border-[#e2e2dd] text-[#1c1c1a] hover:bg-[#f7f7f5]";
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
