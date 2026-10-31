import AV from 'leancloud-storage';
import type { Task } from '@/data/tasks';

/**
 * 云端任务:每个用户只能读写自己的任务(ACL 限制)。
 * 删除采用软删除(deleted=true),保证多设备之间能同步删除。
 */

const CLASS_NAME = 'Task';

export interface CloudTaskRecord {
  remoteId: string;
  localId: string;
  dateKey: string;
  title: string;
  startTime: string;
  endTime: string;
  note?: string;
  done?: boolean;
  remindAdvanceMinutes?: number;
  deleted?: boolean;
}

function currentUserOrThrow(): AV.User {
  const user = AV.User.current() as AV.User | null;
  if (!user) throw new Error('未登录');
  return user;
}

function toRecord(obj: AV.Object): CloudTaskRecord {
  const readString = (key: string): string => {
    const value = obj.get(key);
    return typeof value === 'string' ? value : '';
  };
  const readNumber = (key: string): number | undefined => {
    const value = obj.get(key);
    return typeof value === 'number' ? value : undefined;
  };
  return {
    remoteId: obj.id ?? '',
    localId: readString('localId'),
    dateKey: readString('dateKey'),
    title: readString('title'),
    startTime: readString('startTime'),
    endTime: readString('endTime'),
    note: readString('note') || undefined,
    done: Boolean(obj.get('done')),
    remindAdvanceMinutes: readNumber('remindAdvanceMinutes'),
    deleted: Boolean(obj.get('deleted')),
  };
}

/** 拉取当前用户的全部任务(含软删除记录,便于本地同步删除) */
export async function fetchMyTasks(): Promise<CloudTaskRecord[]> {
  const user = currentUserOrThrow();
  if (!user.id) throw new Error('登录状态异常,请重新登录');
  const query = new AV.Query(CLASS_NAME);
  query.equalTo('owner', AV.Object.createWithoutData('_User', user.id));
  query.limit(1000);
  const results = await query.find();
  return (results as AV.Object[]).map(toRecord);
}

/** 新建云端任务,返回 remoteId */
export async function createCloudTask(dateKey: string, task: Task): Promise<string> {
  const user = currentUserOrThrow();
  const obj = new AV.Object(CLASS_NAME);
  obj.set('owner', user);
  obj.set('localId', task.id);
  obj.set('dateKey', dateKey);
  obj.set('title', task.title);
  obj.set('startTime', task.startTime);
  obj.set('endTime', task.endTime);
  if (task.note) obj.set('note', task.note);
  obj.set('done', Boolean(task.done));
  if (task.remindAdvanceMinutes != null) {
    obj.set('remindAdvanceMinutes', task.remindAdvanceMinutes);
  }
  obj.set('deleted', false);

  const acl = new AV.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  acl.setReadAccess(user, true);
  acl.setWriteAccess(user, true);
  obj.setACL(acl);

  await obj.save();
  return obj.id ?? '';
}

/** 更新云端任务字段 */
export async function updateCloudTask(
  remoteId: string,
  patch: Partial<Omit<Task, 'id' | 'remoteId'>>,
): Promise<void> {
  const obj = AV.Object.createWithoutData(CLASS_NAME, remoteId);
  if ('title' in patch) obj.set('title', patch.title ?? '');
  if ('startTime' in patch) obj.set('startTime', patch.startTime ?? '');
  if ('endTime' in patch) obj.set('endTime', patch.endTime ?? '');
  if ('note' in patch) obj.set('note', patch.note ?? null);
  if ('done' in patch) obj.set('done', Boolean(patch.done));
  if ('remindAdvanceMinutes' in patch) {
    obj.set('remindAdvanceMinutes', patch.remindAdvanceMinutes ?? null);
  }
  await obj.save();
}

/** 软删除云端任务 */
export async function deleteCloudTask(remoteId: string): Promise<void> {
  const obj = AV.Object.createWithoutData(CLASS_NAME, remoteId);
  obj.set('deleted', true);
  await obj.save();
}
