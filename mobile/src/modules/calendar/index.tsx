import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayTasksPanel } from './day-tasks-panel';
import { MonthGrid } from './month-grid';
import { YearMonthPicker } from './year-month-picker';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 日历模块主界面:最上方今天日期,中间切换月份,下方月历网格;点选日期后网格下方显示当日代办 */
export function CalendarScreen() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [selected, setSelected] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  /** 点击日期:选中;再次点击同一日期取消选中 */
  const handleSelectDay = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day);
    if (selected && selected.getTime() === picked.getTime()) {
      setSelected(null);
    } else {
      setSelected(picked);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.today}>
        今天是 {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日
        {'  '}星期{WEEKDAYS[today.getDay()]}
      </Text>

      <View style={styles.monthSwitcher}>
        <Pressable onPress={goPrevMonth} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => setPickerOpen(!pickerOpen)}
          style={styles.monthTitleButton}
          hitSlop={4}
        >
          <Text style={styles.monthTitle}>
            {viewYear}年{viewMonth + 1}月
          </Text>
          <Text style={styles.dropdownCaret}>{pickerOpen ? '▴' : '▾'}</Text>
        </Pressable>
        <Pressable onPress={goNextMonth} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {pickerOpen && (
        <YearMonthPicker
          year={viewYear}
          month={viewMonth}
          onPick={(y, m) => {
            setViewYear(y);
            setViewMonth(m);
            setPickerOpen(false);
          }}
        />
      )}

      <MonthGrid
        year={viewYear}
        month={viewMonth}
        today={today}
        selected={selected}
        onSelectDay={handleSelectDay}
      />

      {selected && <DayTasksPanel date={selected} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 110,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  dropdownCaret: {
    fontSize: 10,
    color: '#6B7280',
  },
});
