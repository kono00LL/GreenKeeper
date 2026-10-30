import { createContext, useContext, type ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { Text, type TextProps } from 'react-native';
import { colors } from '@/constants/color';

const FontsReady = createContext(false);
export function CommunityFontProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    'OPPOSans-Regular': require('@/assets/fonts/OPPOSans-Regular.ttf'),
    'OPPOSans-Bold': require('@/assets/fonts/OPPOSans-Bold.ttf'),
  });
  // Content stays usable with system fonts during loading or after a font error.
  return <FontsReady.Provider value={loaded}>{children}</FontsReady.Provider>;
}
export function CommunityText({ bold = false, style, ...props }: TextProps & { bold?: boolean }) {
  const loaded = useContext(FontsReady);
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.text,
          fontSize: 16,
          fontFamily: loaded ? (bold ? 'OPPOSans-Bold' : 'OPPOSans-Regular') : undefined,
          fontWeight: !loaded && bold ? '700' : '400',
        },
        style,
      ]}
    />
  );
}
