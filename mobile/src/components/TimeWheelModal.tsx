import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WheelPicker } from './WheelPicker';

const ACCENT = '#4F46E5';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** 初始时间 'HH:mm';空或非法时使用 09:00 */
  initialTime: string;
  /** 返回错误文案时阻止保存并展示 */
  validate?: (time: string) => string | null;
  onCancel: () => void;
  onConfirm: (time: string) => void;
}

/** 解析 'HH:mm',非法时回落到 09:00 */
function parseTime(value: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** 24 小时制时间滚轮弹窗:小时 + 分钟双滚轮 */
export function TimeWheelModal({
  visible,
  title,
  subtitle,
  initialTime,
  validate,
  onCancel,
  onConfirm,
}: Props) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState('');

  // 打开时按初始时间定位滚轮(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      const parsed = parseTime(initialTime);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setError('');
    }
  }

  const time = `${HOURS[hour]}:${MINUTES[minute]}`;

  const confirm = () => {
    const message = validate?.(time) ?? null;
    if (message) {
      setError(message);
      return;
    }
    onConfirm(time);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          <Text style={styles.preview}>{time}</Text>

          <View style={styles.wheelsRow}>
            <WheelPicker options={HOURS} value={hour} onChange={setHour} width={72} />
            <Text style={styles.colon}>:</Text>
            <WheelPicker options={MINUTES} value={minute} onChange={setMinute} width={72} />
          </View>
          <Text style={styles.hint}>上下滑动选择小时和分钟(24 小时制)</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={confirm}>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
    maxWidth: '90%',
  },
  preview: {
    fontSize: 24,
    fontWeight: '700',
    color: ACCENT,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  colon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignSelf: 'stretch',
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
