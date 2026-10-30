import { StyleSheet, Text, View } from 'react-native';

interface Props {
  icon: string;
  title: string;
  description: string;
}

/** 模块占位界面:在模块具体功能实现前展示模块名称与规划 */
export function ModulePlaceholder({ icon, title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
