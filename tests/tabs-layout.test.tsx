import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabsLayout from '@/app/(tabs)/_layout';

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Screen = ({ name, options }: { name: string; options: { tabBarStyle?: { display?: string } } }) =>
    ReactModule.createElement(View, {
      testID: `tab-${name}`,
      accessibilityHint: options.tabBarStyle?.display,
    });
  const Tabs = ({ children }: { children: React.ReactNode }) =>
    ReactModule.createElement(View, null, children);
  Tabs.Screen = Screen;
  return { Tabs };
});

jest.mock('expo-image', () => ({ Image: () => null }));

test('hides the tab bar only for the camera screen', () => {
  render(<TabsLayout />);

  expect(screen.getByTestId('tab-camera').props.accessibilityHint).toBe('none');
  expect(screen.getByTestId('tab-index').props.accessibilityHint).toBeUndefined();
  expect(screen.getByTestId('tab-garden').props.accessibilityHint).toBeUndefined();
  expect(screen.getByTestId('tab-post').props.accessibilityHint).toBeUndefined();
  expect(screen.getByTestId('tab-profile').props.accessibilityHint).toBeUndefined();
});
