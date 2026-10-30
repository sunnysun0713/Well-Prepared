import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

const ACCENT = '#4F46E5';
const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
// 上下留白,让第一项和最后一项也能滚动到窗口中心
const PADDING = ((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT;

interface WheelPickerProps {
  options: string[];
  /** 初始选中下标 */
  value: number;
  onChange: (index: number) => void;
  /** 滚轮窗口宽度 */
  width?: number;
}

/** 滚轮选择器:可滑动吸附,也可直接点选项 */
export function WheelPicker({ options, value, onChange, width = 120 }: WheelPickerProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [selected, setSelected] = useState(value);

  const scrollToIndex = (i: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated });
  };

  /** 停稳后吸附到最近的选项 */
  const settle = (offsetY: number) => {
    const i = Math.max(0, Math.min(options.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    if (Math.abs(offsetY - i * ITEM_HEIGHT) > 0.5) {
      scrollToIndex(i);
    }
    setSelected(i);
    onChange(i);
  };

  const pick = (i: number) => {
    scrollToIndex(i);
    setSelected(i);
    onChange(i);
  };

  return (
    <View style={[styles.window, { width }]}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: value * ITEM_HEIGHT }}
        contentContainerStyle={styles.scrollContent}
        onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          settle(e.nativeEvent.contentOffset.y)
        }
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          settle(e.nativeEvent.contentOffset.y)
        }
      >
        {options.map((opt, i) => (
          <Pressable key={opt} onPress={() => pick(i)} style={styles.item}>
            <Text style={[styles.itemText, i === selected && styles.itemTextActive]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

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
  const dayOptions = Array.from({ length: dayCount }, (_, i) => `${i + 1}日`);
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
            {/* 天数组变化时用 key 重挂载,让滚轮回到新的有效位置 */}
            <WheelPicker
              key={dayCount}
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  wheelsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  window: {
    height: VISIBLE_COUNT * ITEM_HEIGHT,
  },
  band: {
    position: 'absolute',
    top: PADDING,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  scrollContent: {
    paddingVertical: PADDING,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  itemTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
