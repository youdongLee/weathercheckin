import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import { Button, Txt } from '@toss/tds-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckinType, useCheckin } from '../stores/CheckinContext';
import { DayWeather } from '../data/types';
import { DEFAULT_CITY, getWeatherForecast, weatherIcon } from '../services/weatherApi';

export const Route = createRoute('/', {
  component: HomePage,
  screenOptions: { headerShown: false },
});

const PRIMARY = '#3B82F6';
const PRIMARY_LIGHT = '#EFF6FF';
const PRIMARY_DARK = '#2563EB';

// TODO: 콘솔에서 발급받은 실제 ID로 교체
const REWARD_AD_ID = 'ait.v2.live.0996982a9c8b44a1';
const BANNER_AD_ID = 'ait.v2.live.1ecf51d0c0c94f76';

const PROMOTION_CODES: Record<CheckinType | 'bonus', string> = {
  morning:   'WEATHERCHECKIN_MORNING',
  afternoon: 'WEATHERCHECKIN_AFTERNOON',
  evening:   'WEATHERCHECKIN_EVENING',
  bonus:     'WEATHERCHECKIN_BONUS',
};

// 시간대별 참여 가능 시간 (분 단위, KST)
const CHECKIN_WINDOWS: Record<CheckinType | 'bonus', { start: number; end: number; label: string }> = {
  morning:   { start:  7 * 60,           end:  9 * 60,       label: '오전 7시 ~ 9시' },
  afternoon: { start: 12 * 60,           end: 14 * 60,       label: '오후 12시 ~ 2시' },
  evening:   { start: 18 * 60,           end: 20 * 60,       label: '오후 6시 ~ 8시' },
  bonus:     { start: 21 * 60,           end: 23 * 60 + 50,  label: '오후 9시 ~ 11시 50분' },
};

function kstMinutes(): number {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

const CHECKIN_INFO: Record<CheckinType, { label: string; emoji: string; description: string }> = {
  morning:   { label: '아침',  emoji: '🌅', description: '오늘 날씨를 확인하고 포인트 받기' },
  afternoon: { label: '점심',  emoji: '☀️', description: '낮 날씨를 확인하고 포인트 받기' },
  evening:   { label: '저녁',  emoji: '🌙', description: '내일 날씨를 확인하고 포인트 받기' },
};

function todayLabel(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 (${days[kst.getUTCDay()]})`;
}

function HomePage() {
  const navigation = Route.useNavigation();
  const { todayRecord, checkin, claimBonus, allThreeDone, totalEarnedToday } = useCheckin();

  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const pendingAction = useRef<CheckinType | 'bonus' | null>(null);
  const adSupported = loadFullScreenAd.isSupported();
  const [adLoaded, setAdLoaded] = useState(!adSupported);
  const [nowMinutes, setNowMinutes] = useState(kstMinutes());

  useEffect(() => {
    const timer = setInterval(() => setNowMinutes(kstMinutes()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const isWindowActive = (type: CheckinType | 'bonus') => {
    const { start, end } = CHECKIN_WINDOWS[type];
    return nowMinutes >= start && nowMinutes < end;
  };

  useEffect(() => {
    getWeatherForecast(DEFAULT_CITY.lat, DEFAULT_CITY.lon)
      .then(({ today }) => { setWeather(today); setWeatherLoading(false); })
      .catch(() => { setWeatherError(true); setWeatherLoading(false); });
  }, []);

  useEffect(() => {
    if (!adSupported) return;
    const unregister = loadFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: (event) => { if (event.type === 'loaded') setAdLoaded(true); },
      onError: () => setAdLoaded(false),
    });
    return () => unregister();
  }, [adSupported]);

  const loadNextAd = () => {
    if (!adSupported) return;
    setAdLoaded(false);
    loadFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: (event) => { if (event.type === 'loaded') setAdLoaded(true); },
      onError: () => setAdLoaded(false),
    });
  };

  const executeReward = async (action: CheckinType | 'bonus') => {
    const code = PROMOTION_CODES[action];
    if (action === 'bonus') {
      await claimBonus();
      try {
        await grantPromotionReward({ params: { promotionCode: code, amount: 10 } });
        Alert.alert('🎁 보너스 획득!', '3번 체크인 완료 보너스로 토스포인트 10원을 받았어요!');
      } catch {
        Alert.alert('🎁 보너스 완료!', '포인트는 잠시 후 지급돼요.');
      }
    } else {
      await checkin(action);
      const info = CHECKIN_INFO[action];
      try {
        await grantPromotionReward({ params: { promotionCode: code, amount: 10 } });
        Alert.alert(`${info.emoji} ${info.label} 체크인 완료!`, '토스포인트 10원이 지급됐어요!');
      } catch {
        Alert.alert(`${info.emoji} 체크인 완료!`, '포인트는 잠시 후 지급돼요.');
      }
    }
  };

  const showRewardAd = (action: CheckinType | 'bonus') => {
    if (!adSupported) {
      executeReward(action);
      return;
    }
    pendingAction.current = action;
    showFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: async (event) => {
        if (event.type === 'userEarnedReward') {
          const a = pendingAction.current;
          if (a) await executeReward(a);
        }
        if (event.type === 'dismissed') {
          pendingAction.current = null;
          loadNextAd();
        }
      },
      onError: () => Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.'),
    });
  };

  const handleCheckin = (type: CheckinType) => {
    if (todayRecord[type] || !adLoaded || !isWindowActive(type)) return;
    showRewardAd(type);
  };

  const handleBonus = () => {
    if (!allThreeDone || todayRecord.bonusClaimed || !adLoaded || !isWindowActive('bonus')) return;
    showRewardAd('bonus');
  };

  const completedCount = [todayRecord.morning, todayRecord.afternoon, todayRecord.evening].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Txt typography="t2" color={PRIMARY}>날씨체크인</Txt>
          <Txt typography="c1" color="#8B95A1" style={styles.headerDate}>{todayLabel()}</Txt>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => navigation.navigate('/info')}
          activeOpacity={0.7}
        >
          <Text style={styles.infoButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* 오늘 획득 요약 */}
      <View style={styles.summaryBar}>
        <Txt typography="t5" color="#4E5968">
          오늘 <Txt typography="t5" color={PRIMARY}>{totalEarnedToday}원</Txt> 획득했어요
        </Txt>
        <Txt typography="c1" color="#B0B8C1">최대 40원</Txt>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 날씨 카드 */}
        <View style={styles.weatherCard}>
          <Text style={styles.weatherCity}>📍 {DEFAULT_CITY.name}</Text>
          {weatherLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 12 }} />
          ) : weatherError ? (
            <Text style={styles.weatherError}>날씨 정보를 불러올 수 없어요</Text>
          ) : weather ? (
            <View style={styles.weatherRow}>
              <Text style={styles.weatherEmoji}>{weatherIcon(weather.icon)}</Text>
              <View style={styles.weatherInfo}>
                <Text style={styles.weatherTemp}>
                  {Math.round(weather.tempMin)}° / {Math.round(weather.tempMax)}°
                </Text>
                <Text style={styles.weatherCondition}>{weather.conditions[0]}</Text>
              </View>
              <View style={styles.weatherBadges}>
                {weather.rainChance > 0.1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>☔ {Math.round(weather.rainChance * 100)}%</Text>
                  </View>
                )}
                {weather.windSpeed > 5 && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>💨 {weather.windSpeed}m/s</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </View>

        {/* 체크인 카드 */}
        {(['morning', 'afternoon', 'evening'] as CheckinType[]).map((type) => {
          const info = CHECKIN_INFO[type];
          const done = todayRecord[type];
          const windowActive = isWindowActive(type);
          const windowLabel = CHECKIN_WINDOWS[type].label;
          return (
            <View key={type} style={[styles.checkinCard, done && styles.checkinCardDone, !windowActive && !done && styles.checkinCardInactive]}>
              <View style={styles.checkinCardLeft}>
                <Text style={styles.checkinEmoji}>{info.emoji}</Text>
                <View>
                  <Text style={[styles.checkinLabel, done && styles.checkinLabelDone, !windowActive && !done && styles.checkinLabelInactive]}>{info.label}</Text>
                  <Text style={styles.checkinDescription}>
                    {done ? info.description : windowActive ? info.description : windowLabel}
                  </Text>
                </View>
              </View>
              {done ? (
                <View style={styles.doneTag}>
                  <Text style={styles.doneTagText}>✓ +10원</Text>
                </View>
              ) : (
                <Button
                  type="primary"
                  size="medium"
                  disabled={!adLoaded || !windowActive}
                  onPress={() => handleCheckin(type)}
                >
                  참여하기
                </Button>
              )}
            </View>
          );
        })}

        {/* 보너스 버튼 */}
        <TouchableOpacity
          style={[
            styles.bonusButton,
            (!allThreeDone || todayRecord.bonusClaimed || !isWindowActive('bonus')) && styles.bonusButtonDisabled,
          ]}
          onPress={handleBonus}
          activeOpacity={0.7}
          disabled={!allThreeDone || todayRecord.bonusClaimed || !adLoaded || !isWindowActive('bonus')}
        >
          {todayRecord.bonusClaimed ? (
            <Text style={styles.bonusButtonTextDisabled}>✓ 오늘 보너스를 모두 받았어요</Text>
          ) : allThreeDone && isWindowActive('bonus') ? (
            <>
              <Text style={styles.bonusButtonTitle}>🎁 3번 완료 보너스!</Text>
              <Text style={styles.bonusButtonSub}>광고 보고 추가 10원 받기</Text>
            </>
          ) : (
            <>
              <Text style={styles.bonusButtonTitleDisabled}>🎁 3번 완료 보너스 +10원</Text>
              <Text style={styles.bonusButtonSubDisabled}>
                {!allThreeDone
                  ? `${completedCount}/3 완료 — 3번 모두 참여하면 활성화돼요`
                  : CHECKIN_WINDOWS.bonus.label}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Txt typography="c1" color="#B0B8C1" style={styles.guideText}>
          날씨를 확인하고 광고를 시청하면{'\n'}토스포인트를 받을 수 있어요
        </Txt>
      </ScrollView>

      {/* 하단 고정 배너 */}
      <View style={styles.bannerWrap}>
        <InlineAd
          adGroupId={BANNER_AD_ID}
          variant="expanded"
          impressFallbackOnMount
        />
      </View>

      {/* 플로팅 탭 바 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <Text style={[styles.navIcon, styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('/history')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>기록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerDate: {
    marginTop: 2,
  },
  infoButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 22,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F6',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: PRIMARY_LIGHT,
  },
  weatherCity: {
    fontSize: 12,
    color: '#8B95A1',
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherEmoji: {
    fontSize: 40,
    lineHeight: 46,
    width: 46,
    textAlign: 'center',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191F28',
  },
  weatherCondition: {
    fontSize: 13,
    color: '#8B95A1',
    marginTop: 2,
  },
  weatherError: {
    fontSize: 13,
    color: '#8B95A1',
    textAlign: 'center',
    paddingVertical: 8,
  },
  weatherBadges: {
    gap: 4,
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeGreen: {
    backgroundColor: '#F0FDF4',
  },
  badgeText: {
    fontSize: 11,
    color: '#4E5968',
    fontWeight: '500',
  },
  checkinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F2F4F6',
  },
  checkinCardDone: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  checkinCardInactive: {
    opacity: 0.5,
  },
  checkinLabelInactive: {
    color: '#8B95A1',
  },
  checkinCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkinEmoji: {
    fontSize: 32,
    lineHeight: 38,
    width: 38,
    textAlign: 'center',
  },
  checkinLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191F28',
    marginBottom: 3,
  },
  checkinLabelDone: {
    color: PRIMARY_DARK,
  },
  checkinDescription: {
    fontSize: 12,
    color: '#8B95A1',
  },
  doneTag: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bonusButton: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  bonusButtonDisabled: {
    backgroundColor: '#F2F4F6',
  },
  bonusButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bonusButtonTitleDisabled: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B95A1',
  },
  bonusButtonTextDisabled: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B95A1',
  },
  bonusButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  bonusButtonSubDisabled: {
    fontSize: 12,
    color: '#8B95A1',
  },
  guideText: {
    textAlign: 'center',
    lineHeight: 19,
    paddingVertical: 8,
  },
  bannerWrap: {
    width: '100%',
    height: 96,
    overflow: 'hidden',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  navIcon: {
    fontSize: 22,
    lineHeight: 26,
    opacity: 0.4,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    color: '#8B95A1',
  },
  navLabelActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
});
