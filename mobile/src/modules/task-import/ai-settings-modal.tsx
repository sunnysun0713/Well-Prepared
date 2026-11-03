import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PROVIDERS } from '@/ai/providers';
import { useAiSettings } from '@/ai/settings';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** AI 设置弹窗:选择视觉服务 + 填写 API key */
export function AiSettingsModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [providerId, setProviderId] = useState(settings.providerId);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [customModel, setCustomModel] = useState(settings.customModel);

  // 打开弹窗时重置为已保存设置(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setProviderId(settings.providerId);
      setApiKey(settings.apiKey);
      setCustomModel(settings.customModel);
    }
  }

  const activeProvider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  const save = () => {
    // 展开已有设置,避免覆盖导入模式、模板等其它字段
    updateSettings({
      ...settings,
      providerId,
      apiKey: apiKey.trim(),
      customModel: customModel.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>AI 设置</Text>

          <Text style={styles.label}>视觉服务</Text>
          <View style={styles.providerList}>
            {PROVIDERS.map((p) => {
              const active = providerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setProviderId(p.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeProvider.customModel ? (
            <>
              <Text style={styles.label}>模型名称</Text>
              <TextInput
                value={customModel}
                onChangeText={setCustomModel}
                style={styles.input}
                placeholder="留空则使用默认视觉模型"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {activeProvider.modelHint ? (
                <Text style={styles.note}>{activeProvider.modelHint}</Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.label}>API Key</Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            style={styles.input}
            placeholder="粘贴服务商提供的 API Key"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.note}>
            真实接口在浏览器自测时可能受跨域限制,手机端无此问题
          </Text>

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
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
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 8,
  },
  providerList: {
    gap: 8,
  },
  chip: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  note: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
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
