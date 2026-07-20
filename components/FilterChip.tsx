import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  /** feather icon name shown after the label, e.g. 'arrow-up' for the sort chip */
  iconName?: keyof typeof Feather.glyphMap;
}

export default function FilterChip({
  label,
  active,
  onPress,
  iconName,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.chipContent}>
        <Text style={[styles.label, active && styles.labelActive]}>
          {label}
        </Text>
        {iconName && (
          <Feather
            name={iconName}
            size={15}
            color={active ? "#ffffff" : "#3a3a3a"}
            style={styles.icon}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dedcd4",
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: "#166b52",
    borderColor: "#166b52",
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3a3a3a",
  },
  labelActive: {
    color: "#ffffff",
  },
  icon: {
    marginLeft: 6,
  },
});
