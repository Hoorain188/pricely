import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { useActivityStore } from '../context/ActivityContext';

interface ActivityLogScreenProps {
  navigation: { goBack: () => void };
}

export default function ActivityLogScreen({ navigation }: ActivityLogScreenProps) {
  const { entries } = useActivityStore();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Activity log</Text>
      <Text style={styles.subtext}>Who did what, across the whole admin team.</Text>

      <View style={styles.list}>
        {entries.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.action}>{e.action}</Text>
              <Text style={styles.meta}>{e.actor} · {e.timestamp}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 20 },

  list: { gap: 14 },
  row: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accentSolid, marginTop: 6 },
  action: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary, lineHeight: 18 },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
});
