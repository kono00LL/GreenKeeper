import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';

const DEFAULT_AVATAR = require('@/assets/images/icon.png');

export default function ProfilePage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const authenticated = status === 'authenticated' && Boolean(user);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = authenticated ? user?.avatar_url : null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.heading}>我的账户</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(authenticated ? '/profile-info' : '/auth')}
          style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}>
          <Image
            key={user?.avatar_url || 'default-avatar'}
            contentFit="cover"
            onError={() => setFailedAvatarUrl(avatarUrl ?? null)}
            source={avatarUrl && failedAvatarUrl !== avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR}
            style={styles.avatar}
          />
          <View style={styles.profileText}>
            <Text style={styles.name}>{authenticated ? user?.user_name : '未登录'}</Text>
            <Text style={styles.caption}>{authenticated ? user?.user_email : '登录后保存你的植物记录'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        {!authenticated && <Text style={styles.hint}>点击头像或账户信息，使用邮箱注册或登录</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f7faf8', flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 28 },
  heading: { color: '#1f2a26', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  profileRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e1ebe5', borderRadius: 14, borderWidth: 1, flexDirection: 'row', minHeight: 92, paddingHorizontal: 16 },
  pressed: { opacity: 0.82 },
  avatar: { backgroundColor: '#e6eee9', borderRadius: 30, height: 60, width: 60 },
  profileText: { flex: 1, marginLeft: 14 },
  name: { color: '#25322c', fontSize: 19, fontWeight: '700' },
  caption: { color: '#7b8982', fontSize: 13, marginTop: 6 },
  chevron: { color: '#8b9992', fontSize: 30, fontWeight: '300', lineHeight: 32 },
  hint: { color: '#7b8982', fontSize: 14, lineHeight: 21, marginTop: 18 },
});
