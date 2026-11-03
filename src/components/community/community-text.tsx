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
export function useCommunityFontFamily(bold = false) {
  const loaded = useContext(FontsReady);
  return loaded ? (bold ? 'OPPOSans-Bold' : 'OPPOSans-Regular') : undefined;
}
export function CommunityText({ bold = false, style, ...props }: TextProps & { bold?: boolean }) {
  const fontFamily = useCommunityFontFamily(bold);
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.text,
          fontSize: 16,
          fontFamily,
          fontWeight: bold && !fontFamily ? '700' : '400',
        },
        style,
      ]}
    />
  );
}
