import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AccountModal } from '@/account/account-modal';
import { useAccount } from '@/account/account-context';
import { ModuleBar } from '@/components/ModuleBar';
import { MODULES, getModule } from '@/modules/registry';

/** 主界面:顶部模块选择栏 + 当前激活模块的内容区 */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAccount();
  const [activeId, setActiveId] = useState(MODULES[0]?.id ?? '');
  const [accountOpen, setAccountOpen] = useState(false);
  const active = getModule(activeId) ?? MODULES[0];
  const ActiveComponent = active?.component;
  const accountText = user ? (user.nickname || user.username).slice(0, 1).toUpperCase() : '👤';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ModuleBar
        activeId={active?.id ?? ''}
        onSelect={setActiveId}
        onManage={() => router.push('/module-manager')}
        onAccount={() => setAccountOpen(true)}
        accountText={accountText}
      />
      {ActiveComponent ? <ActiveComponent /> : null}
      <AccountModal visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
