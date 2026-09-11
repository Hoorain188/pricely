'use client';

import React, { useSyncExternalStore } from 'react';
import { Lottie } from 'lottie-react';
import { useRouter } from 'next/navigation';
import backAnimation from '../public/lottie/Arrowleftcircle.json';

interface LottieBackButtonProps {
  size?: number;
  onClick?: () => void;
  className?: string;
}

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export default function LottieBackButton({ size = 32, onClick, className = '' }: LottieBackButtonProps) {
  const router = useRouter();
  const mounted = useIsMounted();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`p-1.5 rounded-full hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer ${className}`}
      aria-label="Go back"
    >
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        {mounted ? (
          <Lottie src={backAnimation} loop={false} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </div>
    </button>
  );
}

