import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dateKeyOf, parseDateKey } from '@/data/tasks';
import { WheelPicker } from './WheelPicker';

const ACCENT = '#4F46E5';
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
const MIN_YEARS_BEFORE = 2;
const MAX_YEARS_AFTER = 20;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface Props {
  visible: boolean;
  subtitle?: string;
  /** 初始开始日期键 'YYYY-M-D' */
  initialStartKey: string;
  /** 初始结束日期键 'YYYY-M-D' */
  initialEndKey: string;
  onCancel: () => void;
  onConfirm: (startKey: string, endKey: string) => void;
}

/** 跨多天任务的起止日期设置:年月日滚轮,开始 / 结束两组 */
export function DateRangeModal({
  visible,
  subtitle,
  initialStartKey,
  initialEndKey,
  onCancel,
  onConfirm,
}: Props) {
  const today = new Date();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [startY, setStartY] = useState(today.getFullYear());
  const [startM, setStartM] = useState(today.getMonth());
  const [startD, setStartD] = useState(today.getDate());
  const [endY, setEndY] = useState(today.getFullYear());
  const [endM, setEndM] = useState(today.getMonth());
  const [endD, setEndD] = useState(today.getDate());
  const [error, setError] = useState('');

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      const s = parseDateKey(initialStartKey) ?? today;
      const e = parseDateKey(initialEndKey) ?? s;
      setStartY(s.getFullYear());
      setStartM(s.getMonth());
      setStartD(s.getDate());
      setEndY(e.getFullYear());
      setEndM(e.getMonth());
      setEndD(e.getDate());
      setError('');
    }
  }

  // 年份范围按「今天」和打开时的初始日期固定,滚动过程中不变化;
  // 否则滚到边界时数组会整体前移,导致滚轮显示与上方日期错位
  const initialStartYear = (parseDateKey(initialStartKey) ?? today).getFullYear();
  const initialEndYear = (parseDateKey(initialEndKey) ?? today).getFullYear();
  const minYear = Math.min(
    today.getFullYear() - MIN_YEARS_BEFORE,
    initialStartYear,
    initialEndYear,
  );
  const maxYear = Math.max(
    today.getFullYear() + MAX_YEARS_AFTER,
    initialStartYear,
    initialEndYear,
  );
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => `${minYear + i}年`),
    [minYear, maxYear],
  );
  const yearsFrom = minYear;

  const startDays = daysInMonth(startY, startM);
  const endDays = daysInMonth(endY, endM);
  const startDayIdx = Math.min(startD - 1, startDays - 1);
  const endDayIdx = Math.min(endD - 1, endDays - 1);
  const startDayOptions = useMemo(
    () => Array.from({ length: startDays }, (_, i) => `${i + 1}日`),
    [startDays],
  );
  const endDayOptions = useMemo(
    () => Array.from({ length: endDays }, (_, i) => `${i + 1}日`),
    [endDays],
  );

  const startDate = new Date(startY, startM, startDayIdx + 1);
  const endDate = new Date(endY, endM, endDayIdx + 1);

  // 滚轮回调用 useCallback 保持引用稳定;否则快速滚动时每次选中都会重建全部滚轮项,造成抽搐
  const changeStartYear = useCallback(
    (i: number) => {
      const y = yearsFrom + i;
      setStartY(y);
      setStartD((d) => Math.min(d, daysInMonth(y, startM)));
    },
    [yearsFrom, startM, setStartY, setStartD],
  );
  const changeStartMonth = useCallback(
    (i: number) => {
      setStartM(i);
      setStartD((d) => Math.min(d, daysInMonth(startY, i)));
    },
    [startY, setStartM, setStartD],
  );
  const changeStartDay = useCallback((i: number) => setStartD(i + 1), [setStartD]);
  const changeEndYear = useCallback(
    (i: number) => {
      const y = yearsFrom + i;
      setEndY(y);
      setEndD((d) => Math.min(d, daysInMonth(y, endM)));
    },
    [yearsFrom, endM, setEndY, setEndD],
  );
  const changeEndMonth = useCallback(
    (i: number) => {
      setEndM(i);
      setEndD((d) => Math.min(d, daysInMonth(endY, i)));
    },
    [endY, setEndM, setEndD],
  );
  const changeEndDay = useCallback((i: number) => setEndD(i + 1), [setEndD]);

  const save = () => {
    if (endDate.getTime() < startDate.getTime()) {
      setError('结束日期不能早于开始日期');
      return;
    }
    onConfirm(dateKeyOf(startDate), dateKeyOf(endDate));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>设置日期</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>开始</Text>
              <Text style={styles.sectionDate} numberOfLines={1}>
                {startDate.getFullYear()}年{startDate.getMonth() + 1}月{startDate.getDate()}日
              </Text>
            </View>
            <View style={styles.wheelsRow}>
              <WheelPicker
                key={`${visible}-start-year`}
                options={years}
                value={startY - yearsFrom}
                onChange={changeStartYear}
                width={70}
                itemHeight={30}
                visibleCount={3}
              />
              <WheelPicker
                key={`${visible}-start-month`}
                options={MONTHS}
                value={startM}
                onChange={changeStartMonth}
                width={52}
                itemHeight={30}
                visibleCount={3}
              />
              <WheelPicker
                key={`${visible}-start-day`}
                options={startDayOptions}
                value={startDayIdx}
                onChange={changeStartDay}
                width={52}
                itemHeight={30}
                visibleCount={3}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>结束</Text>
              <Text style={styles.sectionDate} numberOfLines={1}>
                {endDate.getFullYear()}年{endDate.getMonth() + 1}月{endDate.getDate()}日
              </Text>
            </View>
            <View style={styles.wheelsRow}>
              <WheelPicker
                key={`${visible}-end-year`}
                options={years}
                value={endY - yearsFrom}
                onChange={changeEndYear}
                width={70}
                itemHeight={30}
                visibleCount={3}
              />
              <WheelPicker
                key={`${visible}-end-month`}
                options={MONTHS}
                value={endM}
                onChange={changeEndMonth}
                width={52}
                itemHeight={30}
                visibleCount={3}
              />
              <WheelPicker
                key={`${visible}-end-day`}
                options={endDayOptions}
                value={endDayIdx}
                onChange={changeEndDay}
                width={52}
                itemHeight={30}
                visibleCount={3}
              />
            </View>
          </View>

          <Text style={styles.hint}>上下滑动选择年月日,跨度不限</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
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
  sectionDate: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
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
