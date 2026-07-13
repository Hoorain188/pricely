import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Easing,
  KeyboardTypeOptions,
} from 'react-native';
import { LucideIcon, Eye, EyeOff } from 'lucide-react-native';
import { colors, radii } from '../theme/colors';
import { fonts } from '../theme/colors';

interface FloatingLabelInputProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  hint?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  [key: string]: any;
}

// Label floats up but stays INSIDE the field (never crosses the border).
// Prominent by default — bigger resting size, SemiBold weight, strong
// color contrast at every state.
// When an error is set the field shakes horizontally and turns red.
export default function FloatingLabelInput({
  label,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  hint,
  error,
  keyboardType,
  ...rest
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const Icon = icon;

  // Float label when value changes externally
  useEffect(() => {
    animate(labelAnim, value || isFocused ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Shake + red flash whenever an error appears
  const prevError = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (error && error !== prevError.current) {
      // Horizontal shake: left → right → left → right → center
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: false, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: false, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: false, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: false, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: false, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: false, easing: Easing.linear }),
      ]).start();
    }
    prevError.current = error;
  }, [error]);

  const animate = (anim: Animated.Value, toValue: number) =>
    Animated.timing(anim, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

  const handleFocus = () => {
    setIsFocused(true);
    animate(labelAnim, 1);
    animate(borderAnim, 1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) animate(labelAnim, 0);
    animate(borderAnim, 0);
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 6] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textSecondary, colors.accentSolid],
  });
  const underlineColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accentSolid],
  });
  const iconColor = isFocused ? colors.accentSolid : colors.textSecondary;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.shell,
          { borderBottomColor: error ? colors.danger : underlineColor },
          error ? styles.shellError : null,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Icon ? (
          <Icon size={17} color={error ? colors.danger : iconColor} style={styles.icon} />
        ) : null}
        <View style={styles.inputArea}>
          <Animated.Text
            style={[
              styles.label,
              { top: labelTop, fontSize: labelSize, color: error ? colors.danger : labelColor },
            ]}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={hidden}
            keyboardType={keyboardType}
            autoCapitalize="none"
            {...rest}
          />
        </View>
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {hidden ? <Eye size={18} color={colors.textSecondary} /> : <EyeOff size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 2.5,
    paddingHorizontal: 14,
    height: 58,
  },
  shellError: { borderColor: colors.danger, backgroundColor: '#FFF5F5' },
  icon: { marginRight: 10 },
  inputArea: { flex: 1, justifyContent: 'center' },
  label: { position: 'absolute', left: 0, fontFamily: fonts.label, fontWeight: '600' },
  input: {
    fontSize: 16,
    fontFamily: fonts.body,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingTop: 17,
    height: 58,
  },
  inputError: { color: colors.danger },
  hint: { fontSize: 12, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: 12, fontFamily: fonts.body, color: colors.danger, marginTop: 6, marginLeft: 4, fontWeight: '600' },
});