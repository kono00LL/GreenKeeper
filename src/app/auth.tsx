import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { authReturnTarget } from '@/navigation/auth-return';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, requestEmailCode, resetPassword, verifyEmailCode } from '@/services/auth-api';
import { useAuthStore } from '@/store/auth-store';

type Mode = 'code' | 'password' | 'reset';

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.error?.message || '请求失败，请稍后重试';
  return '请求失败，请稍后重试';
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

export default function AuthPage() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnTarget = authReturnTarget(returnTo);
  const leave = () => {
    if (returnTo === '/camera') router.dismissTo('/(tabs)');
    else if (returnTarget) router.dismissTo(returnTarget);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  const normalizedEmail = email.trim().toLowerCase();
  const handleSendCode = async () => {
    if (sendingCode || resendIn > 0) return;
    if (!validEmail(email)) { setError('请输入有效的邮箱地址'); return; }
    setSendingCode(true); setError(null); setNotice(null);
    try {
      await requestEmailCode(normalizedEmail, mode === 'reset' ? 'password_reset' : 'login');
      setResendIn(60);
      setNotice('如果该邮箱可接收邮件，验证码已发送，请查收邮箱。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSendingCode(false);
    }
  };

  const validate = () => {
    if (!validEmail(email)) return '请输入有效的邮箱地址';
    if (mode === 'password' && password.length < 8) return '密码至少需要 8 个字符';
    if (mode !== 'password' && !/^\d{6}$/.test(code)) return '请输入 6 位邮箱验证码';
    if (mode === 'reset' && password.length < 8) return '新密码至少需要 8 个字符';
    if (mode === 'reset' && password !== confirmPassword) return '两次输入的新密码不一致';
    if (mode === 'code' && userName.trim().length > 10) return '昵称最多 10 个字符';
    return null;
  };

  const finishLogin = (response: Awaited<ReturnType<typeof login>>) => {
    setSession(response.user, response.access_token, response.refresh_token);
    if (returnTarget) router.dismissTo(returnTarget);
    else router.replace('/(tabs)');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSubmitting(true); setError(null); setNotice(null);
    try {
      if (mode === 'password') {
        finishLogin(await login(normalizedEmail, password));
      } else if (mode === 'code') {
        finishLogin(await verifyEmailCode(normalizedEmail, code, userName));
      } else {
        await resetPassword(normalizedEmail, code, password);
        setMode('password');
        setCode(''); setPassword(''); setConfirmPassword('');
        setNotice('密码已重设，请使用新密码登录。');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'reset' ? '重设密码' : mode === 'password' ? '密码登录' : '邮箱验证码登录';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>GreenKeeper</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={leave}><Text style={styles.skip}>跳过</Text></Pressable>
          </View>
          <View style={styles.intro}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{mode === 'reset' ? '验证邮箱后设置新密码' : '新邮箱验证后会自动创建账户'}</Text>
          </View>
          {mode !== 'reset' && (
            <View style={styles.switcher}>
              <Pressable accessibilityRole="button" onPress={() => switchMode('code')} style={[styles.switchItem, mode === 'code' && styles.switchItemActive]}>
                <Text style={[styles.switchText, mode === 'code' && styles.switchTextActive]}>邮箱验证码</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => switchMode('password')} style={[styles.switchItem, mode === 'password' && styles.switchItemActive]}>
                <Text style={[styles.switchText, mode === 'password' && styles.switchTextActive]}>密码登录</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.form}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#9aa3a0" style={styles.input} value={email} />
            {mode === 'code' && <>
              <Text style={styles.label}>验证码</Text>
              <TextInput autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder="输入 6 位验证码" placeholderTextColor="#9aa3a0" style={styles.input} value={code} />
              <Pressable accessibilityRole="button" disabled={sendingCode || resendIn > 0} onPress={handleSendCode} style={styles.codeAction}>
                <Text style={[styles.link, (sendingCode || resendIn > 0) && styles.disabledLink]}>{sendingCode ? '正在发送…' : resendIn > 0 ? `重新发送（${resendIn} 秒）` : '发送验证码'}</Text>
              </Pressable>
              <Text style={styles.helper}>首次验证成功会自动注册；验证码 5 分钟内有效。</Text>
              <Text style={styles.label}>昵称（可选）</Text>
              <TextInput maxLength={10} onChangeText={setUserName} placeholder="默认名称为匿名用户" placeholderTextColor="#9aa3a0" style={styles.input} value={userName} />
            </>}
            {mode === 'password' && <>
              <Text style={styles.label}>密码</Text>
              <TextInput autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="至少 8 个字符" placeholderTextColor="#9aa3a0" secureTextEntry style={styles.input} value={password} />
              <Pressable accessibilityRole="button" onPress={() => switchMode('reset')} style={styles.codeAction}><Text style={styles.link}>忘记密码？</Text></Pressable>
            </>}
            {mode === 'reset' && <>
              <Text style={styles.label}>验证码</Text>
              <TextInput autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder="输入 6 位验证码" placeholderTextColor="#9aa3a0" style={styles.input} value={code} />
              <Pressable accessibilityRole="button" disabled={sendingCode || resendIn > 0} onPress={handleSendCode} style={styles.codeAction}>
                <Text style={[styles.link, (sendingCode || resendIn > 0) && styles.disabledLink]}>{sendingCode ? '正在发送…' : resendIn > 0 ? `重新发送（${resendIn} 秒）` : '发送重设验证码'}</Text>
              </Pressable>
              <Text style={styles.label}>新密码</Text>
              <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="至少 8 个字符" placeholderTextColor="#9aa3a0" secureTextEntry style={styles.input} value={password} />
              <Text style={styles.label}>确认新密码</Text>
              <TextInput autoCapitalize="none" onChangeText={setConfirmPassword} placeholder="再次输入新密码" placeholderTextColor="#9aa3a0" secureTextEntry style={styles.input} value={confirmPassword} />
            </>}
          </View>
          {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={mode === 'reset' ? '重设密码' : '登录'} disabled={submitting} onPress={handleSubmit} style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, submitting && styles.submitDisabled]}>
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>{mode === 'reset' ? '重设密码' : '登录'}</Text>}
          </Pressable>
          {mode === 'reset' && <Pressable accessibilityRole="button" onPress={() => switchMode('password')} style={styles.backAction}><Text style={styles.link}>返回密码登录</Text></Pressable>}
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
  form: { marginTop: 28 }, label: { color: '#3e4b45', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 18 }, input: { backgroundColor: '#ffffff', borderColor: '#dce6e0', borderRadius: 10, borderWidth: 1, color: '#23312b', fontSize: 16, height: 52, paddingHorizontal: 15 },
  codeAction: { alignSelf: 'flex-start', paddingVertical: 12 }, backAction: { alignSelf: 'center', marginTop: 18, padding: 8 }, link: { color: '#27815f', fontSize: 14, fontWeight: '600' }, disabledLink: { color: '#879189' }, helper: { color: '#718079', fontSize: 13, lineHeight: 19, marginTop: 2 },
  notice: { color: '#2d7650', fontSize: 14, lineHeight: 20, marginTop: 18 }, error: { color: '#c04444', fontSize: 14, lineHeight: 20, marginTop: 18 }, submit: { alignItems: 'center', backgroundColor: '#46b889', borderRadius: 10, height: 52, justifyContent: 'center', marginTop: 28 }, submitPressed: { opacity: 0.85 }, submitDisabled: { opacity: 0.6 }, submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
