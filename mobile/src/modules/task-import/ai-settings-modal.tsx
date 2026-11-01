import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PROVIDERS } from '@/ai/providers';
import { useAiSettings } from '@/ai/settings';
import { reminderLabel } from '@/data/reminder-options';
import { ensureNotificationPermission, NOTIFICATIONS_SUPPORTED } from '@/notifications';
import { ReminderTimeModal } from '@/components/ReminderTimeModal';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** AI 设置弹窗:选择视觉服务(Mock / 真实接口)+ 填写 API key + 导入时自动闹钟 */
export function AiSettingsModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [providerId, setProviderId] = useState(settings.providerId);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [remind, setRemind] = useState<number | null>(settings.importReminderMinutes);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [error, setError] = useState('');

  // 打开弹窗时重置为已保存设置(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setProviderId(settings.providerId);
      setApiKey(settings.apiKey);
      setRemind(settings.importReminderMinutes);
      setReminderOpen(false);
      setError('');
    }
  }

  const provider = PROVIDERS.find((p) => p.id === providerId);

  const save = async () => {
    // 开启自动闹钟前确认通知权限,避免"设了却不响"
    if (remind != null && NOTIFICATIONS_SUPPORTED) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setError('通知权限被拒绝,闹钟不会生效;请开启权限或关闭自动闹钟后再保存');
        return;
      }
    }
    // 展开已有设置,避免覆盖导入模式等其它字段
    updateSettings({
      ...settings,
      providerId,
      apiKey: provider?.mock ? '' : apiKey.trim(),
      importReminderMinutes: remind,
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

          {provider && !provider.mock && (
            <>
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
            </>
          )}
          {provider?.mock && (
            <Text style={styles.note}>模拟模式返回示例任务,无需 key,用于自测流程</Text>
          )}

          <Text style={styles.label}>导入时自动设置闹钟</Text>
          <View style={styles.reminderRow}>
            <Switch
              value={remind != null}
              onValueChange={(on) => setRemind(on ? (remind ?? 10) : null)}
              trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
              thumbColor={remind != null ? ACCENT : '#F3F4F6'}
            />
            <Pressable
              style={[styles.reminderButton, remind == null && styles.reminderButtonDisabled]}
              disabled={remind == null}
              onPress={() => setReminderOpen(true)}
            >
              <Text style={styles.reminderButtonText}>
                {remind != null ? reminderLabel(remind) : '未开启'}
              </Text>
              <Text style={styles.reminderButtonHint}>设置时间</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>开启后,AI 提取导入的任务会自动带上该提醒</Text>
          {!NOTIFICATIONS_SUPPORTED && (
            <Text style={styles.note}>提醒仅在手机上生效,浏览器预览不支持</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}

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

      <ReminderTimeModal
        visible={reminderOpen}
        value={remind}
        onClose={() => setReminderOpen(false)}
        onSelect={setRemind}
        onDeleted={(minutes) => {
          if (remind === minutes) setRemind(10);
        }}
      />
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  reminderButtonDisabled: {
    opacity: 0.5,
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  reminderButtonHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  error: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 6,
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
