import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

interface ColorFilter {
    keypath: string;
    color: string;
}

interface LottieToggleIconProps {
    source: any;
    active: boolean;
    size?: number;
    duration?: number;
    colorFilters?: ColorFilter[];
}

export default function LottieToggleIcon({
    source,
    active,
    size = 24,
    colorFilters,
}: LottieToggleIconProps) {
    const lottieRef = useRef<any>(null);

    useEffect(() => {
        if (active) {
            lottieRef.current?.play();
        } else {
            lottieRef.current?.reset();
        }
    }, [active]);

    return (
        <View style={{ width: size, height: size }}>
            <LottieView
                ref={lottieRef}
                source={source}
                loop={false}
                autoPlay={false}
                colorFilters={colorFilters}
                style={{ width: '100%', height: '100%' }}
            />
        </View>
    );
}
