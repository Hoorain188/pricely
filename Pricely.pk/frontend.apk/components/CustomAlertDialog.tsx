import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radii, shadows } from '../theme/colors';

interface CustomAlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger' | 'success';
}

export default function CustomAlertDialog({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'default',
}: CustomAlertDialogProps) {
  
  const getConfirmColor = () => {
    if (type === 'danger') return colors.danger;
    if (type === 'success') return '#0E6B4F';
    return '#0E6B4F'; // brand green
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.buttonCancel} onPress={onCancel} activeOpacity={0.75}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.buttonConfirm, { backgroundColor: getConfirmColor() }]} 
              onPress={onConfirm} 
              activeOpacity={0.75}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 20,
    ...shadows.card,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  buttonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.small,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontFamily: fonts.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  buttonConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.small,
    ...shadows.button,
  },
  confirmText: {
    fontFamily: fonts.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
