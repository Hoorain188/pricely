import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors, radii, fonts, shadows } from '../theme/colors';

export type SortOption = 'relevance' | 'price-low' | 'price-high';

export interface FilterState {
    sort: SortOption;
    stores: string[];
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'relevance', label: 'Relevance' },
    { key: 'price-low', label: 'Price: Low to High' },
    { key: 'price-high', label: 'Price: High to Low' },
];

const STORE_OPTIONS = ['Daraz', 'Telemart', 'Mega.pk', 'Amazon'];

interface FilterSheetProps {
    visible: boolean;
    value: FilterState;
    onChange: (next: FilterState) => void;
    onClose: () => void;
}

export default function FilterSheet({ visible, value, onChange, onClose }: FilterSheetProps) {
    const toggleStore = (store: string) => {
        const next = value.stores.includes(store)
            ? value.stores.filter((s) => s !== store)
            : [...value.stores, store];
        onChange({ ...value, stores: next });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Filter & Sort</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>Sort by</Text>
                    {SORT_OPTIONS.map((opt) => {
                        const active = value.sort === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={styles.row}
                                activeOpacity={0.7}
                                onPress={() => onChange({ ...value, sort: opt.key })}
                            >
                                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{opt.label}</Text>
                                <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
                            </TouchableOpacity>
                        );
                    })}

                    <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Store</Text>
                    {STORE_OPTIONS.map((store) => {
                        const active = value.stores.includes(store);
                        return (
                            <TouchableOpacity key={store} style={styles.row} activeOpacity={0.7} onPress={() => toggleStore(store)}>
                                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{store}</Text>
                                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                                    {active && <Check size={12} color={colors.onAccent} strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={onClose}>
                        <Text style={styles.applyLabel}>Apply</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export function sortProducts<T extends { price: string }>(products: T[], sort: SortOption): T[] {
    if (sort === 'relevance') return products;
    const parsePrice = (p: string) => Number(p.replace(/[^0-9.]/g, '')) || 0;
    const sorted = [...products].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    return sort === 'price-high' ? sorted.reverse() : sorted;
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radii.large,
        borderTopRightRadius: radii.large,
        padding: 20,
        paddingBottom: 32,
        ...shadows.card,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 18, fontFamily: fonts.headlineBold, color: colors.textPrimary },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: radii.small - 4,
        backgroundColor: colors.accentTint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: { fontSize: 12, fontFamily: fonts.button, color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 8 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowLabel: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary },
    rowLabelActive: { color: colors.textPrimary, fontFamily: fonts.label },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioActive: { borderColor: colors.accentSolid },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentSolid },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: colors.accentSolid, borderColor: colors.accentSolid },
    applyBtn: {
        marginTop: 24,
        height: 50,
        borderRadius: radii.medium,
        backgroundColor: colors.accentSolid,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyLabel: { color: colors.onAccent, fontSize: 15, fontFamily: fonts.button },
});