'use client';

import React, { useSyncExternalStore } from 'react';
import { Lottie } from 'lottie-react';
import heartAnimation from '../public/lottie/Heart.json';
import bellAnimation from '../public/lottie/Bell.json';

interface LottieToggleIconProps {
  type?: 'heart' | 'bell';
  size?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export default function LottieToggleIcon({
  type = 'heart',
  size = 28,
  active = false,
  onClick,
  className = '',
}: LottieToggleIconProps) {
  const mounted = useIsMounted();

  const animationData = type === 'heart' ? heartAnimation : bellAnimation;

  return (
    <button
      onClick={onClick}
      type="button"
      className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer ${className}`}
      aria-label={type}
    >
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        {mounted ? (
          <Lottie src={animationData} loop={active} autoplay={active} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </div>
    </button>
  );
}
