import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reminderLabel } from '@/data/reminder-options';
import { DEFAULT_REMINDER_SOUND } from '@/data/reminder-sounds';
import { dateKeyOf, parseDateKey, type Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import {
  ensureExactAlarmPermission,
  ensureNotificationPermission,
  NOTIFICATIONS_SUPPORTED,
} from '@/notifications';
import { DateRangeModal } from './DateRangeModal';
import { NoteEditorModal, NOTE_MAX_LENGTH } from './NoteEditorModal';
import { ReminderTimeModal } from './ReminderTimeModal';
import { TimeRangeModal } from './TimeRangeModal';

const ACCENT = '#4F46E5';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 日期键展示:同年省略年份,跨年显示完整年份 */
function dateLabel(key: string): string {
  const date = parseDateKey(key);
  if (!date) return key;
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() === currentYear) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 日期键加天数,返回新的日期键 */
function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key) ?? new Date();
  date.setDate(date.getDate() + days);
  return dateKeyOf(date);
}

/** 比较两个日期键,返回毫秒差;非法日期视为相等 */
function compareDateKeys(a: string, b: string): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  if (!da || !db) return 0;
  return da.getTime() - db.getTime();
}

interface Props {
  visible: boolean;
  /** 新增模式:新任务所属日期;编辑模式(传 editTask)时忽略 */
  date?: Date;
  /** 编辑模式:要覆盖保存的任务;不传为新增 */
  editTask?: Task;
  /** 预填值(导入任务时使用),不写入任务层;与 editTask 二选一 */
  initialTask?: Task;
  /** 固定任务类型,不显示短时/长时切换(导入任务用) */
  lockKind?: boolean;
  /** 标题下的进度提示,如「第 1 / 3 条」 */
  progressText?: string;
  /** 确认按钮文案,默认「保存/添加」 */
  submitLabel?: string;
  /** 导入模式:提交时交给调用方写入任务(不再走默认新增/编辑) */
  onSubmit?: (task: Task, startDate: Date) => void;
  /** 导入模式:跳过当前条目 */
  onSkip?: () => void;
  onClose: () => void;
}

/** 新增/编辑任务弹窗:任务名 / 备注 / 时间 / 闹钟提醒 / 短信提醒 */
export function AddTaskModal({
  visible,
  date,
  editTask,
  initialTask,
  lockKind,
  progressText,
  submitLabel,
  onSubmit,
  onSkip,
  onClose,
}: Props) {
  const { addTask, updateTask, deleteTask } = useTasks();
  const source = initialTask ?? editTask;
  const initialBaseKey = dateKeyOf(date ?? new Date());
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState(source?.title ?? '');
  const [note, setNote] = useState(source?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const [startTime, setStartTime] = useState(source?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(source?.endTime ?? '09:30');
  const [remind, setRemind] = useState<number | null>(source?.remindAdvanceMinutes ?? null);
  const [remindSound, setRemindSound] = useState(
    source?.remindSound ?? DEFAULT_REMINDER_SOUND,
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [smsRemind, setSmsRemind] = useState<number | null>(
    source?.smsRemindAdvanceMinutes ?? null,
  );
  const [smsRemindSound, setSmsRemindSound] = useState(
    source?.smsRemindSound ?? DEFAULT_REMINDER_SOUND,
  );
  const [smsReminderOpen, setSmsReminderOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [kind, setKind] = useState<'short' | 'span'>(
    source?.kind === 'span' ? 'span' : 'short',
  );
  const [startDateKey, setStartDateKey] = useState(
    source?.startDateKey ?? initialBaseKey,
  );
  const [endDateKey, setEndDateKey] = useState(
    source?.endDateKey ?? addDaysToKey(source?.startDateKey ?? initialBaseKey, 1),
  );
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 打开弹窗时重置表单:编辑/导入预填任务当前值,新增模式用默认值(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      const isSpan = source?.kind === 'span';
      const baseKey = dateKeyOf(date ?? new Date());
      setTitle(source?.title ?? '');
      setNote(source?.note ?? '');
      setStartTime(source?.startTime ?? '09:00');
      setEndTime(source?.endTime ?? '09:30');
      setKind(isSpan ? 'span' : 'short');
      setStartDateKey(source?.startDateKey ?? baseKey);
      setEndDateKey(source?.endDateKey ?? addDaysToKey(source?.startDateKey ?? baseKey, 1));
      setRemind(source?.remindAdvanceMinutes ?? null);
      setRemindSound(source?.remindSound ?? DEFAULT_REMINDER_SOUND);
      setReminderOpen(false);
      setSmsRemind(source?.smsRemindAdvanceMinutes ?? null);
      setSmsRemindSound(source?.smsRemindSound ?? DEFAULT_REMINDER_SOUND);
      setSmsReminderOpen(false);
      setTimeOpen(false);
      setDateOpen(false);
      setNoteOpen(false);
      setNoteFocused(false);
      setError('');
      setConfirmDelete(false);
    }
  }

  /** 切换到跨多天时保证结束日期不早于开始日期 */
  const selectKind = (next: 'short' | 'span') => {
    setKind(next);
    setError('');
    if (next === 'span' && compareDateKeys(endDateKey, startDateKey) < 0) {
      setEndDateKey(startDateKey);
    }
  };

  const confirm = async () => {
    const t = title.trim();
    if (!t) {
      setError('请输入任务名');
      return;
    }
    // 允许整段任务没有具体时刻(如 AI 从「11月5日-10日出差」提取),有值时才校验格式
    const hasStartTime = startTime !== '';
    const hasEndTime = endTime !== '';
    if (
      (hasStartTime && !TIME_RE.test(startTime)) ||
      (hasEndTime && !TIME_RE.test(endTime))
    ) {
      setError('时间格式应为 HH:mm');
      return;
    }
    if (kind === 'span') {
      const startDate = parseDateKey(startDateKey);
      const endDate = parseDateKey(endDateKey);
      if (!startDate || !endDate) {
        setError('请设置开始和结束日期');
        return;
      }
      if (hasStartTime && hasEndTime) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const startAt = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          sh,
          sm,
        );
        const endAt = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          eh,
          em,
        );
        if (endAt.getTime() <= startAt.getTime()) {
          setError('长时任务的结束时间需晚于开始时间');
          return;
        }
      }
    } else if (hasStartTime && hasEndTime && endTime <= startTime) {
      setError('结束时间需晚于起始时间');
      return;
    }
    // 设置提醒前确认通知权限,避免"设了却不响"
    if ((remind != null || smsRemind != null) && NOTIFICATIONS_SUPPORTED) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setError(
          `通知权限被拒绝,提醒不会生效;请开启权限或关闭提醒后再${editTask ? '保存' : '添加'}`,
        );
        return;
      }
      // 精确闹钟权限:安卓 14+ 会跳系统设置引导开启;不阻塞保存
      void ensureExactAlarmPermission();
    }
    const fields = {
      title: t,
      startTime,
      endTime,
      note: note.trim() || undefined,
      kind: kind === 'span' ? ('span' as const) : ('short' as const),
      startDateKey: kind === 'span' ? startDateKey : undefined,
      endDateKey: kind === 'span' ? endDateKey : undefined,
      remindAdvanceMinutes: remind ?? undefined,
      remindSound: remind != null ? remindSound : undefined,
      smsRemindAdvanceMinutes: smsRemind ?? undefined,
      smsRemindSound: smsRemind != null ? smsRemindSound : undefined,
    };
    if (onSubmit) {
      // 导入模式:交给调用方写入任务,弹窗由调用方负责切换到下一条
      if (!date && kind === 'short') {
        setError('缺少任务日期');
        return;
      }
      const startDate =
        kind === 'span' ? parseDateKey(startDateKey) ?? date ?? new Date() : (date as Date);
      const task: Task = { id: `${dateKeyOf(startDate)}-t${Date.now()}`, ...fields };
      onSubmit(task, startDate);
      return;
    }
    if (editTask) {
      // 编辑模式:覆盖保存原任务;跨多天任务开始日期变化时迁移到新分组
      updateTask(editTask.id, fields, kind === 'span' ? startDateKey : undefined);
    } else {
      if (!date && kind === 'short') {
        setError('缺少任务日期');
        return;
      }
      const startDate =
        kind === 'span' ? parseDateKey(startDateKey) ?? date ?? new Date() : (date as Date);
      // 任务 id 用开始日期键生成,跨多天任务也落在开始日期分组
      const task: Task = { id: `${dateKeyOf(startDate)}-t${Date.now()}`, ...fields };
      addTask(startDate, task);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* 遮罩是卡片的兄弟层:在输入框里拖选文字、拖出卡片外松手也不会误触关闭 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{editTask ? '任务设置' : '新增任务'}</Text>
          {progressText ? <Text style={styles.progress}>{progressText}</Text> : null}

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* 编辑模式已确定任务类型,不再提供短时/长时切换,只保留当前类型的设置 */}
          {!editTask && !lockKind ? (
            <View style={styles.segment}>
              <Pressable
                onPress={() => selectKind('short')}
                style={[styles.segmentItem, kind === 'short' && styles.segmentItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === 'short' }}
              >
                <Text style={[styles.segmentText, kind === 'short' && styles.segmentTextActive]}>
                  短时任务
                </Text>
              </Pressable>
              <Pressable
                onPress={() => selectKind('span')}
                style={[styles.segmentItem, kind === 'span' && styles.segmentItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === 'span' }}
              >
                <Text style={[styles.segmentText, kind === 'span' && styles.segmentTextActive]}>
                  长时任务
                </Text>
              </Pressable>
            </View>
          ) : null}

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

          <Text style={styles.label}>备注</Text>
          <View
            style={[
              styles.noteField,
              noteFocused && Platform.OS === 'web' && styles.noteFieldFocused,
            ]}
          >
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              style={styles.noteInput}
              placeholder="添加备注(可选)"
              placeholderTextColor="#9CA3AF"
              maxLength={NOTE_MAX_LENGTH}
            />
            <View style={styles.noteDivider} />
            <Pressable
              onPress={() => setNoteOpen(true)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="编辑备注"
              style={({ pressed }) => [styles.noteIconButton, pressed && styles.noteIconPressed]}
            >
              <MaterialCommunityIcons name="file-outline" size={18} color={ACCENT} />
            </Pressable>
          </View>

          {kind === 'span' ? (
            <>
              <Text style={styles.label}>日期</Text>
              <Pressable style={styles.timeButton} onPress={() => setDateOpen(true)}>
                <Text style={styles.timeButtonText}>
                  {dateLabel(startDateKey)} ~ {dateLabel(endDateKey)}
                </Text>
                <Text style={styles.timeButtonHint}>点击设置</Text>
              </Pressable>
            </>
          ) : null}

          <Text style={styles.label}>时间</Text>
          <Pressable style={styles.timeButton} onPress={() => setTimeOpen(true)}>
            <Text style={styles.timeButtonText}>
              {startTime || endTime
                ? `${startTime || '—'} ~ ${endTime || '—'}`
                : '未设置时间'}
            </Text>
            <Text style={styles.timeButtonHint}>点击设置</Text>
          </Pressable>

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
              style={[styles.reminderButton, smsRemind == null && styles.reminderButtonDisabled]}
              disabled={smsRemind == null}
              onPress={() => setSmsReminderOpen(true)}
            >
              <Text style={styles.reminderButtonText}>
                {smsRemind != null ? reminderLabel(smsRemind) : '未开启'}
              </Text>
              <Text style={styles.reminderButtonHint}>设置时间</Text>
            </Pressable>
          </View>
          <Text style={styles.reminderHint}>到时单独弹出一条「短信提醒」消息,时间可与闹钟不同</Text>
          {NOTIFICATIONS_SUPPORTED && (
            <Text style={styles.reminderHint}>提醒由系统闹钟触发,划掉(清理)应用会取消提醒</Text>
          )}
          {!NOTIFICATIONS_SUPPORTED && (
            <Text style={styles.reminderHint}>提醒仅在手机上生效,浏览器预览不支持</Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={confirm}>
              <Text style={styles.confirmText}>{submitLabel ?? (editTask ? '保存' : '添加')}</Text>
            </Pressable>
          </View>

          {onSkip ? (
            <Pressable style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>跳过此条</Text>
            </Pressable>
          ) : null}

          {/* 删除入口:仅编辑模式,两步确认避免误删 */}
          {editTask ? (
            confirmDelete ? (
              <View style={styles.deleteConfirm}>
                <Text style={styles.deleteConfirmText}>
                  确定删除「{editTask.title}」？不可恢复
                </Text>
                <View style={styles.deleteConfirmActions}>
                  <Pressable
                    style={styles.deleteCancelButton}
                    onPress={() => setConfirmDelete(false)}
                  >
                    <Text style={styles.deleteCancelText}>取消</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteDangerButton}
                    onPress={() => {
                      deleteTask(editTask.id);
                      onClose();
                    }}
                  >
                    <Text style={styles.deleteDangerText}>删除</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.deleteButton} onPress={() => setConfirmDelete(true)}>
                <Text style={styles.deleteText}>删除任务</Text>
              </Pressable>
            )
          ) : null}
          </ScrollView>
        </View>
      </View>

      <NoteEditorModal
        visible={noteOpen}
        value={note}
        onClose={() => setNoteOpen(false)}
        onSave={setNote}
      />

      <DateRangeModal
        visible={dateOpen}
        subtitle={title}
        initialStartKey={startDateKey}
        initialEndKey={endDateKey}
        onCancel={() => setDateOpen(false)}
        onConfirm={(start, end) => {
          setStartDateKey(start);
          setEndDateKey(end);
          setDateOpen(false);
        }}
      />

      <TimeRangeModal
        visible={timeOpen}
        subtitle={title}
        initialStart={startTime}
        initialEnd={endTime}
        onCancel={() => setTimeOpen(false)}
        onConfirm={(start, end) => {
          setStartTime(start);
          setEndTime(end);
          setTimeOpen(false);
        }}
      />

      <ReminderTimeModal
        visible={reminderOpen}
        value={remind}
        onClose={() => setReminderOpen(false)}
        onSelect={setRemind}
        onDeleted={(minutes) => {
          if (remind === minutes) setRemind(10);
        }}
        sound={remindSound}
        onSelectSound={setRemindSound}
      />

      <ReminderTimeModal
        visible={smsReminderOpen}
        value={smsRemind}
        onClose={() => setSmsReminderOpen(false)}
        onSelect={setSmsRemind}
        onDeleted={(minutes) => {
          if (smsRemind === minutes) setSmsRemind(10);
        }}
        sound={smsRemindSound}
        onSelectSound={setSmsRemindSound}
      />
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
    width: 320,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  body: {
    flexGrow: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  progress: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
  },
  skipButton: {
    marginTop: 8,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 8,
  },
  noteField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingLeft: 12,
  },
  noteInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: 15,
    color: '#1F2937',
    // 去掉浏览器给内层输入框画的方形焦点框,焦点框统一由外层备注框显示
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  noteFieldFocused: {
    outlineWidth: 2,
    outlineColor: '#101010',
    outlineStyle: 'solid',
  },
  noteDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  noteIconButton: {
    height: '100%',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIconPressed: {
    opacity: 0.5,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    gap: 3,
    marginTop: 2,
  },
  segmentItem: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(17, 24, 39, 0.08)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  timeButtonHint: {
    fontSize: 11,
    color: '#9CA3AF',
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
  reminderHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  deleteButton: {
    marginTop: 10,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
  },
  deleteConfirm: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  deleteConfirmText: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteCancelButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  deleteDangerButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDangerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
