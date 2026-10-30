import { CalendarScreen } from '.';
import type { AppModule } from '../types';

export const calendarModule: AppModule = {
  id: 'calendar',
  title: '日历',
  icon: '📅',
  component: CalendarScreen,
};
