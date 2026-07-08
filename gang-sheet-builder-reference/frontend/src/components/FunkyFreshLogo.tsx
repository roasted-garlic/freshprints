import React from 'react';

interface FunkyFreshLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function FunkyFreshLogo({ size = 'md', className = '' }: FunkyFreshLogoProps) {
  const config = {
    xs: {
      top: 'text-sm',
      bottom: 'text-[9px]',
      stroke: '1px',
      lineW: 10,
      lineH: 1.5,
    },
    sm: {
      top: 'text-xl',
      bottom: 'text-[11px]',
      stroke: '1.5px',
      lineW: 16,
      lineH: 2,
      px: 12,
      py: 6,
      border: 2,
      shadow: 3,
    },
    md: {
      top: 'text-3xl',
      bottom: 'text-sm',
      stroke: '2px',
      lineW: 22,
      lineH: 2,
      px: 16,
      py: 10,
      border: 3,
      shadow: 4,
    },
    lg: {
      top: 'text-6xl',
      bottom: 'text-xl',
      stroke: '3px',
      lineW: 40,
      lineH: 3,
      px: 28,
      py: 16,
      border: 3,
      shadow: 5,
    },
  };

  const c = config[size];
  const isBadge = size !== 'xs';

  const wordStyle = (color: string): React.CSSProperties => ({
    color,
    WebkitTextStroke: `${c.stroke} #000`,
    textShadow: isBadge ? 'none' : '2px 2px 0 #000',
    paintOrder: 'stroke fill',
  });

  const printsStyle: React.CSSProperties = {
    color: '#FFE600',
    WebkitTextStroke: '1px #000',
    textShadow: isBadge ? 'none' : '1px 1px 0 #000',
    paintOrder: 'stroke fill',
  };

  const content = (
    <div className="flex flex-col items-center leading-none select-none">
      <div className={`font-display ${c.top} uppercase tracking-tight leading-none flex items-baseline gap-1`}>
        <span style={wordStyle('#FF1493')}>FUNKY</span>
        <span style={wordStyle('#00CED1')}>FRESH</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <div style={{ width: c.lineW, height: c.lineH, backgroundColor: '#FFE600' }} />
        <span
          className={`font-display ${c.bottom} uppercase tracking-[0.2em] leading-none`}
          style={printsStyle}
        >
          PRINTS
        </span>
        <div style={{ width: c.lineW, height: c.lineH, backgroundColor: '#FFE600' }} />
      </div>
    </div>
  );

  if (!isBadge) {
    return (
      <div className={`select-none ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`select-none inline-block ${className}`} style={{ transform: 'rotate(-2deg)' }}>
      <div
        style={{
          backgroundColor: '#000',
          border: `${(c as any).border}px solid #FF1493`,
          boxShadow: `${(c as any).shadow}px ${(c as any).shadow}px 0 #00CED1`,
          paddingLeft: (c as any).px,
          paddingRight: (c as any).px,
          paddingTop: (c as any).py,
          paddingBottom: (c as any).py,
          display: 'inline-flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
        }}
      >
        {content}
      </div>
    </div>
  );
}
