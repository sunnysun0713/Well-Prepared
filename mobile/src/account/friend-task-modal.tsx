import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { normalizeDate, normalizeTime } from '@/ai/parse';
import type { FriendInfo } from '@/cloud/friends';
import { sendTaskRequest } from '@/cloud/requests';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  friend: FriendInfo | null;
  onClose: () => void;
  /** 发送成功后回调提示文案 */
  onSent: (message: string) => void;
}

/** 给好友投递任务:好友同意后才会进入对方日历 */
export function FriendTaskModal({ visible, friend, onClose, onSent }: Props) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState('');
  const [dateText, setDateText] = useState('今天');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 打开时重置表单(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle('');
      setDateText('今天');
      setStartTime('09:00');
      setEndTime('09:30');
      setNote('');
      setError('');
      setBusy(false);
    }
  }

  const submit = async () => {
    if (!friend) return;
    const name = title.trim();
    if (!name) {
      setError('请输入任务名');
      return;
    }
    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);
    if (!start || !end || end <= start) {
      setError('时间格式应为 HH:mm,且结束时间晚于起始时间');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendTaskRequest(friend.id, {
        dateKey: normalizeDate(dateText, new Date()),
        title: name,
        startTime: start,
        endTime: end,
        note: note.trim() || undefined,
      });
      onSent(`已发送给 ${friend.nickname || friend.username},等待对方同意`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败,请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>
              给 {friend?.nickname || friend?.username || '好友'} 加任务
            </Text>
            <Text style={styles.hint}>对方同意后才会出现在他的日历里</Text>

            <Text style={styles.label}>任务名</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="要做什么?"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
              autoFocus
            />

            <Text style={styles.label}>日期</Text>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              style={styles.input}
              placeholder="今天 / 明天 / 10月31日"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>时间</Text>
            <View style={styles.timeRow}>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                style={styles.timeInput}
                placeholder="09:00"
                placeholderTextColor="#9CA3AF"
                maxLength={8}
              />
              <Text style={styles.dash}>至</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                style={styles.timeInput}
                placeholder="09:30"
                placeholderTextColor="#9CA3AF"
                maxLength={8}
              />
            </View>

            <Text style={styles.label}>备注</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={styles.input}
              placeholder="可选"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.confirmButton, busy && styles.disabled]}
                disabled={busy}
                onPress={submit}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>发送请求</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    width: 310,
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
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  dash: {
    fontSize: 13,
    color: '#6B7280',
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
  disabled: {
    opacity: 0.5,
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
