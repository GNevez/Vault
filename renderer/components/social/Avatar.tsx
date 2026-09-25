import React from 'react';
import { apiAssetUrl } from '../../lib/api';

export function Avatar({
  username,
  src,
  size = 'md',
}: {
  username: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const classes = {
    xs: 'h-6 w-6 text-[9px]',
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-11 w-11 text-sm',
  }[size];
  const imageUrl = apiAssetUrl(src);

  if (imageUrl) {
    return <img src={imageUrl} alt="" className={`${classes} rounded-full object-cover shrink-0 ring-1 ring-white/10`} />;
  }

  return (
    <div className={`${classes} rounded-full shrink-0 grid place-items-center bg-raised-hover border border-white/10 font-bold text-zinc-200`}>
      {username.trim().charAt(0).toUpperCase() || 'V'}
    </div>
  );
}
