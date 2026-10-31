import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CATEGORY_COLORS,
  CATEGORY_NAME_MAX_LENGTH,
  type TaskCategory,
} from '@/data/categories';
import { useCategories } from '@/data/categories-context';
import { useTasks } from '@/data/tasks-context';

const ACCENT = '#4F46E5';
const ROW_HEIGHT = 36;
const ROW_GAP = 4;
const PITCH = ROW_HEIGHT + ROW_GAP;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 删除某个分类后的回调(用于清空选择器中已失效的选中项) */
  onCategoryRemoved?: (id: string) => void;
}

interface RowProps {
  category: TaskCategory;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onDragStateChange: (dragging: boolean) => void;
  pendingDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

/** 单行标签:拖动左侧 ☰ 调整顺序,自定义标签可删除 */
function CategoryRow({
  category,
  index,
  count,
  onMove,
  onDragStateChange,
  pendingDelete,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: RowProps) {
  const [dragY] = useState(() => new Animated.Value(0));
  const [dragging, setDragging] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          setDragging(true);
          onDragStateChange(true);
        },
        onPanResponderMove: (_e, g) => dragY.setValue(g.dy),
        onPanResponderRelease: (_e, g) => {
          setDragging(false);
          onDragStateChange(false);
          dragY.setValue(0);
          const target = Math.max(
            0,
            Math.min(count - 1, index + Math.round(g.dy / PITCH)),
          );
          if (target !== index) onMove(index, target);
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          onDragStateChange(false);
          dragY.setValue(0);
        },
      }),
    [dragY, index, count, onMove, onDragStateChange],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        dragging && styles.rowDragging,
        { transform: [{ translateY: dragY }] },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handle} hitSlop={6}>
        <Text style={styles.handleText}>☰</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <Text style={styles.rowName} numberOfLines={1}>
        {category.name}
      </Text>
      {category.custom ? (
        pendingDelete ? (
          <View style={styles.deleteConfirm}>
            <Pressable onPress={onCancelDelete} hitSlop={6}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable onPress={onConfirmDelete} hitSlop={6}>
              <Text style={styles.dangerText}>删除</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onRequestDelete} hitSlop={8}>
            <Text style={styles.trash}>🗑️</Text>
          </Pressable>
        )
      ) : null}
    </Animated.View>
  );
}

/** 标签管理:拖动排序、删除自定义标签、新增标签 */
export function CategoryManagerModal({ visible, onClose, onCategoryRemoved }: Props) {
  const { categories, addCategory, removeCategory, moveCategory } = useCategories();
  const { clearCategory } = useTasks();
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleMove = useCallback(
    (from: number, to: number) => moveCategory(from, to),
    [moveCategory],
  );

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入标签名');
      return;
    }
    addCategory(trimmed, color);
    setName('');
    setError('');
  };

  const confirmDelete = (category: TaskCategory) => {
    removeCategory(category.id);
    clearCategory(category.id);
    onCategoryRemoved?.(category.id);
    setPendingDelete(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>管理标签</Text>
          <Text style={styles.hint}>拖动 ☰ 调整顺序;自定义标签可删除</Text>

          <ScrollView
            style={styles.list}
            scrollEnabled={!dragging}
            contentContainerStyle={styles.listContent}
          >
            {categories.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                index={index}
                count={categories.length}
                onMove={handleMove}
                onDragStateChange={setDragging}
                pendingDelete={pendingDelete === category.id}
                onRequestDelete={() => setPendingDelete(category.id)}
                onCancelDelete={() => setPendingDelete(null)}
                onConfirmDelete={() => confirmDelete(category)}
              />
            ))}
          </ScrollView>

          <View style={styles.addSection}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder={`新标签名(最多 ${CATEGORY_NAME_MAX_LENGTH} 字)`}
              placeholderTextColor="#9CA3AF"
              maxLength={CATEGORY_NAME_MAX_LENGTH}
            />
            <View style={styles.colorRow}>
              {CATEGORY_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      selected && styles.swatchSelected,
                    ]}
                  />
                );
              })}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.addButton} onPress={add}>
              <Text style={styles.addButtonText}>添加标签</Text>
            </Pressable>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>完成</Text>
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
    maxHeight: '85%',
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
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
    maxHeight: 220,
  },
  listContent: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  rowDragging: {
    zIndex: 10,
    elevation: 4,
    backgroundColor: '#EEF2FF',
  },
  handle: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  trash: {
    fontSize: 14,
  },
  deleteConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  addSection: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    gap: 8,
  },
  input: {
    height: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#1F2937',
  },
  error: {
    fontSize: 11,
    color: '#DC2626',
  },
  addButton: {
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    marginTop: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});
