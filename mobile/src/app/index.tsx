import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ModuleBar } from '@/components/ModuleBar';
import { MODULES, getModule } from '@/modules/registry';
import { colors } from '@/theme';

/** 主界面:顶部模块选择栏 + 当前激活模块的内容区 */
export default function HomeScreen() {
  const router = useRouter();
  const [activeId, setActiveId] = useState(MODULES[0]?.id ?? '');
  const active = getModule(activeId) ?? MODULES[0];
  const ActiveComponent = active?.component;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ModuleBar
        activeId={active?.id ?? ''}
        onSelect={setActiveId}
        onManage={() => router.push('/module-manager')}
      />
      {ActiveComponent ? <ActiveComponent /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
