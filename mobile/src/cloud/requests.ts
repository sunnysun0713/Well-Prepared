import AV from 'leancloud-storage';
import type { FriendInfo } from './friends';

/**
 * 好友投递任务:好友不能直接写我的任务,只能创建 TaskRequest;
 * 我同意后才在自己的任务里生成一条任务。
 */

const REQUEST_CLASS = 'TaskRequest';

export interface TaskRequestPayload {
  dateKey: string;
  title: string;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface TaskRequestInfo extends TaskRequestPayload {
  id: string;
  from: FriendInfo;
}

function currentUserOrThrow(): AV.User {
  const user = AV.User.current() as AV.User | null;
  if (!user) throw new Error('未登录');
  return user;
}

function infoOf(user: AV.User): FriendInfo {
  return {
    id: user.id ?? '',
    username: user.getUsername() ?? '',
    nickname: String(user.get('nickname') ?? '') || user.getUsername() || '',
  };
}

/** 给好友投递一条任务请求 */
export async function sendTaskRequest(
  targetId: string,
  payload: TaskRequestPayload,
): Promise<void> {
  const me = currentUserOrThrow();
  if (!targetId) throw new Error('请选择好友');

  const obj = new AV.Object(REQUEST_CLASS);
  obj.set('from', me);
  obj.set('to', AV.Object.createWithoutData('_User', targetId));
  obj.set('dateKey', payload.dateKey);
  obj.set('title', payload.title);
  obj.set('startTime', payload.startTime);
  obj.set('endTime', payload.endTime);
  if (payload.note) obj.set('note', payload.note);
  obj.set('status', 'pending');

  const acl = new AV.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  acl.setReadAccess(me, true);
  acl.setWriteAccess(me, true);
  acl.setReadAccess(targetId, true);
  acl.setWriteAccess(targetId, true);
  obj.setACL(acl);

  await obj.save();
}

/** 我收到的待处理任务请求 */
export async function fetchIncomingTaskRequests(): Promise<TaskRequestInfo[]> {
  const me = currentUserOrThrow();
  const query = new AV.Query(REQUEST_CLASS);
  query.equalTo('to', me);
  query.equalTo('status', 'pending');
  query.include('from');
  query.limit(100);
  const results = await query.find();
  const items: TaskRequestInfo[] = [];
  for (const obj of results) {
    const from = obj.get('from') as AV.User | undefined;
    if (!from) continue;
    const readString = (key: string): string => {
      const value = obj.get(key);
      return typeof value === 'string' ? value : '';
    };
    items.push({
      id: obj.id ?? '',
      from: infoOf(from),
      dateKey: readString('dateKey'),
      title: readString('title'),
      startTime: readString('startTime'),
      endTime: readString('endTime'),
      note: readString('note') || undefined,
    });
  }
  return items;
}

/** 同意任务请求 */
export async function acceptTaskRequest(requestId: string): Promise<void> {
  const obj = AV.Object.createWithoutData(REQUEST_CLASS, requestId);
  obj.set('status', 'accepted');
  await obj.save();
}

/** 拒绝任务请求 */
export async function rejectTaskRequest(requestId: string): Promise<void> {
  const obj = AV.Object.createWithoutData(REQUEST_CLASS, requestId);
  obj.set('status', 'rejected');
  await obj.save();
}
