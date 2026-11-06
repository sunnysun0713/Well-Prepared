import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WheelPicker } from '@/components/WheelPicker';
import { colors, radius } from '@/theme';

interface WheelPickerModalProps {
  visible: boolean;
  title: string;
  yearOptions: string[];
  monthOptions: string[];
  /** 根据年、月下标返回该月天数(自动处理闰年) */
  getDayCount: (yearIndex: number, monthIndex: number) => number;
  yearValue: number;
  monthValue: number;
  /** 日下标(日 - 1) */
  dayValue: number;
  onConfirm: (yearIndex: number, monthIndex: number, dayIndex: number) => void;
  onCancel: () => void;
}

/** 年月日选择弹窗:年 / 月 / 日三个滚轮并排,日选项随所选年月联动 */
export function WheelPickerModal({
  visible,
  title,
  yearOptions,
  monthOptions,
  getDayCount,
  yearValue,
  monthValue,
  dayValue,
  onConfirm,
  onCancel,
}: WheelPickerModalProps) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [tempYear, setTempYear] = useState(yearValue);
  const [tempMonth, setTempMonth] = useState(monthValue);
  const [tempDay, setTempDay] = useState(dayValue);

  // 弹窗打开/关闭切换时在渲染期间重置滚轮值(避免 effect 内 setState 的级联渲染)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTempYear(yearValue);
      setTempMonth(monthValue);
      setTempDay(dayValue);
    }
  }

  // 根据当前所选年月生成日选项;年月变化时天数可能变少,把日夹到有效范围
  const dayCount = getDayCount(tempYear, tempMonth);
  const dayOptions = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => `${i + 1}日`),
    [dayCount],
  );
  const clampedDay = Math.min(tempDay, dayCount - 1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* 阻止点击卡片时冒泡触发 backdrop 的取消 */}
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.wheelsRow}>
            <WheelPicker
              options={yearOptions}
              value={tempYear}
              onChange={setTempYear}
              width={96}
            />
            <WheelPicker
              options={monthOptions}
              value={tempMonth}
              onChange={setTempMonth}
              width={72}
            />
            {/* 天数组变化时不重挂载:WheelPicker 内部会把高亮夹到最后一个有效项,
                重挂载会在挂载瞬间触发滚动事件,把日期覆盖成 1 日 */}
            <WheelPicker
              options={dayOptions}
              value={clampedDay}
              onChange={setTempDay}
              width={72}
            />
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={() => onConfirm(tempYear, tempMonth, clampedDay)}
            >
              <Text style={styles.confirmText}>确定</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  wheelsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceMuted,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
