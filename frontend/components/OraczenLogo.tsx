import React from "react";

// custom vector SVG icon for the Oraczen brand mark
// built with a center hub, 8 radial connector lines, and 8 circular outer nodes
export function OraczenIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* center dot */}
      <circle cx="12" cy="12" r="1.5" fill={color} />

      {/* 
        spoke lines branching outwards:
        - 4 cardinal axes (up, down, left, right)
        - 4 diagonal axes (45 deg angles: 6.7 to 17.3)
      */}
      <line x1="12" y1="12" x2="12" y2="4.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="19.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="4.5" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="19.5" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="6.7" y2="6.7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="17.3" y2="17.3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="6.7" y2="17.3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="17.3" y2="6.7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />

      {/* outer satellite bulbs sitting at the ends of each spoke */}
      <circle cx="12" cy="3.5" r="2" fill={color} />
      <circle cx="12" cy="20.5" r="2" fill={color} />
      <circle cx="3.5" cy="12" r="2" fill={color} />
      <circle cx="20.5" cy="12" r="2" fill={color} />
      <circle cx="6" cy="6" r="2" fill={color} />
      <circle cx="18" cy="18" r="2" fill={color} />
      <circle cx="6" cy="18" r="2" fill={color} />
      <circle cx="18" cy="6" r="2" fill={color} />
    </svg>
  );
}

// full logo combining the geometric icon + wordmark text
export function OraczenLogo({ className = "h-5" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <OraczenIcon className="w-5 h-5" color="#18171a" />
      <span className="font-bold tracking-tight text-[#18171a] text-[15px] font-sans">
        Oraczen
      </span>
    </div>
  );
}
