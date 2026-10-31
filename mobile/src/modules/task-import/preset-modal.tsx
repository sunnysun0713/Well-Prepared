import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPreset, PRESETS } from '@/ai/presets';
import { useAiSettings } from '@/ai/settings';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 预设模板选择弹窗:每个预设拥有独立的提取提示词,选中后立即生效并持久化 */
export function PresetModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const active = getPreset(settings.presetId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>选择预设模板</Text>
          <Text style={styles.hint}>不同预设使用不同的提取规则</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {PRESETS.map((preset) => {
              const selected = preset.id === active.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    updateSettings({ ...settings, presetId: preset.id });
                    onClose();
                  }}
                  style={[styles.row, selected && styles.rowActive]}
                >
                  <Text style={styles.rowIcon}>{preset.icon}</Text>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowName, selected && styles.rowNameActive]}>
                      {preset.name}
                    </Text>
                    <Text style={styles.rowDesc}>{preset.description}</Text>
                  </View>
                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>关闭</Text>
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
    maxHeight: '80%',
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
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  rowIcon: {
    fontSize: 20,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowNameActive: {
    color: ACCENT,
  },
  rowDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  closeButton: {
    marginTop: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
