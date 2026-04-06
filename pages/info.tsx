import { InlineAd } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import { Txt } from '@toss/tds-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export const Route = createRoute('/info', {
  component: InfoPage,
});

const PRIMARY = '#3B82F6';
const BANNER_AD_ID = 'ait.v2.live.1ecf51d0c0c94f76';

const INFO_CARDS = [
  {
    emoji: '🌤️',
    title: '날씨체크인이란?',
    body: '매일 날씨를 확인하고 광고를 시청하면 토스포인트를 받을 수 있는 앱테크 서비스예요.',
  },
  {
    emoji: '📅',
    title: '하루 3번 참여 가능',
    body: '아침·점심·저녁 각 1번씩 참여할 수 있어요. 3번 모두 참여하면 보너스 포인트도 받아요!',
  },
  {
    emoji: '💰',
    title: '포인트 지급 방식',
    body: '참여 1회당 토스포인트 3원이 지급돼요. 보너스 포함 최대 하루 12원을 받을 수 있어요.',
  },
  {
    emoji: '📺',
    title: '리워드 광고 시청',
    body: '참여하기 버튼을 누르면 짧은 광고가 재생돼요. 광고를 끝까지 보면 포인트가 지급돼요.',
  },
  {
    emoji: '☁️',
    title: '날씨 정보 출처',
    body: '날씨 정보는 기상청 단기예보 API를 통해 제공돼요. 서울 기준 오늘의 날씨를 보여줘요.',
  },
  {
    emoji: '❓',
    title: '포인트가 안 들어왔어요',
    body: '포인트는 광고 시청 후 수 분 내에 지급돼요. 지연될 경우 토스 고객센터에 문의해 주세요.',
  },
];

function InfoPage() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 앱 이름/설명 */}
        <View style={styles.appBanner}>
          <Txt typography="t1" style={styles.appBannerEmoji}>🌤️</Txt>
          <Txt typography="t2" color="#FFFFFF">날씨체크인</Txt>
          <Txt typography="t5" color="rgba(255,255,255,0.85)">날씨 확인하고 토스포인트 받기</Txt>
        </View>

        {INFO_CARDS.map((card, i) => (
          <View key={i} style={styles.infoCard}>
            <Txt typography="t3" style={styles.infoCardEmoji}>{card.emoji}</Txt>
            <View style={styles.infoCardContent}>
              <Txt typography="t5" color="#191F28">{card.title}</Txt>
              <Txt typography="c1" color="#4E5968" style={styles.infoCardBody}>{card.body}</Txt>
            </View>
          </View>
        ))}

        <Txt typography="c1" color="#B0B8C1" style={styles.version}>v1.0.0</Txt>
      </ScrollView>

      {/* 하단 배너 */}
      <View style={styles.bannerWrap}>
        <InlineAd adGroupId={BANNER_AD_ID} variant="expanded" impressFallbackOnMount />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  appBanner: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  appBannerEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F2F4F6',
  },
  infoCardEmoji: {
    fontSize: 28,
    lineHeight: 34,
    width: 34,
    textAlign: 'center',
    marginTop: 2,
  },
  infoCardContent: {
    flex: 1,
    gap: 4,
  },
  infoCardBody: {
    lineHeight: 20,
  },
  version: {
    textAlign: 'center',
    marginTop: 8,
  },
  bannerWrap: {
    width: '100%',
    height: 96,
    overflow: 'hidden',
  },
});
