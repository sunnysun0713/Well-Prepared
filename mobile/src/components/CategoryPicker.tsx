import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';
import type { TaskCategory } from '@/data/categories';
import { useCategories } from '@/data/categories-context';
import { CategoryManagerModal } from './CategoryManagerModal';

const ACCENT = '#4F46E5';

interface ChipProps {
  category: TaskCategory;
  active: boolean;
  onPress: () => void;
  onDrop: (id: string, px: number, py: number) => void;
  registerLayout: (id: string, layout: LayoutRectangle) => void;
}

/** 可拖动标签:轻点选中,拖动可调整顺序 */
function DraggableChip({ category, active, onPress, onDrop, registerLayout }: ChipProps) {
  const [dragPos] = useState(() => new Animated.ValueXY());
  const [dragging, setDragging] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 统一接管轻点与拖动,避免内层 Pressable 抢占手势
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // 拒绝把拖动交给外层 ScrollView,否则手势会被滚动抢走
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) {
            setDragging(true);
            dragPos.setValue({ x: g.dx, y: g.dy });
          }
        },
        onPanResponderRelease: (_e, g) => {
          const moved = Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
          setDragging(false);
          dragPos.setValue({ x: 0, y: 0 });
          if (!moved) {
            onPress();
            return;
          }
          if (!layout) return;
          // 以被拖标签中心 + 位移作为落点,寻找最近的标签
          onDrop(
            category.id,
            layout.x + layout.width / 2 + g.dx,
            layout.y + layout.height / 2 + g.dy,
          );
        },
        onPanResponderTerminate: () => {
          console.log('[chip-terminate]', category.id);
          setDragging(false);
          dragPos.setValue({ x: 0, y: 0 });
        },
      }),
    [category.id, dragPos, layout, onDrop, onPress],
  );

  return (
    <Animated.View
      onLayout={(e) => {
        setLayout(e.nativeEvent.layout);
        registerLayout(category.id, e.nativeEvent.layout);
      }}
      style={[
        dragging && styles.chipDragging,
        { transform: dragPos.getTranslateTransform() },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        style={[
          styles.chip,
          active && { borderColor: category.color, backgroundColor: '#FFFFFF' },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: category.color }]} />
        <Text
          style={[styles.chipText, active && { color: category.color, fontWeight: '600' }]}
        >
          {category.name}
        </Text>
      </View>
    </Animated.View>
  );
}

interface Props {
  value?: string;
  onChange: (id?: string) => void;
}

/** 分类选择器:标签可直接拖动排序,最后一个入口打开标签管理 */
export function CategoryPicker({ value, onChange }: Props) {
  const { categories, moveCategory } = useCategories();
  const [managerOpen, setManagerOpen] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});

  const registerLayout = useCallback((id: string, layout: LayoutRectangle) => {
    setLayouts((prev) => {
      const existing = prev[id];
      if (
        existing &&
        existing.x === layout.x &&
        existing.y === layout.y &&
        existing.width === layout.width &&
        existing.height === layout.height
      ) {
        return prev;
      }
      return { ...prev, [id]: layout };
    });
  }, []);

  /** 根据拖动落点找到最近的标签,完成排序 */
  const handleDrop = useCallback(
    (id: string, px: number, py: number) => {
      const from = categories.findIndex((c) => c.id === id);
      if (from < 0) return;
      let bestIndex = from;
      let best = Infinity;
      categories.forEach((category, index) => {
        const layout = layouts[category.id];
        if (!layout) return;
        const dx = px - (layout.x + layout.width / 2);
        const dy = py - (layout.y + layout.height / 2);
        const distance = dx * dx + dy * dy;
        if (distance < best) {
          best = distance;
          bestIndex = index;
        }
      });
      if (bestIndex !== from) moveCategory(from, bestIndex);
    },
    [categories, layouts, moveCategory],
  );

  return (
    <>
      <View style={styles.grid}>
        {categories.map((category) => (
          <DraggableChip
            key={category.id}
            category={category}
            active={value === category.id}
            onPress={() => onChange(value === category.id ? undefined : category.id)}
            onDrop={handleDrop}
            registerLayout={registerLayout}
          />
        ))}
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.chip, !value && styles.chipNone]}
        >
          <Text style={styles.chipText}>无标签</Text>
        </Pressable>
        <Pressable onPress={() => setManagerOpen(true)} style={[styles.chip, styles.manageChip]}>
          <Text style={styles.manageChipText}>⚙️ 管理标签</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>拖动标签可调整顺序</Text>

      <CategoryManagerModal
        visible={managerOpen}
        onClose={() => setManagerOpen(false)}
        onCategoryRemoved={(id) => {
          if (value === id) onChange(undefined);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipNone: {
    borderColor: '#D1D5DB',
  },
  chipDragging: {
    zIndex: 10,
    elevation: 4,
    opacity: 0.9,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  manageChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  manageChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: ACCENT,
  },
  hint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
