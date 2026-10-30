import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { imageUploadErrorMessage, uploadImage, type UploadedImage } from '@/services/image-upload';
import { useEffect, useRef, useState } from 'react';
import { identifyPlant, identificationErrorMessage } from '@/services/plant-identification-api';
import { useAuthStore } from '@/store/auth-store';
import type { PlantIdentification } from '@/types/plant-identification';
import { IdentificationResults } from './identification-results';

export function CameraPreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string | string[] }>();
  const imageUri = Array.isArray(uri) ? uri[0] : uri;
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return <ImagePreview key={`${imageUri}-${sessionVersion}`} imageUri={imageUri} />;
}

function ImagePreview({ imageUri }: { imageUri?: string }) {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<PlantIdentification | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const request = useRef<AbortController | null>(null);
  const busy = uploading || identifying;

  useEffect(() => () => {
    request.current?.abort();
  }, []);

  const submitIdentification = async () => {
    if (!imageUri || request.current) return;
    const controller = new AbortController();
    const version = useAuthStore.getState().sessionVersion;
    request.current = controller;
    setIdentifying(true);
    setIdentification(null);
    setMessage(null);
    const isCurrent = () => !controller.signal.aborted && version === useAuthStore.getState().sessionVersion;
    try {
      const result = await identifyPlant(imageUri, controller.signal);
      if (isCurrent()) setIdentification(result);
    } catch (error) {
      if (isCurrent()) setMessage(identificationErrorMessage(error));
    } finally {
      request.current = null;
      if (isCurrent()) setIdentifying(false);
    }
  };

  const submitUpload = async () => {
    if (!imageUri || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setUploading(true);
    setMessage(null);
    try {
      const result = await uploadImage(imageUri, controller.signal);
      if (!controller.signal.aborted) {
        setUploadedImage(result);
        setImageFailed(false);
        setMessage('上传成功');
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(imageUploadErrorMessage(error));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回拍摄" onPress={() => router.back()} style={styles.headerAction}>
          <CommunityText style={styles.actionText}>‹ 返回</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.title}>图片预览</CommunityText>
        <View style={styles.headerAction} />
      </View>
      <View style={styles.content}>
        {imageUri ? (
          <Image
            key={`${uploadedImage?.key ?? imageUri}-${imageAttempt}`}
            accessibilityLabel={uploadedImage ? '已上传的图片' : '已选择的图片'}
            contentFit="contain"
            source={{ uri: uploadedImage?.url ?? imageUri }}
            style={styles.image}
            onError={() => {
              setImageFailed(true);
              setMessage(uploadedImage ? '图片已上传，服务器图片加载失败' : '本地图片加载失败，请重新选择');
            }}
          />
        ) : (
          <CommunityText style={styles.empty}>没有可预览的图片</CommunityText>
        )}
        <CommunityText style={styles.caption}>{uploadedImage ? '服务器图片预览' : '本地图片预览'}</CommunityText>
        {message ? <CommunityText accessibilityRole="alert" style={styles.message}>{message}</CommunityText> : null}
        {identifying ? <CommunityText accessibilityRole="alert" style={styles.message}>正在识别植物…</CommunityText> : null}
        {identification ? <IdentificationResults result={identification} /> : null}
        {imageFailed && uploadedImage ? (
          <Pressable accessibilityRole="button" accessibilityLabel="重新加载图片" style={styles.secondaryAction} onPress={() => {
            setImageFailed(false);
            setMessage('上传成功');
            setImageAttempt((attempt) => attempt + 1);
          }}><CommunityText style={styles.secondaryText}>重新加载图片</CommunityText></Pressable>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel="识别植物" disabled={!imageUri || busy} onPress={() => void submitIdentification()} style={[styles.reselect, (!imageUri || busy) && styles.disabled]}>
          {identifying ? <ActivityIndicator color={colors.text} /> : <CommunityText bold style={styles.reselectText}>识别植物</CommunityText>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="重新选择" onPress={() => router.replace('/(tabs)/camera')} style={styles.secondaryAction}>
          <CommunityText style={styles.secondaryText}>重新选择</CommunityText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="上传图片" disabled={!imageUri || busy} onPress={() => void submitUpload()} style={[styles.secondaryAction, (!imageUri || busy) && styles.disabled]}>
          {uploading ? <ActivityIndicator color={colors.text} /> : <CommunityText bold style={styles.reselectText}>{uploadedImage ? '再次上传' : '上传图片'}</CommunityText>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: colors.divider },
  headerAction: { width: 76, minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.selectedText, fontSize: 16 },
  title: { color: colors.text, fontSize: 17 },
  content: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', flex: 1 },
  empty: { color: colors.muted },
  caption: { color: colors.secondaryText, fontSize: 14, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.divider },
  secondaryAction: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.selectedText, fontSize: 14 },
  reselect: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: colors.primary },
  disabled: { opacity: 0.55 },
  reselectText: { color: colors.text, fontSize: 16 },
  message: { color: colors.secondaryText, fontSize: 14, marginTop: 8 },
});
