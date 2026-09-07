import React, { useState } from 'react';
import logoImage from '../assets/images/genfinity-logo-uploaded.webp';

interface ClinicLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  clinicName?: string;
  logoUrl?: string;
  onClick?: () => void;
}

export default function ClinicLogo({
  className = '',
  size = 'md',
  showText = false,
  clinicName,
  logoUrl,
  onClick
}: ClinicLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-28 h-7',
    md: 'w-52 h-12',
    lg: 'w-64 h-14',
    xl: 'w-80 h-20'
  };

  const dimClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={event => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Go to home dashboard' : undefined}
    >
      {!imageError ? (
        <img
          src={logoUrl || logoImage}
          alt={clinicName || 'Genfinity Orthotics and Prosthetics Clinic logo'}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${dimClass} object-contain transition-transform hover:scale-[1.02]`}
        />
      ) : (
        /* Precise SVG vector logo representation of the O&P double limb + silver arc artwork */
        <svg
          viewBox="0 0 200 200"
          className={`${dimClass} flex-shrink-0 drop-shadow-xs`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Metallic Silver Outer Swooshes */}
          <path
            d="M 60 40 C 130 20, 160 90, 80 100 C 65 102, 45 90, 40 80 C 35 65, 45 45, 60 40 Z"
            fill="#C8BCB9"
            opacity="0.9"
          />
          <path
            d="M 120 70 C 180 80, 185 150, 110 160 C 95 162, 75 150, 70 140 C 68 130, 80 115, 120 70 Z"
            fill="#B5A8A5"
            opacity="0.85"
          />

          {/* Posterior Limb & Ankle (Rust Red) */}
          <path
            d="M 50 80 
               C 35 110, 25 125, 20 140 
               C 15 155, 30 180, 55 185 
               C 70 188, 90 185, 95 178 
               C 90 170, 75 165, 55 155 
               C 45 150, 40 140, 50 120 
               C 58 105, 68 90, 70 80 Z"
            fill="#B33A30"
          />

          {/* Anterior Limb & Foot (Rust Red) */}
          <path
            d="M 90 15 
               C 85 60, 82 100, 80 140 
               C 78 160, 82 170, 100 175 
               C 120 180, 150 180, 155 170 
               C 158 162, 140 158, 110 158 
               C 100 158, 98 145, 98 120 
               C 99 80, 105 40, 108 15 Z"
            fill="#A83228"
          />
        </svg>
      )}

      {showText && clinicName && (
        <span className="font-extrabold text-primary tracking-tight text-lg">
          {clinicName}
        </span>
      )}
    </div>
  );
}
