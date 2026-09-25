import React from 'react';
import { apiAssetUrl } from '../../lib/api';

export function Avatar({
  username,
  src,
  size = 'md',
}: {
  username: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const classes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-11 w-11 text-sm',
  }[size];
  const imageUrl = apiAssetUrl(src);

  if (imageUrl) {
    return <img src={imageUrl} alt="" className={`${classes} rounded-full object-cover shrink-0 ring-1 ring-white/10`} />;
  }

  return (
    <div className={`${classes} rounded-full shrink-0 grid place-items-center bg-gradient-to-br from-zinc-600 to-zinc-900 border border-white/10 font-bold text-zinc-100`}>
      {username.trim().charAt(0).toUpperCase() || 'V'}
    </div>
  );
}
