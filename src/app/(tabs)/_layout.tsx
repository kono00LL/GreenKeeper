import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE_COLOR = '#68dbbb';
const INACTIVE_COLOR = '#99999b';
const SETTING_ICON = require('@/assets/icons/setting01.svg');

const tabs = [
  { name: 'index', title: '主页' },
  { name: 'garden', title: '花园' },
  { name: 'camera', title: '拍摄' },
  { name: 'post', title: '社区' },
  { name: 'profile', title: '我' },
] as const;

function TabIcon({ focused, title }: { focused: boolean; title: string }) {
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <View style={styles.tabIcon}>
      <Image
        source={SETTING_ICON}
        contentFit="contain"
        style={[styles.icon, { tintColor: color }]}
      />
      {focused && <Text style={[styles.label, { color }]}>{title}</Text>}
    </View>
  );
}

function TransparentTabButton(props: any) {
  const staticStyle = typeof props.style === 'function' ? undefined : props.style;

  return (
    <Pressable
      {...props}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [
        staticStyle,
        pressed && { backgroundColor: 'transparent', opacity: 1 },
      ]}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom }],
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarButton: (props) => <TransparentTabButton {...props} />,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} title={tab.title} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#f8f8f8',
    borderColor: '#f1f1f1',
    borderRadius: 5,
    borderWidth: 1,
    height: 64,
    marginBottom: 0,
    overflow: 'hidden',
    paddingTop: 4,
    position: 'absolute',
  },
  tabBarItem: {
    alignItems: 'center',
    height: 60,
    justifyContent: 'center',
    width: '20%',
  },
  tabIcon: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    minWidth: 44,
  },
  icon: {
    height: 24,
    width: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 2,
  },
});
