import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';

export function CameraCaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestCameraPermission] = useCameraPermissions();
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requestingGallery, setRequestingGallery] = useState(false);

  useEffect(() => {
    if (permission === null) void requestCameraPermission();
  }, [permission, requestCameraPermission]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const openPreview = (uri: string) => {
    router.push({ pathname: '/camera-preview', params: { uri } });
  };

  const chooseFromGallery = async () => {
    setMessage(null);
    setRequestingGallery(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setMessage('需要图库权限才能选择图片');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]?.uri) openPreview(result.assets[0].uri);
    } catch {
      setMessage('打开图库失败，请重试');
    } finally {
      setRequestingGallery(false);
    }
  };

  const takePhoto = async () => {
    setMessage(null);
    try {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo?.uri) openPreview(photo.uri);
      else setMessage('拍摄失败，请重试');
    } catch {
      setMessage('拍摄失败，请重试');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="关闭拍摄" onPress={close} style={styles.headerButton}>
          <CommunityText style={styles.headerIcon}>×</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.title}>拍摄</CommunityText>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.viewfinder}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.permissionState}>
            {permission === null ? <ActivityIndicator color={colors.primary} /> : null}
            <CommunityText style={styles.permissionText}>
              {permission === null ? '正在请求相机权限…' : '需要相机权限才能拍摄'}
            </CommunityText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重新授权相机"
              onPress={() => void requestCameraPermission()}
              style={styles.permissionButton}
            >
              <CommunityText bold>重新授权</CommunityText>
            </Pressable>
            <CommunityText style={styles.permissionHint}>也可以使用下方图册选择照片</CommunityText>
          </View>
        )}
        {message ? <CommunityText accessibilityRole="alert" style={styles.message}>{message}</CommunityText> : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="图册"
          disabled={requestingGallery}
          onPress={() => void chooseFromGallery()}
          style={styles.sideButton}
        >
          <CommunityText style={styles.sideIcon}>▧</CommunityText>
          <CommunityText style={styles.controlLabel}>图册</CommunityText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="拍照"
          disabled={!permission?.granted}
          onPress={() => void takePhoto()}
          style={[styles.shutter, !permission?.granted && styles.shutterDisabled]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="拍摄说明"
          onPress={() => setShowHelp(true)}
          style={styles.sideButton}
        >
          <CommunityText style={styles.sideIcon}>?</CommunityText>
          <CommunityText style={styles.controlLabel}>说明</CommunityText>
        </Pressable>
      </View>

      <Modal transparent visible={showHelp} animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.helpPanel}>
            <CommunityText bold style={styles.helpTitle}>拍摄说明</CommunityText>
            <CommunityText style={styles.helpText}>将植物放在画面中央，保持光线充足并尽量对焦清晰。也可以从图册选择一张照片。</CommunityText>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭说明" onPress={() => setShowHelp(false)} style={styles.helpClose}>
              <CommunityText bold>知道了</CommunityText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101211' },
  header: { minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 48, height: 44, justifyContent: 'center' },
  headerIcon: { color: colors.white, fontSize: 34, lineHeight: 38 },
  title: { color: colors.white, fontSize: 17 },
  viewfinder: { flex: 1, marginHorizontal: 12, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#202522' },
  permissionState: { alignItems: 'center', padding: 24 },
  permissionText: { color: colors.white, fontSize: 16, marginTop: 12, textAlign: 'center' },
  permissionButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, marginTop: 18, borderRadius: 4, backgroundColor: colors.primary },
  permissionHint: { color: '#c5cbc7', fontSize: 13, marginTop: 12 },
  message: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: 10, color: colors.white, textAlign: 'center', backgroundColor: colors.overlay },
  controls: { height: 124, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideButton: { width: 64, minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  sideIcon: { color: colors.white, fontSize: 27, lineHeight: 32 },
  controlLabel: { color: colors.white, fontSize: 13, marginTop: 4 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.overlay },
  helpPanel: { padding: 22, borderRadius: 6, backgroundColor: colors.white },
  helpTitle: { color: colors.text, fontSize: 18 },
  helpText: { color: colors.secondaryText, fontSize: 15, lineHeight: 23, marginTop: 12 },
  helpClose: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
});
