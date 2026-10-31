import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AiSettingsProvider } from '@/ai/settings';
import { TasksProvider } from '@/data/tasks-context';

export default function RootLayout() {
  return (
    <TasksProvider>
      <AiSettingsProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="module-manager" options={{ title: '管理模块' }} />
        </Stack>
      </AiSettingsProvider>
    </TasksProvider>
  );
}
