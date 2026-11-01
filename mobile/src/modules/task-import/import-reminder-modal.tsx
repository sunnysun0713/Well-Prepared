import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAiSettings } from '@/ai/settings';
import { ReminderTimeModal } from '@/components/ReminderTimeModal';
import { reminderLabel } from '@/data/reminder-options';
import { DEFAULT_REMINDER_SOUND } from '@/data/reminder-sounds';
import { ensureNotificationPermission, NOTIFICATIONS_SUPPORTED } from '@/notifications';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 任务载入的「规划」选项:设置 AI 提取导入任务时自动带上的闹钟与短信提醒 */
export function ImportReminderModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [remind, setRemind] = useState<number | null>(settings.importReminderMinutes);
  const [sound, setSound] = useState(
    settings.importReminderSound || DEFAULT_REMINDER_SOUND,
  );
  const [smsRemind, setSmsRemind] = useState<number | null>(
    settings.importSmsRemindMinutes,
  );
  const [smsSound, setSmsSound] = useState(
    settings.importSmsRemindSound || DEFAULT_REMINDER_SOUND,
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [smsReminderOpen, setSmsReminderOpen] = useState(false);
  const [error, setError] = useState('');

  // 打开弹窗时重置为已保存设置(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setRemind(settings.importReminderMinutes);
      setSound(settings.importReminderSound || DEFAULT_REMINDER_SOUND);
      setSmsRemind(settings.importSmsRemindMinutes);
      setSmsSound(settings.importSmsRemindSound || DEFAULT_REMINDER_SOUND);
      setReminderOpen(false);
      setSmsReminderOpen(false);
      setError('');
    }
  }

  const save = async () => {
    // 开启自动提醒前确认通知权限,避免"设了却不响"
    if ((remind != null || smsRemind != null) && NOTIFICATIONS_SUPPORTED) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setError('通知权限被拒绝,提醒不会生效;请开启权限或关闭提醒后再保存');
        return;
      }
    }
    updateSettings({
      ...settings,
      importReminderMinutes: remind,
      importReminderSound: sound,
      importSmsRemindMinutes: smsRemind,
      importSmsRemindSound: smsSound,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>规划</Text>
          <Text style={styles.hint}>AI 提取导入的任务会自动带上这里的提醒</Text>

          <Text style={styles.label}>闹钟提醒</Text>
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

          <Text style={styles.label}>短信提醒</Text>
          <View style={styles.reminderRow}>
            <Switch
              value={smsRemind != null}
              onValueChange={(on) => setSmsRemind(on ? (smsRemind ?? 10) : null)}
              trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
              thumbColor={smsRemind != null ? ACCENT : '#F3F4F6'}
            />
            <Pressable
              style={[
                styles.reminderButton,
                smsRemind == null && styles.reminderButtonDisabled,
              ]}
              disabled={smsRemind == null}
              onPress={() => setSmsReminderOpen(true)}
            >
              <Text style={styles.reminderButtonText}>
                {smsRemind != null ? reminderLabel(smsRemind) : '未开启'}
              </Text>
              <Text style={styles.reminderButtonHint}>设置时间</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>短信提醒会单独弹出一条消息,时间可与闹钟不同</Text>
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
        sound={sound}
        onSelectSound={setSound}
      />

      <ReminderTimeModal
        visible={smsReminderOpen}
        value={smsRemind}
        onClose={() => setSmsReminderOpen(false)}
        onSelect={setSmsRemind}
        onDeleted={(minutes) => {
          if (smsRemind === minutes) setSmsRemind(10);
        }}
        sound={smsSound}
        onSelectSound={setSmsSound}
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 6,
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
    height: 36,
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
  note: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
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
