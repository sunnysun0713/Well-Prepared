import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WheelPicker } from './WheelPicker';

const ACCENT = '#4F46E5';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface Props {
  visible: boolean;
  subtitle?: string;
  /** 初始起始时间 'HH:mm';空或非法时使用 09:00 */
  initialStart: string;
  /** 初始结束时间 'HH:mm';空或非法时使用 09:30 */
  initialEnd: string;
  onCancel: () => void;
  onConfirm: (start: string, end: string) => void;
}

/** 解析 'HH:mm',非法时回落到默认值 */
function parseTime(value: string, fallback: { hour: number; minute: number }) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return fallback;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** 24 小时制起止时间设置:开始 / 结束两组滚轮在同一个弹窗里 */
export function TimeRangeModal({
  visible,
  subtitle,
  initialStart,
  initialEnd,
  onCancel,
  onConfirm,
}: Props) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(30);
  const [error, setError] = useState('');

  // 打开时按任务当前时间定位滚轮(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      const start = parseTime(initialStart, { hour: 9, minute: 0 });
      const end = parseTime(initialEnd, { hour: 9, minute: 30 });
      setStartHour(start.hour);
      setStartMinute(start.minute);
      setEndHour(end.hour);
      setEndMinute(end.minute);
      setError('');
    }
  }

  const startText = `${HOURS[startHour]}:${MINUTES[startMinute]}`;
  const endText = `${HOURS[endHour]}:${MINUTES[endMinute]}`;

  const save = () => {
    if (endText <= startText) {
      setError('结束时间需晚于起始时间');
      return;
    }
    onConfirm(startText, endText);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>设置时间</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>开始</Text>
              <Text style={styles.sectionTime}>{startText}</Text>
            </View>
            <View style={styles.wheelsRow}>
              <WheelPicker
                key={`${visible}-start-hour`}
                options={HOURS}
                value={startHour}
                onChange={setStartHour}
                width={64}
                itemHeight={30}
                visibleCount={3}
              />
              <Text style={styles.colon}>:</Text>
              <WheelPicker
                key={`${visible}-start-minute`}
                options={MINUTES}
                value={startMinute}
                onChange={setStartMinute}
                width={64}
                itemHeight={30}
                visibleCount={3}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>结束</Text>
              <Text style={styles.sectionTime}>{endText}</Text>
            </View>
            <View style={styles.wheelsRow}>
              <WheelPicker
                key={`${visible}-end-hour`}
                options={HOURS}
                value={endHour}
                onChange={setEndHour}
                width={64}
                itemHeight={30}
                visibleCount={3}
              />
              <Text style={styles.colon}>:</Text>
              <WheelPicker
                key={`${visible}-end-minute`}
                options={MINUTES}
                value={endMinute}
                onChange={setEndMinute}
                width={64}
                itemHeight={30}
                visibleCount={3}
              />
            </View>
          </View>

          <Text style={styles.hint}>上下滑动选择小时和分钟(24 小时制)</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
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
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingVertical: 16,
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
  section: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionTime: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  colon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    alignSelf: 'stretch',
    marginTop: 10,
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 10,
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
