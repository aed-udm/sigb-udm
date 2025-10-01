"use client";

import React from "react";

interface FcfaIconV2Props {
  className?: string;
  size?: number;
  variant?: 'default' | 'filled' | 'outline';
}

export const FcfaIconV2: React.FC<FcfaIconV2Props> = ({ 
  className = "h-4 w-4", 
  size,
  variant = 'default'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: 'currentColor',
          color: 'white',
          border: 'none'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'currentColor',
          border: '2px solid currentColor'
        };
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'currentColor',
          border: '1.5px solid currentColor'
        };
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center font-bold ${className}`}
      style={{ 
        width: size, 
        height: size,
        fontSize: size ? `${size * 0.4}px` : '0.6rem',
        fontWeight: '800',
        borderRadius: '6px',
        lineHeight: '1',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '-0.5px',
        ...getVariantStyles()
      }}
    >
      FC
    </div>
  );
};

export default FcfaIconV2;
