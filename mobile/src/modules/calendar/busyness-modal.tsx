import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  DEFAULT_BUSYNESS_THRESHOLDS,
  isValidThresholds,
  MAX_BUSYNESS_STARS,
  useBusyness,
} from '@/data/busyness';

const ACCENT = '#4F46E5';
const GOLD = '#F59E0B';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 繁忙度指标设置:自定义每个星级所需的最少任务数 */
export function BusynessModal({ visible, onClose }: Props) {
  const { thresholds, saveThresholds } = useBusyness();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [values, setValues] = useState<string[]>(thresholds.map(String));
  const [error, setError] = useState('');

  // 打开时按当前阈值重置输入(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setValues(thresholds.map(String));
      setError('');
    }
  }

  const setAt = (index: number, text: string) => {
    setValues((prev) => prev.map((value, i) => (i === index ? text : value)));
  };

  const save = () => {
    const parsed = values.map((value) => parseInt(value, 10));
    if (parsed.some((value) => Number.isNaN(value))) {
      setError('请填写完整任务数');
      return;
    }
    if (!isValidThresholds(parsed)) {
      setError('任务数需为正整数,且从 1 星到 5 星依次增大');
      return;
    }
    saveThresholds(parsed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>繁忙度指标</Text>
          <Text style={styles.hint}>按当天任务数显示星星,最多 5 颗</Text>

          {Array.from({ length: MAX_BUSYNESS_STARS }, (_, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.stars}>{'★'.repeat(index + 1)}</Text>
              <Text style={styles.rowLabel}>任务数 ≥</Text>
              <TextInput
                value={values[index] ?? ''}
                onChangeText={(text) => setAt(index, text)}
                style={styles.input}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => setValues(DEFAULT_BUSYNESS_THRESHOLDS.map(String))}
            hitSlop={6}
          >
            <Text style={styles.resetText}>恢复默认(1/2/3/4/5)</Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={save}>
              <Text style={styles.confirmText}>保存</Text>
            </Pressable>
          </View>
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
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stars: {
    width: 62,
    fontSize: 12,
    color: GOLD,
    letterSpacing: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  input: {
    width: 64,
    height: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1F2937',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  error: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
    marginBottom: 4,
  },
  resetText: {
    fontSize: 11,
    color: ACCENT,
    textAlign: 'center',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: ACCENT,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
