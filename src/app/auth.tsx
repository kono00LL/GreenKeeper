import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { communityReturnTarget } from '@/navigation/community-return';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, register } from '@/services/auth-api';
import { useAuthStore } from '@/store/auth-store';

type Mode = 'login' | 'register';

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.error?.message || '请求失败，请稍后重试';
  return '请求失败，请稍后重试';
}

export default function AuthPage() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnTarget = communityReturnTarget(returnTo);
  const leave = () => {
    if (returnTarget) router.dismissTo(returnTarget);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode); setError(null); setPassword(''); setConfirmPassword('');
  };

  const validate = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return '请输入有效的邮箱地址';
    if (password.length < 8) return '密码至少需要 8 个字符';
    if (mode === 'register' && password !== confirmPassword) return '两次输入的密码不一致';
    return null;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSubmitting(true); setError(null);
    try {
      const response = mode === 'login'
        ? await login(email.trim().toLowerCase(), password)
        : await register(email.trim().toLowerCase(), password, userName.trim() || undefined);
      setSession(response.user, response.access_token, response.refresh_token);
      if (returnTarget) router.dismissTo(returnTarget);
      else router.replace('/(tabs)');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>GreenKeeper</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={leave}><Text style={styles.skip}>跳过</Text></Pressable>
          </View>
          <View style={styles.intro}>
            <Text style={styles.title}>{mode === 'login' ? '欢迎回来' : '创建账户'}</Text>
            <Text style={styles.subtitle}>{mode === 'login' ? '登录后保存你的植物记录' : '用邮箱开始管理你的绿色生活'}</Text>
          </View>
          <View style={styles.switcher}>
            <Pressable style={[styles.switchItem, mode === 'login' && styles.switchItemActive]} onPress={() => switchMode('login')}><Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>登录</Text></Pressable>
            <Pressable style={[styles.switchItem, mode === 'register' && styles.switchItemActive]} onPress={() => switchMode('register')}><Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>注册</Text></Pressable>
          </View>
          <View style={styles.form}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#9aa3a0" style={styles.input} value={email} />
            {mode === 'register' && <><Text style={styles.label}>昵称（可选）</Text><TextInput maxLength={50} onChangeText={setUserName} placeholder="默认名称为匿名用户" placeholderTextColor="#9aa3a0" style={styles.input} value={userName} /></>}
            <Text style={styles.label}>密码</Text>
            <TextInput autoCapitalize="none" autoComplete={mode === 'login' ? 'password' : 'new-password'} onChangeText={setPassword} placeholder="至少 8 个字符" placeholderTextColor="#9aa3a0" secureTextEntry style={styles.input} value={password} />
            {mode === 'register' && <><Text style={styles.label}>确认密码</Text><TextInput autoCapitalize="none" onChangeText={setConfirmPassword} placeholder="再次输入密码" placeholderTextColor="#9aa3a0" secureTextEntry style={styles.input} value={confirmPassword} /></>}
          </View>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={mode === 'login' ? '登录' : '注册'} disabled={submitting} onPress={handleSubmit} style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, submitting && styles.submitDisabled]}>
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>{mode === 'login' ? '登录' : '注册'}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f7faf8', flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }, brand: { color: '#27322e', fontSize: 18, fontWeight: '700' }, skip: { color: '#5c6c65', fontSize: 15 },
  intro: { marginTop: 58 }, title: { color: '#1f2a26', fontSize: 32, fontWeight: '700' }, subtitle: { color: '#718079', fontSize: 15, marginTop: 10 },
  switcher: { backgroundColor: '#e8efeb', borderRadius: 10, flexDirection: 'row', marginTop: 32, padding: 4 }, switchItem: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 11 }, switchItemActive: { backgroundColor: '#ffffff', shadowColor: '#214a39', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.08, shadowRadius: 3 }, switchText: { color: '#728079', fontSize: 15, fontWeight: '600' }, switchTextActive: { color: '#2d9b73' },
  form: { marginTop: 28 }, label: { color: '#3e4b45', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 18 }, input: { backgroundColor: '#ffffff', borderColor: '#dce6e0', borderRadius: 10, borderWidth: 1, color: '#23312b', fontSize: 16, height: 52, paddingHorizontal: 15 }, error: { color: '#c04444', fontSize: 14, lineHeight: 20, marginTop: 18 }, submit: { alignItems: 'center', backgroundColor: '#46b889', borderRadius: 10, height: 52, justifyContent: 'center', marginTop: 28 }, submitPressed: { opacity: 0.85 }, submitDisabled: { opacity: 0.6 }, submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
