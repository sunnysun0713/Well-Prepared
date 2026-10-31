import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODULES } from '@/modules/registry';

const ACCENT = '#4F46E5';

interface Props {
  /** 当前激活模块 id */
  activeId: string;
  /** 选中某个模块 */
  onSelect: (id: string) => void;
  /** 点击「管理模块」入口 */
  onManage: () => void;
  /** 点击左上角账户入口 */
  onAccount: () => void;
  /** 账户按钮显示文字(未登录为 👤,已登录为昵称首字) */
  accountText: string;
  /** 是否有待处理的好友请求 */
  accountBadge?: boolean;
}

/** 顶部模块选择栏:最左侧账户入口 + 已注册模块 + 末尾「管理模块」 */
export function ModuleBar({
  activeId,
  onSelect,
  onManage,
  onAccount,
  accountText,
  accountBadge,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.accountButton} onPress={onAccount} hitSlop={6}>
        <Text style={styles.accountText}>{accountText}</Text>
        {accountBadge ? <View style={styles.badge} /> : null}
      </Pressable>
      <View style={styles.verticalDivider} />
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
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={styles.chipIcon}>{m.icon}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {m.title}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.divider} />
        <Pressable
          onPress={onManage}
          style={({ pressed }) => [styles.chipManage, pressed && styles.pressed]}
        >
          <Text style={styles.chipIcon}>⚙️</Text>
          <Text style={styles.chipText}>管理模块</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingLeft: 12,
  },
  accountButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
  },
  chipIcon: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  chipManage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.6,
  },
});
