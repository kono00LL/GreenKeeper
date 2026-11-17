import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: '主页' }} />
      <Stack.Screen name="plants/search" options={{ title: '搜索植物' }} />
    </Stack>
  );
}
