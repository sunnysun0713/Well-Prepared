import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ExtractedTask } from '@/ai/types';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  tasks: ExtractedTask[];
  onClose: () => void;
}

/** dateKey 转展示标签:今天 / 明天 / 昨天 / M月D日 */
function dateLabel(dateKey: string, today: Date): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(y, m - 1, d) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === -1) return '昨天';
  return `${m}月${d}日`;
}

/** 提取结果弹窗:展示 AI 识别出的任务清单(确认导入在后续版本) */
export function ResultModal({ visible, tasks, onClose }: Props) {
  const today = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>提取结果({tasks.length} 条)</Text>

          {tasks.length > 0 ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {tasks.map((t, i) => (
                <View key={`${t.title}-${i}`} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{t.title}</Text>
                    {t.note ? <Text style={styles.rowNote}>{t.note}</Text> : null}
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={styles.metaDate}>{dateLabel(t.dateKey, today)}</Text>
                    <Text style={styles.metaTime}>
                      {t.startTime && t.endTime
                        ? `${t.startTime} ~ ${t.endTime}`
                        : t.startTime
                          ? `${t.startTime} 起`
                          : '未指定时间'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.empty}>没有识别到任务,试试更清晰的照片</Text>
          )}

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>关闭</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metaDate: {
    fontSize: 12,
    fontWeight: '500',
    color: ACCENT,
  },
  metaTime: {
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  button: {
    marginTop: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
