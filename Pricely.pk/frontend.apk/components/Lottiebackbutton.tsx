import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';

const arrowLeftCircle = require('../../assets/Lottie/Arrowleftcircle.json');
interface LottieBackButtonProps {
    onPress: () => void;
    size?: number;
    color?: string;
}

export default function LottieBackButton({ onPress, size = 36, color = colors.onDarkPrimary }: LottieBackButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const lottieRef = useRef<LottieView>(null);

    useEffect(() => {
        lottieRef.current?.play();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.85,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
                onPress={onPress} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8} 
                style={[styles.container, { width: size, height: size }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <LottieView
                    ref={lottieRef}
                    source={arrowLeftCircle}
                    loop={false}
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