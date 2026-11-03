import Markdown from 'react-native-markdown-display';
import { StyleSheet, type TextStyle } from 'react-native';
import { colors } from '@/constants/color';
import { useCommunityFontFamily } from './community-text';

export function CommunityMarkdown({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  const fontFamily = useCommunityFontFamily();
  const textStyle: TextStyle = {
    color: colors.secondaryText,
    fontFamily,
    fontSize: style?.fontSize ?? 16,
    lineHeight: style?.lineHeight ?? 25,
    ...style,
  };
  return (
    <Markdown
      style={StyleSheet.create({
        body: { ...textStyle, paddingHorizontal: style?.paddingHorizontal },
        paragraph: { ...textStyle, marginTop: 0, marginBottom: 12 },
        heading1: { ...textStyle, color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 16, marginBottom: 8 },
        heading2: { ...textStyle, color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 14, marginBottom: 8 },
        heading3: { ...textStyle, color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
        heading4: { ...textStyle, color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 4 },
        heading5: { ...textStyle, color: colors.text, fontSize: 15, fontWeight: '700' },
        heading6: { ...textStyle, color: colors.text, fontSize: 14, fontWeight: '700' },
        strong: { fontWeight: '700', color: colors.text },
        em: { fontStyle: 'italic' },
        link: { color: colors.primary, textDecorationLine: 'underline' },
        blockquote: {
          backgroundColor: colors.selectedBackground,
          borderColor: colors.primary,
          borderLeftWidth: 3,
          marginLeft: 0,
          paddingHorizontal: 12,
        },
        bullet_list: { marginBottom: 8 },
        ordered_list: { marginBottom: 8 },
        list_item: { flexDirection: 'row' },
        code_inline: { color: colors.text, backgroundColor: colors.selectedBackground, fontFamily: 'monospace' },
        code_block: { color: colors.text, backgroundColor: colors.selectedBackground, fontFamily: 'monospace', padding: 10 },
        fence: { color: colors.text, backgroundColor: colors.selectedBackground, fontFamily: 'monospace', padding: 10 },
        hr: { backgroundColor: colors.divider, height: 1 },
      })}
    >
      {children}
    </Markdown>
  );
}
