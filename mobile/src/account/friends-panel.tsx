import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { FriendInfo, FriendRequestInfo } from '@/cloud/friends';
import {
  acceptFriendRequest,
  fetchFriends,
  fetchIncomingFriendRequests,
  findUserByFriendCode,
  rejectFriendRequest,
  sendFriendRequest,
} from '@/cloud/friends';
import {
  acceptTaskRequest,
  fetchIncomingTaskRequests,
  rejectTaskRequest,
  type TaskRequestInfo,
} from '@/cloud/requests';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { useAccount } from './account-context';
import { FriendTaskModal } from './friend-task-modal';

const ACCENT = '#4F46E5';

/** 好友面板:好友列表、添加好友、待处理的好友申请与任务请求 */
export function FriendsPanel() {
  const { user, refreshPending } = useAccount();
  const { addTask } = useTasks();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestInfo[]>([]);
  const [taskRequests, setTaskRequests] = useState<TaskRequestInfo[]>([]);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [taskFriend, setTaskFriend] = useState<FriendInfo | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // 登录后加载好友与待处理请求
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [f, fr, tr] = await Promise.all([
          fetchFriends(),
          fetchIncomingFriendRequests(),
          fetchIncomingTaskRequests(),
        ]);
        if (!cancelled) {
          setFriends(f);
          setFriendRequests(fr);
          setTaskRequests(tr);
        }
      } catch {
        // 网络异常时保持现状
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const reload = () => {
    setReloadKey((key) => key + 1);
    void refreshPending();
  };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '操作失败,请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  const addFriend = () => {
    const value = code.trim();
    if (!value) {
      setMessage('请输入好友码');
      return;
    }
    void run(async () => {
      const target = await findUserByFriendCode(value);
      if (!target) {
        setMessage('未找到该好友码对应的用户');
        return;
      }
      await sendFriendRequest(target);
      setCode('');
      setMessage('好友申请已发送,等待对方同意');
      reload();
    });
  };

  const pendingTotal = friendRequests.length + taskRequests.length;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'friends' && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            好友({friends.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            请求({pendingTotal})
          </Text>
        </Pressable>
      </View>

      {tab === 'friends' ? (
        <>
          <View style={styles.addRow}>
            <TextInput
              value={code}
              onChangeText={setCode}
              style={styles.codeInput}
              placeholder="输入好友码添加"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              maxLength={8}
            />
            <Pressable
              style={[styles.addButton, busy && styles.disabled]}
              disabled={busy}
              onPress={addFriend}
            >
              <Text style={styles.addButtonText}>添加</Text>
            </Pressable>
          </View>

          {friends.length === 0 ? (
            <Text style={styles.empty}>还没有好友,把上方好友码发给朋友吧</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(friend.nickname || friend.username).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.friendMeta}>
                  <Text style={styles.friendName}>{friend.nickname}</Text>
                  <Text style={styles.friendUsername}>@{friend.username}</Text>
                </View>
                <Pressable
                  style={styles.chip}
                  onPress={() => {
                    setTaskFriend(friend);
                    setTaskModalOpen(true);
                  }}
                >
                  <Text style={styles.chipText}>给他加任务</Text>
                </Pressable>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>好友申请</Text>
          {friendRequests.length === 0 ? (
            <Text style={styles.empty}>暂无好友申请</Text>
          ) : (
            friendRequests.map((request) => (
              <View key={request.id} style={styles.requestRow}>
                <View style={styles.requestMeta}>
                  <Text style={styles.requestTitle}>
                    {request.from.nickname} 想加你为好友
                  </Text>
                  <Text style={styles.requestSub}>@{request.from.username}</Text>
                </View>
                <Pressable
                  style={[styles.chip, styles.acceptChip, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await acceptFriendRequest(request.id);
                      setMessage('已添加好友');
                      reload();
                    })
                  }
                >
                  <Text style={styles.acceptText}>同意</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await rejectFriendRequest(request.id);
                      setMessage('已拒绝');
                      reload();
                    })
                  }
                >
                  <Text style={styles.chipText}>拒绝</Text>
                </Pressable>
              </View>
            ))
          )}

          <Text style={styles.sectionLabel}>好友加的任务</Text>
          {taskRequests.length === 0 ? (
            <Text style={styles.empty}>暂无任务请求</Text>
          ) : (
            taskRequests.map((request) => (
              <View key={request.id} style={styles.taskRequest}>
                <Text style={styles.requestTitle}>
                  {request.from.nickname} 给你加了「{request.title}」
                </Text>
                <Text style={styles.requestSub}>
                  {request.dateKey} {request.startTime}-{request.endTime}
                  {request.note ? ` · ${request.note}` : ''}
                </Text>
                <View style={styles.requestActions}>
                  <Pressable
                    style={[styles.chip, styles.acceptChip, busy && styles.disabled]}
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const [y, m, d] = request.dateKey.split('-').map(Number);
                        if ([y, m, d].some((n) => Number.isNaN(n))) {
                          setMessage('任务日期无效');
                          return;
                        }
                        const task: Task = {
                          id: `${request.dateKey}-f${Date.now()}`,
                          title: request.title,
                          startTime: request.startTime,
                          endTime: request.endTime,
                          note: request.note,
                        };
                        addTask(new Date(y, m - 1, d), task);
                        await acceptTaskRequest(request.id);
                        setMessage('已加入日历');
                        reload();
                      })
                    }
                  >
                    <Text style={styles.acceptText}>同意</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, busy && styles.disabled]}
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        await rejectTaskRequest(request.id);
                        setMessage('已拒绝');
                        reload();
                      })
                    }
                  >
                    <Text style={styles.chipText}>拒绝</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <FriendTaskModal
        visible={taskModalOpen}
        friend={taskFriend}
        onClose={() => setTaskModalOpen(false)}
        onSent={(text) => setMessage(text)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginTop: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  addButton: {
    width: 64,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  empty: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  friendMeta: {
    flex: 1,
    gap: 1,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  friendUsername: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  chip: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  acceptChip: {
    backgroundColor: ACCENT,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 2,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  requestMeta: {
    flex: 1,
    gap: 1,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  requestSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  taskRequest: {
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    gap: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  message: {
    fontSize: 11,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
  },
});
