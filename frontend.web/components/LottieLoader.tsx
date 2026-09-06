'use client';

import React, { useSyncExternalStore } from 'react';
import { Lottie } from 'lottie-react';
import loadingAnimation from '../public/lottie/Loadingv4.json';

interface LottieLoaderProps {
  size?: number;
  className?: string;
  text?: string;
}

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export default function LottieLoader({ size = 80, className = '', text }: LottieLoaderProps) {
  const mounted = useIsMounted();

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        {mounted ? (
          <Lottie src={loadingAnimation} loop={true} />
        ) : (
          <div className="w-full h-full rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        )}
      </div>
      {text && (
        <p className="mt-3 text-sm font-medium text-slate-500 animate-pulse-slow">
          {text}
        </p>
      )}
    </div>
  );
}
