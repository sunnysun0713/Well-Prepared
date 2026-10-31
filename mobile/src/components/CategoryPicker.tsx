import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCategories } from '@/data/categories-context';
import { CategoryManagerModal } from './CategoryManagerModal';

const ACCENT = '#4F46E5';

interface Props {
  value?: string;
  onChange: (id?: string) => void;
}

/** 分类选择器:按用户排序展示标签,最后一个入口打开标签管理 */
export function CategoryPicker({ value, onChange }: Props) {
  const { categories } = useCategories();
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      <View style={styles.grid}>
        {categories.map((category) => {
          const active = value === category.id;
          return (
            <Pressable
              key={category.id}
              onPress={() => onChange(active ? undefined : category.id)}
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
            </Pressable>
          );
        })}
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
});
