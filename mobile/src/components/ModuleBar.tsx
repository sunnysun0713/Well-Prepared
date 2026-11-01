import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MODULES } from '@/modules/registry';
import { colors, radius } from '@/theme';

interface Props {
  /** 当前激活模块 id */
  activeId: string;
  /** 选中某个模块 */
  onSelect: (id: string) => void;
  /** 点击「管理模块」入口 */
  onManage: () => void;
}

/** 顶部模块选择栏:分段式模块切换 + 右侧「管理模块」图标按钮 */
export function ModuleBar({ activeId, onSelect, onManage }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {MODULES.map((m) => {
          const active = m.id === activeId;
          return (
            <Pressable
              key={m.id}
              onPress={() => onSelect(m.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && !active && styles.pressed,
              ]}
            >
              <Ionicons
                name={m.icon}
                size={16}
                color={active ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={onManage}
        accessibilityRole="button"
        accessibilityLabel="管理模块"
        hitSlop={6}
        style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
      >
        <Ionicons name="apps-outline" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingRight: 12,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
