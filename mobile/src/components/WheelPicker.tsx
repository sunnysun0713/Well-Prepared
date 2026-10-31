import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
// 上下留白,让第一项和最后一项也能滚动到窗口中心
const PADDING = ((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT;

interface Props {
  options: string[];
  /** 初始选中下标 */
  value: number;
  onChange: (index: number) => void;
  /** 滚轮窗口宽度 */
  width?: number;
}

/** 滚轮选择器:滚动中实时选中居中项,停止后强制吸附到单项居中 */
export function WheelPicker({ options, value, onChange, width = 120 }: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [selected, setSelected] = useState(value);
  const dragging = useRef(false);
  const lastOffset = useRef(value * ITEM_HEIGHT);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // contentOffset 在部分平台(如 Web)挂载时不生效,挂载后强制滚动到初始位置(仅一次)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      scrollRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
    }
  }, [value]);

  const clearTimer = () => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  const scrollToIndex = (i: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated });
  };

  /** 当前偏移对应的选项下标(夹在有效范围) */
  const indexAt = (offsetY: number) =>
    Math.max(0, Math.min(options.length - 1, Math.round(offsetY / ITEM_HEIGHT)));

  /** 滚动中:实时选中经过中心阴影的项 */
  const track = (offsetY: number) => {
    lastOffset.current = offsetY;
    const i = indexAt(offsetY);
    setSelected(i);
    onChange(i);
  };

  /** 滚动停止后:校正到精确位置,避免两项各占一半卡在阴影里 */
  const settle = (offsetY: number) => {
    lastOffset.current = offsetY;
    const i = indexAt(offsetY);
    if (Math.abs(offsetY - i * ITEM_HEIGHT) > 0.5) {
      scrollToIndex(i);
    }
    setSelected(i);
    onChange(i);
  };

  /** 滚动事件停歇 80ms 后兜底吸附(覆盖无 snap 的平台,如 Web) */
  const scheduleSettle = () => {
    clearTimer();
    settleTimer.current = setTimeout(() => {
      if (!dragging.current) {
        settle(lastOffset.current);
      }
    }, 80);
  };

  /** 直接点选某项 */
  const pick = (i: number) => {
    clearTimer();
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
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: value * ITEM_HEIGHT }}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          dragging.current = true;
          clearTimer();
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          track(e.nativeEvent.contentOffset.y);
          scheduleSettle();
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
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

const styles = StyleSheet.create({
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
});
