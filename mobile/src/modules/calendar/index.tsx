import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MonthGrid } from './month-grid';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 日历模块主界面:最上方今天日期,中间切换月份,下方月历网格 */
export function CalendarScreen() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.today}>
        今天是 {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日
        {'  '}星期{WEEKDAYS[today.getDay()]}
      </Text>

      <View style={styles.monthSwitcher}>
        <Pressable onPress={goPrevMonth} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {viewYear}年{viewMonth + 1}月
        </Text>
        <Pressable onPress={goNextMonth} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <MonthGrid year={viewYear} month={viewMonth} today={today} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  today: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: '#374151',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 110,
    textAlign: 'center',
  },
});
