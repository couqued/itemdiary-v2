import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {formatDateKo} from '../utils/formatDate';

/**
 * 관리 일정 날짜 입력 한 줄.
 * quickOptions: [{label, getDate: () => Date}] — 날짜를 빠르게 채우는 버튼
 * onRemove: 있으면 항목 자체를 지우는 X 버튼 표시
 */
export function ScheduleDateField({label, icon, value, onChange, quickOptions = [], onRemove}) {
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
      <View style={styles.row}>
        <Pressable onPress={() => setPickerVisible(true)} style={styles.dateButton}>
          <Ionicons name={icon} size={18} color={colors.textSecondary} style={{marginRight: spacing.sm}} />
          <Text style={[styles.dateText, !value && styles.placeholder]}>
            {value ? formatDateKo(value) : '날짜 선택'}
          </Text>
        </Pressable>
        {value && !onRemove && (
          <Pressable onPress={() => onChange(null)} style={styles.chip}>
            <Text style={styles.chipText}>초기화</Text>
          </Pressable>
        )}
      </View>
      {quickOptions.length > 0 && (
        <View style={styles.quickRow}>
          {quickOptions.map(opt => (
            <Pressable key={opt.label} onPress={() => onChange(opt.getDate())} style={styles.chip}>
              <Text style={styles.chipText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={value || new Date()}
        onConfirm={d => {
          setPickerVisible(false);
          onChange(d);
        }}
        onCancel={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.captionBold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textTertiary,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
});
