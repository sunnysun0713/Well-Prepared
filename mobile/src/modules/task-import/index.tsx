import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ACCENT = '#4F46E5';

/** 已选图片的展示信息(原始 uri 供预览,提取阶段再压缩转 base64) */
interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** 任务载入模块主界面:选图/拍照 + 预览 + AI 提取入口 */
export function TaskImportScreen() {
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');

  /** 从相册选图:图库在安卓/Web 无需权限,iOS 由系统弹窗处理 */
  const pickFromLibrary = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  /** 拍照:相机必须用户授权,拒绝时提示且不覆盖已选图片 */
  const takePhoto = async () => {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('相机权限被拒绝,无法拍照;可以改用「从相册选择」');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>任务载入</Text>
        <Text style={styles.subtitle}>拍一张照片,自动变成当天计划</Text>
      </View>

      {image ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
        </View>
      ) : (
        <Pressable style={styles.dropZone} onPress={pickFromLibrary}>
          <Text style={styles.dropIcon}>🖼️</Text>
          <Text style={styles.dropTitle}>选择图片或拍照</Text>
          <Text style={styles.dropDesc}>课程表、通知截图、手写日程……{'\n'}AI 帮你提取成一条条任务</Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={pickFromLibrary}>
          <Text style={styles.secondaryText}>{image ? '重新选择' : '从相册选择'}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={takePhoto}>
          <Text style={styles.secondaryText}>拍照</Text>
        </Pressable>
      </View>

      {/* 提取按钮:AI 提取层(下一 commit)接入后激活 */}
      <Pressable
        style={[styles.button, styles.primaryButton, !image && styles.buttonDisabled]}
        disabled={!image}
      >
        <Text style={styles.primaryText}>✨ AI 提取任务</Text>
      </Pressable>
      {!image && <Text style={styles.hint}>选好图片后即可开始提取(功能接入中)</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropZone: {
    flex: 1,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  dropIcon: {
    fontSize: 44,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dropDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  previewWrap: {
    flex: 1,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  preview: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: ACCENT,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },
});
