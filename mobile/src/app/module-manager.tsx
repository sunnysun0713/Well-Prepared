import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MODULES } from '@/modules/registry';
import { colors, radius, shadow } from '@/theme';

/** 管理模块界面(框架占位):后续可在此启用/停用、排序模块 */
export default function ModuleManagerScreen() {
  return (
    <FlatList
      data={MODULES}
      keyExtractor={(m) => m.id}
      style={styles.root}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.hint}>当前展示所有已注册模块。启用 / 停用、排序等功能待实现。</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowId}>{item.id}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bg,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowId: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
