import { StyleSheet, Text, View } from 'react-native';

interface Props {
  date: Date;
}

/** 选中日期下方的「当日代办事项」面板:目前为空态占位,后续接入每日任务数据 */
export function DayTasksPanel({ date }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {date.getMonth() + 1}月{date.getDate()}日 代办事项
      </Text>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>暂无代办事项</Text>
        <Text style={styles.emptyHint}>每日任务模块上线后,当天任务将显示在这里</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
