import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

interface WheelItemProps {
  option: string;
  active: boolean;
  itemHeight: number;
  onPress: () => void;
}

/** 单项:仅选中态或高度变化时重渲染;滚动期间其余项全部跳过 */
const WheelItem = memo(function WheelItem({
  option,
  active,
  itemHeight,
  onPress,
}: WheelItemProps) {
  return (
    <Pressable onPress={onPress} style={[styles.item, { height: itemHeight }]}>
      {/* 固定宽高的滚轮项:禁止换行与系统字体缩放,避免手机上「2026年」折成两行 */}
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={[styles.itemText, active && styles.itemTextActive]}
      >
        {option}
      </Text>
    </Pressable>
  );
});

interface Props {
  options: string[];
  /** 初始选中下标 */
  value: number;
  onChange: (index: number) => void;
  /** 滚轮窗口宽度 */
  width?: number;
  /** 单项高度,默认 36 */
  itemHeight?: number;
  /** 可见项数(奇数),默认 5 */
  visibleCount?: number;
}

/** 滚轮选择器:滚动中实时选中居中项,停止后强制吸附到单项居中 */
export function WheelPicker({
  options,
  value,
  onChange,
  width = 120,
  itemHeight = 36,
  visibleCount = 5,
}: Props) {
  const padding = ((visibleCount - 1) / 2) * itemHeight;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [selected, setSelected] = useState(value);
  const dragging = useRef(false);
  const lastOffset = useRef(value * itemHeight);
  const lastSelected = useRef(value);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // contentOffset 在部分平台(如 Web)挂载时不生效,挂载后强制滚动到初始位置(仅一次)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      scrollRef.current?.scrollTo({ y: value * itemHeight, animated: false });
    }
  }, [value, itemHeight]);

  const clearTimer = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  }, []);

  const scrollToIndex = useCallback(
    (i: number, animated = true) => {
      scrollRef.current?.scrollTo({ y: i * itemHeight, animated });
    },
    [itemHeight],
  );

  /** 当前偏移对应的选项下标(夹在有效范围) */
  const indexAt = useCallback(
    (offsetY: number) =>
      Math.max(0, Math.min(options.length - 1, Math.round(offsetY / itemHeight))),
    [options.length, itemHeight],
  );

  /** 仅在下标真正变化时更新状态与父组件,避免逐帧无效渲染 */
  const applyIndex = useCallback(
    (i: number) => {
      if (i !== lastSelected.current) {
        lastSelected.current = i;
        setSelected(i);
        onChange(i);
      }
    },
    [onChange],
  );

  /** 滚动停止后:校正到精确位置,避免两项各占一半卡在阴影里 */
  const settle = useCallback(
    (offsetY: number) => {
      lastOffset.current = offsetY;
      const i = indexAt(offsetY);
      applyIndex(i);
      if (Math.abs(offsetY - i * itemHeight) > 0.5) {
        scrollToIndex(i);
      }
    },
    [applyIndex, indexAt, itemHeight, scrollToIndex],
  );

  /** Web 无原生 snap,滚动停歇 80ms 后兜底吸附;原生端靠 snapToInterval 无需定时器 */
  const scheduleSettle = useCallback(() => {
    clearTimer();
    settleTimer.current = setTimeout(() => {
      if (!dragging.current) {
        settle(lastOffset.current);
      }
    }, 80);
  }, [clearTimer, settle]);

  /** 直接点选某项 */
  const pick = useCallback(
    (i: number) => {
      clearTimer();
      scrollToIndex(i);
      applyIndex(i);
    },
    [clearTimer, scrollToIndex, applyIndex],
  );

  // 每个下标一份稳定回调,配合 WheelItem memo 让滚动时未变化的项零重渲染
  const pressAt = useMemo(() => options.map((_, i) => () => pick(i)), [options, pick]);

  return (
    <View style={[styles.window, { width, height: visibleCount * itemHeight }]}>
      <View
        pointerEvents="none"
        style={[styles.band, { top: padding, height: itemHeight }]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: value * itemHeight }}
        contentContainerStyle={{ paddingVertical: padding }}
        onScrollBeginDrag={() => {
          dragging.current = true;
          clearTimer();
        }}
        onScroll={(e) => {
          lastOffset.current = e.nativeEvent.contentOffset.y;
          applyIndex(indexAt(lastOffset.current));
          if (Platform.OS === 'web') scheduleSettle();
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {options.map((opt, i) => (
          <WheelItem
            key={opt}
            option={opt}
            active={i === selected}
            itemHeight={itemHeight}
            onPress={pressAt[i]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  item: {
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
