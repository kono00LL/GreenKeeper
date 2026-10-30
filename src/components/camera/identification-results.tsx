import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import type { PlantIdentification } from '@/types/plant-identification';

const matchMessages = {
  unmatched: '植物资料暂未收录',
  not_ready: '植物资料整理中',
  ambiguous: '名称对应关系待核对',
};

export function IdentificationResults({ result }: { result: PlantIdentification }) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      {result.candidates.length === 0 ? (
        <CommunityText accessibilityRole="alert">未找到匹配植物，请换个角度重新拍摄</CommunityText>
      ) : (
        <>
          <CommunityText bold>可能的植物</CommunityText>
          {result.candidates.map((candidate, index) => (
            <View key={`${candidate.scientificName}-${index}`} style={styles.candidate}>
              {candidate.commonNames[0] ? <CommunityText bold>{candidate.commonNames[0]}</CommunityText> : null}
              <CommunityText bold={!candidate.commonNames[0]}>{candidate.scientificName}</CommunityText>
              <CommunityText style={styles.note}>匹配分数 {candidate.score.toFixed(3)}</CommunityText>
              {candidate.localMatch?.status === 'matched' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`查看植物资料：${candidate.localMatch.plant.nameZh}`}
                  style={styles.detailAction} onPress={() => {
                    if (candidate.localMatch?.status === 'matched') {
                      router.push({ pathname: '/plants/[id]', params: { id: candidate.localMatch.plant.id } });
                    }
                  }}>
                  <CommunityText bold>{candidate.localMatch.plant.nameZh}</CommunityText>
                  <CommunityText style={styles.detailText}>查看植物资料 ›</CommunityText>
                </Pressable>
              ) : candidate.localMatch ? (
                <CommunityText style={styles.note}>{matchMessages[candidate.localMatch.status]}</CommunityText>
              ) : null}
            </View>
          ))}
          <CommunityText style={styles.note}>结果为模型候选，匹配分数不代表识别准确率。</CommunityText>
        </>
      )}
      <Pressable accessibilityRole="link" accessibilityLabel="识别由 Pl@ntNet 提供" style={styles.attribution}
        onPress={() => { void Linking.openURL('https://plantnet.org/').catch(() => undefined); }}>
        <CommunityText style={styles.note}>识别由</CommunityText>
        <Image accessibilityLabel="Pl@ntNet Logo" source={require('@/assets/images/plantnet-logo.svg')} contentFit="contain" style={styles.logo} />
        <CommunityText style={styles.note}>提供</CommunityText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { maxHeight: 300, width: '100%', marginTop: 12 },
  content: { gap: 8, paddingBottom: 8 },
  candidate: { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.divider, gap: 4 },
  note: { fontSize: 12, lineHeight: 18, color: colors.secondaryText },
  detailAction: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  detailText: { color: colors.selectedText, fontSize: 14 },
  attribution: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { width: 108, height: 24 },
});
