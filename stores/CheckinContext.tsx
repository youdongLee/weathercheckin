import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type CheckinType = 'morning' | 'afternoon' | 'evening';

interface DayRecord {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  bonusClaimed: boolean;
  totalEarned: number;
}

interface HistoryEntry {
  date: string;
  record: DayRecord;
}

interface CheckinContextValue {
  todayRecord: DayRecord;
  history: HistoryEntry[];
  totalEarnedToday: number;
  allThreeDone: boolean;
  checkin: (type: CheckinType) => Promise<void>;
  claimBonus: () => Promise<void>;
}

const EMPTY_RECORD: DayRecord = {
  morning: false,
  afternoon: false,
  evening: false,
  bonusClaimed: false,
  totalEarned: 0,
};

const CheckinContext = createContext<CheckinContextValue | null>(null);

function todayKey(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `checkin_${y}${m}${d}`;
}

const HISTORY_KEY = 'checkin_history';

export function CheckinProvider({ children }: { children: React.ReactNode }) {
  const [todayRecord, setTodayRecord] = useState<DayRecord>(EMPTY_RECORD);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      const key = todayKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) setTodayRecord(JSON.parse(stored));

      const hist = await AsyncStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    })();
  }, []);

  const saveRecord = async (record: DayRecord) => {
    const key = todayKey();
    await AsyncStorage.setItem(key, JSON.stringify(record));
    setTodayRecord(record);

    // 히스토리 업데이트
    const dateStr = key.replace('checkin_', '');
    const hist = await AsyncStorage.getItem(HISTORY_KEY);
    const entries: HistoryEntry[] = hist ? JSON.parse(hist) : [];
    const idx = entries.findIndex(e => e.date === dateStr);
    if (idx >= 0) {
      entries[idx].record = record;
    } else {
      entries.unshift({ date: dateStr, record });
    }
    // 최근 90일만 보관
    const trimmed = entries.slice(0, 90);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    setHistory(trimmed);
  };

  const checkin = async (type: CheckinType) => {
    const updated = { ...todayRecord, [type]: true, totalEarned: todayRecord.totalEarned + 3 };
    await saveRecord(updated);
  };

  const claimBonus = async () => {
    const updated = { ...todayRecord, bonusClaimed: true, totalEarned: todayRecord.totalEarned + 3 };
    await saveRecord(updated);
  };

  const allThreeDone = todayRecord.morning && todayRecord.afternoon && todayRecord.evening;

  return (
    <CheckinContext.Provider
      value={{
        todayRecord,
        history,
        totalEarnedToday: todayRecord.totalEarned,
        allThreeDone,
        checkin,
        claimBonus,
      }}
    >
      {children}
    </CheckinContext.Provider>
  );
}

export function useCheckin(): CheckinContextValue {
  const ctx = useContext(CheckinContext);
  if (!ctx) throw new Error('useCheckin must be used within CheckinProvider');
  return ctx;
}
