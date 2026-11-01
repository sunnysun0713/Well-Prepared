import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AiSettingsProvider } from '@/ai/settings';
import { BusynessProvider } from '@/data/busyness';
import { CategoriesProvider } from '@/data/categories-context';
import { ReminderOptionsProvider } from '@/data/reminder-options';
import { TasksProvider } from '@/data/tasks-context';
import { ensureNotificationChannel } from '@/notifications';

export default function RootLayout() {
  // 创建安卓通知渠道(Android 13+ 权限弹窗的前提)
  useEffect(() => {
    void ensureNotificationChannel();
  }, []);

  return (
    <CategoriesProvider>
      <BusynessProvider>
        <ReminderOptionsProvider>
          <TasksProvider>
            <AiSettingsProvider>
              <StatusBar style="dark" />
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="module-manager" options={{ title: '管理模块' }} />
              </Stack>
            </AiSettingsProvider>
          </TasksProvider>
        </ReminderOptionsProvider>
      </BusynessProvider>
    </CategoriesProvider>
  );
}
