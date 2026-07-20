import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import loadingv4 from '../../assets/Lottie/Loadingv4.json';

interface LottieLoaderProps {
    size?: number;
}

export default function LottieLoader({ size = 44 }: LottieLoaderProps) {
    return (
        <View style={{ width: size, height: size }}>
            <LottieView
                source={loadingv4}
                autoPlay
                loop
                style={{ width: '100%', height: '100%' }}
            />
        </View>
    );
}
