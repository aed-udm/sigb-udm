"use client";

import React from "react";

interface FcfaIconProps {
  className?: string;
  size?: number;
}

export const FcfaIcon: React.FC<FcfaIconProps> = ({
  className = "h-4 w-4",
  size
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center font-bold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size ? `${size * 0.35}px` : '0.55rem',
        fontWeight: '700',
        border: '1.5px solid currentColor',
        borderRadius: '4px',
        color: 'currentColor',
        backgroundColor: 'transparent',
        lineHeight: '1',
        fontFamily: 'monospace'
      }}
    >
      FC
    </div>
  );
};

export default FcfaIcon;
