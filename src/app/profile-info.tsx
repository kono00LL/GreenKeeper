import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, updateCurrentUser } from '@/services/auth-api';
import { useAuthStore } from '@/store/auth-store';
import type { Gender } from '@/types/auth';

const genderLabels: Record<Gender, string> = { male: '男', female: '女', private: '保密' };

function errorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.error?.message || '保存失败，请稍后重试';
  return '保存失败，请稍后重试';
}

export default function ProfileInfoPage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const [editor, setEditor] = useState<'name' | 'gender' | null>(null);
  const [draftName, setDraftName] = useState(user?.user_name || '');
  const [draftGender, setDraftGender] = useState<Gender>(user?.gender || 'private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.user_id;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
      return;
    }
    if (!userId) return;
    getCurrentUser()
      .then((latestUser) => {
        updateUser(latestUser);
        setDraftName(latestUser.user_name);
        setDraftGender(latestUser.gender);
      })
      .catch(() => undefined);
  }, [status, updateUser, userId]);

  const openNameEditor = () => {
    setError(null);
    setDraftName(user?.user_name || '');
    setEditor('name');
  };

  const openGenderEditor = () => {
    setError(null);
    setDraftGender(user?.gender || 'private');
    setEditor('gender');
  };

  const save = async () => {
    if (!user || saving) return;
    if (editor === 'name') {
      const name = draftName.trim();
      if (!name || name.length > 10) {
        setError('昵称长度需要在 1 到 10 个字符之间');
        return;
      }
      setSaving(true);
      try {
        updateUser(await updateCurrentUser({ user_name: name }));
        setEditor(null);
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (editor === 'gender') {
      setSaving(true);
      try {
        updateUser(await updateCurrentUser({ gender: draftGender }));
        setEditor(null);
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setSaving(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/profile');
  };

  if (status === 'checking' || !user) return null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>个人信息</Text>
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.list}>
        <Pressable accessibilityRole="button" onPress={openNameEditor} style={styles.row}>
          <Text style={styles.label}>昵称</Text>
          <View style={styles.valueWrap}>
            <Text style={styles.value}>{user.user_name}</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={openGenderEditor} style={styles.row}>
          <Text style={styles.label}>性别</Text>
          <View style={styles.valueWrap}>
            <Text style={styles.value}>{genderLabels[user.gender]}</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={editor !== null}
        onRequestClose={() => !saving && setEditor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editor === 'name' ? '修改昵称' : '选择性别'}</Text>
              <Pressable onPress={() => !saving && setEditor(null)}>
                <Text style={styles.cancel}>取消</Text>
              </Pressable>
            </View>
            {editor === 'name' ? (
              <TextInput
                autoFocus
                maxLength={10}
                onChangeText={setDraftName}
                placeholder="请输入昵称"
                placeholderTextColor="#99999b"
                style={styles.modalInput}
                value={draftName}
              />
            ) : (
              <View style={styles.genderOptions}>
                {(Object.keys(genderLabels) as Gender[]).map((gender) => (
                  <Pressable
                    key={gender}
                    onPress={() => setDraftGender(gender)}
                    style={[styles.genderOption, draftGender === gender && styles.genderOptionSelected]}>
                    <Text style={[styles.genderText, draftGender === gender && styles.genderTextSelected]}>
                      {genderLabels[gender]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              disabled={saving}
              onPress={save}
              style={[styles.saveButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>保存</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
      <Pressable accessibilityRole="button" onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8f8f8', flex: 1 },
  header: { alignItems: 'center', borderBottomColor: '#f1f1f1', borderBottomWidth: 1, flexDirection: 'row', height: 56, justifyContent: 'space-between', paddingHorizontal: 20 },
  back: { color: '#222222', fontSize: 38, fontWeight: '300', lineHeight: 40 },
  title: { color: '#111111', fontSize: 18, fontWeight: '600' },
  headerSpace: { width: 28 },
  list: { backgroundColor: '#ffffff', marginTop: 16 },
  row: { alignItems: 'center', borderBottomColor: '#f1f1f1', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 20 },
  label: { color: '#111111', fontSize: 16 },
  valueWrap: { alignItems: 'center', flexDirection: 'row' },
  value: { color: '#99999b', fontSize: 16, marginRight: 12 },
  arrow: { color: '#99999b', fontSize: 25, fontWeight: '300', lineHeight: 28 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.35)', flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#111111', fontSize: 18, fontWeight: '600' },
  cancel: { color: '#99999b', fontSize: 15 },
  modalInput: { borderColor: '#d7dfda', borderRadius: 10, borderWidth: 1, color: '#111111', fontSize: 16, height: 50, paddingHorizontal: 14 },
  genderOptions: { flexDirection: 'row', gap: 8 },
  genderOption: { alignItems: 'center', borderColor: '#d7dfda', borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 13 },
  genderOptionSelected: { backgroundColor: '#e7f7f0', borderColor: '#68dbbb' },
  genderText: { color: '#666666', fontSize: 16 },
  genderTextSelected: { color: '#268e65', fontWeight: '600' },
  error: { color: '#c04444', fontSize: 14, marginTop: 12 },
  saveButton: { alignItems: 'center', backgroundColor: '#68dbbb', borderRadius: 10, height: 50, justifyContent: 'center', marginTop: 20 },
  disabled: { opacity: 0.6 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  logoutButton: { alignItems: 'center', marginTop: 36, paddingVertical: 12 },
  logoutText: { color: '#ee395d', fontSize: 15, fontWeight: '600' },
});
