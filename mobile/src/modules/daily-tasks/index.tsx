import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTasksForDate } from '@/data/tasks';
import { TaskCard } from './task-card';

const pad = (n: number) => String(n).padStart(2, '0');

/** 每日任务模块主界面:顶部实时日期时间,下方按时间排列的今日任务卡片 */
export function DailyTasksScreen() {
  const [now, setNow] = useState(() => new Date());

  // 每秒刷新一次时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 任务只随日期变化,按天缓存即可
  const todayKey = now.toDateString();
  const tasks = useMemo(() => getTasksForDate(new Date(todayKey)), [todayKey]);

  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        今天是 {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日{' '}
        {pad(now.getHours())}时{pad(now.getMinutes())}分{pad(now.getSeconds())}秒
      </Text>

      <Text style={styles.sectionLabel}>今日任务({tasks.length})</Text>
      <View style={styles.list}>
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} past={t.time < nowHM} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
});
