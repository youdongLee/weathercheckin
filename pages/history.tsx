import { InlineAd } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import { Txt } from '@toss/tds-react-native';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useCheckin } from '../stores/CheckinContext';

export const Route = createRoute('/history', {
  component: HistoryPage,
  screenOptions: { headerShown: false },
});

const PRIMARY = '#3B82F6';
const PRIMARY_LIGHT = '#EFF6FF';
const BANNER_AD_ID = 'ait.v2.live.1ecf51d0c0c94f76';

const BADGE_ITEMS = [
  { key: 'morning',      emoji: '🌅', label: '아침' },
  { key: 'afternoon',    emoji: '☀️', label: '점심' },
  { key: 'evening',      emoji: '🌙', label: '저녁' },
  { key: 'bonusClaimed', emoji: '🎁', label: '보너스' },
] as const;

function todayDateStr(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return (
    String(kst.getUTCFullYear()) +
    String(kst.getUTCMonth() + 1).padStart(2, '0') +
    String(kst.getUTCDate()).padStart(2, '0')
  );
}

function formatDate(dateStr: string): string {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const date = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}월 ${d}일 (${days[date.getDay()]})`;
}

function toJsDate(s: string): Date {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

/** 오늘부터 최소 30일 전(또는 가장 오래된 history 날짜) 까지 연속 날짜 배열(최신순) 생성 */
function buildDateRange(history: { date: string }[], today: string): string[] {
  const todayDate = toJsDate(today);

  const defaultStart = new Date(todayDate);
  defaultStart.setDate(defaultStart.getDate() - 29);

  const oldestHistory =
    history.length > 0 ? toJsDate(history[history.length - 1].date) : todayDate;

  const start = oldestHistory < defaultStart ? oldestHistory : defaultStart;
  const result: string[] = [];

  const cur = new Date(start);
  while (cur <= todayDate) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    result.push(`${y}${m}${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  return result.reverse();
}

function HistoryPage() {
  const { history, todayRecord } = useCheckin();

  const today = todayDateStr();

  // 날짜 → record 매핑 (history + 오늘 todayRecord 포함)
  const recordMap = useMemo(() => {
    const map = new Map(history.map(e => [e.date, e.record]));
    const todayHasActivity =
      todayRecord.morning || todayRecord.afternoon ||
      todayRecord.evening || todayRecord.bonusClaimed;
    if (todayHasActivity) {
      map.set(today, todayRecord);
    }
    return map;
  }, [history, todayRecord, today]);

  const dates = useMemo(() => buildDateRange(history, today), [history, today]);

  // 요약 통계
  const totalAllTime = useMemo(() => {
    let total = 0;
    recordMap.forEach(r => { total += r.totalEarned; });
    return total;
  }, [recordMap]);

  const participationDays = recordMap.size;

  // 연속 체크인 일수: 오늘부터 역순으로 체크인 있는 날 연속 카운트
  const streak = useMemo(() => {
    let count = 0;
    const cur = new Date(toJsDate(today));
    while (true) {
      const key =
        String(cur.getFullYear()) +
        String(cur.getMonth() + 1).padStart(2, '0') +
        String(cur.getDate()).padStart(2, '0');
      const r = recordMap.get(key);
      if (!r || r.totalEarned === 0) break;
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [recordMap, today]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Txt typography="t1" color={streak > 0 ? '#FF6B35' : '#D1D6DB'} style={styles.summaryEmoji}>
              🔥
            </Txt>
            <Txt typography="t3" color="#191F28">{streak}일</Txt>
            <Txt typography="c1" color="#8B95A1">연속 체크인</Txt>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Txt typography="t1" color="#191F28" style={styles.summaryEmoji}>📅</Txt>
            <Txt typography="t3" color="#191F28">{participationDays}일</Txt>
            <Txt typography="c1" color="#8B95A1">참여일</Txt>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Txt typography="t1" color="#191F28" style={styles.summaryEmoji}>💰</Txt>
            <Txt typography="t3" color={PRIMARY}>{totalAllTime}원</Txt>
            <Txt typography="c1" color="#8B95A1">총 포인트</Txt>
          </View>
        </View>

        {/* 날짜별 카드 */}
        {dates.map((dateStr, index) => {
          const record = recordMap.get(dateStr);
          const isEmpty = !record;
          const earned = record?.totalEarned ?? 0;
          const isToday = dateStr === today;

          return (
            <React.Fragment key={dateStr}>
              <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    {isToday && <View style={styles.todayDot} />}
                    <Txt typography="t5" color={isEmpty ? '#B0B8C1' : '#191F28'}>
                      {formatDate(dateStr)}
                    </Txt>
                  </View>
                  {isEmpty ? (
                    <Txt typography="c1" color="#D1D6DB">미참여</Txt>
                  ) : (
                    <Txt typography="t5" color={PRIMARY}>+{earned}원</Txt>
                  )}
                </View>

                <View style={styles.checkinRow}>
                  {BADGE_ITEMS.map(({ key, emoji, label }) => {
                    const done = record ? (record[key as keyof typeof record] as boolean) : false;
                    return (
                      <View key={key} style={[styles.checkinBadge, done && styles.checkinBadgeDone]}>
                        <Txt typography="t4" style={done ? undefined : styles.checkinBadgeEmojiDim}>
                          {emoji}
                        </Txt>
                        <Txt
                          typography="c1"
                          color={done ? PRIMARY : '#D1D6DB'}
                          style={done ? styles.checkinBadgeLabelDone : undefined}
                        >
                          {label}
                        </Txt>
                      </View>
                    );
                  })}
                </View>
              </View>

              {(index + 1) % 3 === 0 && (
                <View style={styles.bannerWrap}>
                  <InlineAd adGroupId={BANNER_AD_ID} variant="expanded" impressFallbackOnMount />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
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
    gap: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F2F4F6',
    marginBottom: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryEmoji: {
    lineHeight: 36,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F2F4F6',
    marginVertical: 4,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F4F6',
    gap: 12,
  },
  dayCardToday: {
    borderColor: PRIMARY,
    borderWidth: 1.5,
    backgroundColor: PRIMARY_LIGHT,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  checkinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkinBadge: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 3,
  },
  checkinBadgeDone: {
    backgroundColor: '#DBEAFE',
  },
  checkinBadgeEmojiDim: {
    opacity: 0.25,
  },
  checkinBadgeLabelDone: {
    fontWeight: '600',
  },
  bannerWrap: {
    height: 96,
    overflow: 'hidden',
    borderRadius: 12,
  },
});
