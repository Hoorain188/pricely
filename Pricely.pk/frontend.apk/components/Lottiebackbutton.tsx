import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';

const arrowLeftCircle = require('../../assets/Lottie/Arrowleftcircle.json');
const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

interface LottieBackButtonProps {
    onPress: () => void;
    size?: number;
    color?: string;
}

export default function LottieBackButton({ onPress, size = 36, color = colors.onDarkPrimary }: LottieBackButtonProps) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Play the Lottie drawing animation on mount
        Animated.timing(progress, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(progress, {
            toValue: 0.8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(progress, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0.8, 1], outputRange: [0.9, 1] }) }] }}>
            <TouchableOpacity 
                onPress={onPress} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8} 
                style={[styles.container, { width: size, height: size }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <AnimatedLottieView
                    source={arrowLeftCircle}
                    progress={progress}
                    colorFilters={[{ keypath: '**', color }]}
                    style={{ width: '100%', height: '100%' }}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});