import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/color';
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
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="h-14 flex-row items-center justify-between border-b px-5"
        style={{ borderBottomColor: colors.divider }}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text className="text-[38px] font-light leading-10" style={{ color: colors.text }}>
            ‹
          </Text>
        </Pressable>
        <Text className="text-lg font-semibold" style={{ color: colors.text }}>
          个人信息
        </Text>
        <View className="w-7" />
      </View>

      <View className="mt-4" style={{ backgroundColor: colors.white }}>
        <Pressable
          accessibilityRole="button"
          onPress={openNameEditor}
          className="min-h-[58px] flex-row items-center justify-between border-b px-5"
          style={{ borderBottomColor: colors.divider }}>
          <Text className="text-base" style={{ color: colors.text }}>
            昵称
          </Text>
          <View className="flex-row items-center">
            <Text className="mr-3 text-base" style={{ color: colors.muted }}>
              {user.user_name}
            </Text>
            <Text className="text-[25px] font-light leading-7" style={{ color: colors.muted }}>
              ›
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={openGenderEditor}
          className="min-h-[58px] flex-row items-center justify-between border-b px-5"
          style={{ borderBottomColor: colors.divider }}>
          <Text className="text-base" style={{ color: colors.text }}>
            性别
          </Text>
          <View className="flex-row items-center">
            <Text className="mr-3 text-base" style={{ color: colors.muted }}>
              {genderLabels[user.gender]}
            </Text>
            <Text className="text-[25px] font-light leading-7" style={{ color: colors.muted }}>
              ›
            </Text>
          </View>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={editor !== null}
        onRequestClose={() => !saving && setEditor(null)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
          <View className="rounded-t-[18px] p-5 pb-8" style={{ backgroundColor: colors.white }}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                {editor === 'name' ? '修改昵称' : '选择性别'}
              </Text>
              <Pressable onPress={() => !saving && setEditor(null)}>
                <Text className="text-[15px]" style={{ color: colors.muted }}>
                  取消
                </Text>
              </Pressable>
            </View>
            {editor === 'name' ? (
              <TextInput
                autoFocus
                maxLength={10}
                onChangeText={setDraftName}
                placeholder="请输入昵称"
                placeholderTextColor={colors.muted}
                className="h-[50px] rounded-[10px] border px-3.5 text-base"
                style={{ borderColor: colors.inputBorder, color: colors.text }}
                value={draftName}
              />
            ) : (
              <View className="flex-row gap-2">
                {(Object.keys(genderLabels) as Gender[]).map((gender) => (
                  <Pressable
                    key={gender}
                    onPress={() => setDraftGender(gender)}
                    className="flex-1 items-center rounded-[10px] border py-[13px]"
                    style={{
                      backgroundColor: draftGender === gender ? colors.selectedBackground : colors.white,
                      borderColor: draftGender === gender ? colors.primary : colors.inputBorder,
                    }}>
                    <Text
                      className="text-base"
                      style={{ color: draftGender === gender ? colors.selectedText : colors.secondaryText }}>
                      {genderLabels[gender]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {error && (
              <Text className="mt-3.5 text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            )}
            <Pressable
              disabled={saving}
              onPress={save}
              className="mt-5 h-[50px] items-center justify-center rounded-[10px]"
              style={{ backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="text-base font-semibold" style={{ color: colors.white }}>
                  保存
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
      <Pressable accessibilityRole="button" onPress={handleLogout} className="mt-9 items-center py-3">
        <Text className="text-[15px] font-semibold" style={{ color: colors.danger }}>
          退出登录
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
