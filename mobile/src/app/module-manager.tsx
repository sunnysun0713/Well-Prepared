import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MODULES } from '@/modules/registry';

/** 管理模块界面(框架占位):后续可在此启用/停用、排序模块 */
export default function ModuleManagerScreen() {
  return (
    <FlatList
      data={MODULES}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.hint}>
          当前展示所有已注册模块。启用 / 停用、排序等功能待实现。
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rowIcon}>{item.icon}</Text>
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
  list: {
    padding: 16,
    gap: 8,
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  rowIcon: {
    fontSize: 24,
  },
  rowBody: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  rowId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
