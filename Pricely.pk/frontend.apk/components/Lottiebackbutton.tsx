import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import arrowLeftCircle from '../../assets/Lottie/Arrowleftcircle.json';
import { colors } from '../theme/colors';

interface LottieBackButtonProps {
    onPress: () => void;
    size?: number;
    color?: string;
}

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

export default function LottieBackButton({ onPress, size = 32, color = colors.onDarkPrimary }: LottieBackButtonProps) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AnimatedLottieView
                source={arrowLeftCircle}
                progress={progress}
                colorFilters={[{ keypath: 'arrow-left-circle', color }]}
                style={{ width: size, height: size }}
            />
        </TouchableOpacity>
    );
}