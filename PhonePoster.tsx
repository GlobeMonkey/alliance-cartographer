import React from 'react';

interface PhonePosterProps {
  backgroundImage?: string;
  tag?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export default function PhonePoster({
  backgroundImage,
  tag,
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
}: PhonePosterProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-300">
      <div
        className="relative flex h-[844px] w-[390px] flex-col items-center overflow-hidden"
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: 'linear-gradient(to bottom, #7c3aed, #2563eb)' }
        }
      >
        {/* Overlay sombre */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />

        {/* Contenu */}
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-8 py-12">

          {/* Haut : badge / tag */}
          <div className="flex w-full justify-center">
            {tag ? (
              <span className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                {tag}
              </span>
            ) : (
              <span />
            )}
          </div>

          {/* Centre : titre + sous-titre */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-bold leading-tight text-white">{title}</h1>
            {subtitle && (
              <p className="text-lg leading-snug text-white/80">{subtitle}</p>
            )}
          </div>

          {/* Bas : bouton CTA */}
          <div className="flex w-full justify-center">
            {ctaLabel ? (
              <button
                type="button"
                onClick={onCtaClick}
                className="w-full max-w-xs rounded-full bg-white px-8 py-3.5 text-base font-bold text-neutral-900 shadow-lg transition-all duration-150 hover:bg-neutral-100 active:scale-95"
              >
                {ctaLabel}
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
