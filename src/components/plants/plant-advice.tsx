import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { askPlantAdvice, plantAdviceErrorMessage } from '@/services/ai-api';
import { useAuthStore } from '@/store/auth-store';
import type { PlantDetail } from '@/types/plant';

export function PlantAdvice({ plant }: { plant: PlantDetail }) {
  const authStatus = useAuthStore((state) => state.status);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canAsk = authStatus === 'authenticated';

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setMessage('请先输入想咨询的问题');
      return;
    }
    setMessage(null);
    setAnswer(null);
    setLoading(true);
    try {
      const result = await askPlantAdvice(plant.id, trimmed);
      setAnswer(result.answer);
    } catch (error) {
      setMessage(plantAdviceErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.section}>
      <CommunityText bold style={styles.title}>AI 养护助手</CommunityText>
      <CommunityText style={styles.hint}>可以根据这份植物资料咨询浇水、光照、换盆等问题。</CommunityText>
      {!canAsk ? <CommunityText style={styles.loginHint}>登录后即可使用 AI 养护助手</CommunityText> : null}
      <TextInput
        accessibilityLabel="植物养护问题"
        editable={canAsk && !loading}
        multiline
        onChangeText={setQuestion}
        placeholder="例如：叶子发黄时应该先检查什么？"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={question}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="询问 AI 养护助手"
        disabled={!canAsk || loading}
        onPress={() => void ask()}
        style={[styles.button, (!canAsk || loading) && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={colors.white} /> : <CommunityText bold style={styles.buttonText}>询问 AI</CommunityText>}
      </Pressable>
      {message ? <CommunityText accessibilityRole="alert" style={styles.message}>{message}</CommunityText> : null}
      {answer ? <View style={styles.answer}><CommunityText bold style={styles.answerTitle}>建议</CommunityText><CommunityText style={styles.answerText}>{answer}</CommunityText></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopColor: colors.divider, borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
  title: { color: colors.text, fontSize: 18, marginBottom: 8 },
  hint: { color: colors.secondaryText, fontSize: 14, lineHeight: 21 },
  loginHint: { color: colors.muted, fontSize: 13, marginTop: 8 },
  input: { borderColor: colors.divider, borderRadius: 6, borderWidth: 1, color: colors.text, minHeight: 78, padding: 12, marginTop: 12, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 6, justifyContent: 'center', minHeight: 44, marginTop: 10 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white },
  message: { color: '#a23b32', fontSize: 13, lineHeight: 20, marginTop: 8 },
  answer: { backgroundColor: '#f3f7f3', borderRadius: 6, marginTop: 12, padding: 12 },
  answerTitle: { color: colors.text, fontSize: 14 },
  answerText: { color: colors.secondaryText, fontSize: 14, lineHeight: 22, marginTop: 6 },
});
