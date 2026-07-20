import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

interface ColorFilter {
    keypath: string;
    color: string;
}

interface LottieToggleIconProps {
    source: any; // Lottie JSON (require('...json'))
    active: boolean;
    size?: number;
    duration?: number;
    colorFilters?: ColorFilter[]; // recolor specific layers by name
}

export default function LottieToggleIcon({
    source,
    active,
    size = 24,
    duration = 300,
    colorFilters,
}: LottieToggleIconProps) {
    const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(progress, { toValue: active ? 1 : 0, duration, useNativeDriver: true }).start();
    }, [active]);

    return (
        <View style={{ width: size, height: size }}>
            <AnimatedLottieView
                source={source}
                progress={progress}
                colorFilters={colorFilters}
                style={{ width: '100%', height: '100%' }}
            />
        </View>
    );
}
