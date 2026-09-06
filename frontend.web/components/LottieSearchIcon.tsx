'use client';

import React, { useSyncExternalStore } from 'react';
import { Lottie } from 'lottie-react';
import searchAnimation from '../public/lottie/Searchtox.json';

interface LottieSearchIconProps {
  size?: number;
  active?: boolean;
}

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export default function LottieSearchIcon({ size = 24, active = false }: LottieSearchIconProps) {
  const mounted = useIsMounted();

  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      {mounted ? (
        <Lottie src={searchAnimation} loop={active} autoplay={active} />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}
