import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CATEGORY_COLORS,
  CATEGORY_NAME_MAX_LENGTH,
  type TaskCategory,
} from '@/data/categories';
import { useCategories } from '@/data/categories-context';

const ACCENT = '#4F46E5';

interface Props {
  value?: string;
  onChange: (id?: string) => void;
}

/** 分类选择器:内置 + 自定义分类,支持就地新建自定义标签 */
export function CategoryPicker({ value, onChange }: Props) {
  const { categories, addCategory } = useCategories();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState('');

  const startEditing = () => {
    setName('');
    setColor(CATEGORY_COLORS[0]);
    setError('');
    setEditing(true);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入标签名');
      return;
    }
    const category: TaskCategory = addCategory(trimmed, color);
    onChange(category.id);
    setEditing(false);
  };

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
        <Pressable onPress={startEditing} style={[styles.chip, styles.addChip]}>
          <Text style={styles.addChipText}>+ 自定义</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.chip, !value && styles.chipNone]}
        >
          <Text style={styles.chipText}>无标签</Text>
        </Pressable>
      </View>

      {editing && (
        <View style={styles.editor}>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={`标签名(最多 ${CATEGORY_NAME_MAX_LENGTH} 字)`}
            placeholderTextColor="#9CA3AF"
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            autoFocus
          />
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => {
              const selected = color === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selected && styles.colorSwatchSelected,
                  ]}
                />
              );
            })}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.editorActions}>
            <Pressable style={styles.cancelButton} onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={save}>
              <Text style={styles.saveText}>保存标签</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  addChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: ACCENT,
  },
  editor: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
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
    backgroundColor: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#1F2937',
  },
  error: {
    fontSize: 11,
    color: '#DC2626',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
