import React from "react";

// reusable button component supporting common variant styles & sizes
// forwardRef allows parent forms or keyboard shortcut hooks to focus this button directly
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98 select-none";

    const sizes = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs font-semibold";

    let variant_cls = "";
    if (variant === "primary") {
      variant_cls = "bg-[#15803d] text-white hover:bg-[#166534] shadow-xs";
    } else if (variant === "danger") {
      variant_cls = "bg-white border border-[#fecaca] text-[#991b1b] hover:bg-[#fee2e2] shadow-xs";
    } else if (variant === "ghost") {
      variant_cls = "bg-transparent text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f2eb]";
    } else {
      // secondary / outline: neutral warm card button with border
      variant_cls = "bg-white border border-[#eae6de] text-[#1c1917] hover:bg-[#f5f2eb] shadow-xs";
    }

    return (
      <button
        ref={ref}
        className={`${base} ${sizes} ${variant_cls} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
