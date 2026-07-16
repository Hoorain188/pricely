import React from 'react';
import LottieToggleIcon from './LottieToggleIcon';
import searchToX from '../../assets/Lottie/Searchtox.json';

interface LottieSearchIconProps {
    active: boolean;
    size?: number;
    color?: string;
}

export default function LottieSearchIcon({ active, size = 20, color }: LottieSearchIconProps) {
    return (
        <LottieToggleIcon
            source={searchToX}
            active={active}
            size={size}
            colorFilters={color ? [{ keypath: 'search-to-x Outlines', color }] : undefined}
        />
    );
}