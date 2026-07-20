import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import LottieToggleIcon from './LottieToggleIcon';
import checkSquare from '../../assets/Lottie/Checksquare.json';
import { colors, fonts } from '../theme/colors';

interface LottieCheckboxFieldProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: React.ReactNode;
    size?: number;
    error?: boolean;
}

export default function LottieCheckboxField({ checked, onChange, label, size = 28, error }: LottieCheckboxFieldProps) {
    return (
        <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => onChange(!checked)}>
            <LottieToggleIcon
                source={checkSquare}
                active={checked}
                size={size}
                duration={400}
                colorFilters={[{ keypath: 'check-square', color: error ? colors.danger : colors.accentSolid }]}
            />
            {label ? <Text style={styles.label}>{label}</Text> : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    label: { flex: 1, fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19 },
});
