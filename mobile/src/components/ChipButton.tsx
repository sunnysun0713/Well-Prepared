import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** 选中/展开时实心蓝底白字,与顶栏模块切换一致 */
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** 是否作为展开/收起开关(读屏播报 expanded 状态) */
  expandable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 胶囊按钮:外观与顶栏 ModuleBar 的模块切换一致(图标 + 文字,无箭头) */
export function ChipButton({
  icon,
  label,
  active,
  onPress,
  accessibilityLabel,
  expandable,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={expandable ? { expanded: active } : { selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={15} color={active ? colors.onPrimary : colors.textSecondary} />
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexShrink: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  textActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
