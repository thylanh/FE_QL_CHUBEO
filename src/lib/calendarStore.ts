export type CalendarEventRecord = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  extendedProps?: {
    calendar: string;
  };
};

const calendarSeedDate = new Date("2026-09-09T00:00:00Z");
const formatDate = (date: Date) => date.toISOString().split("T")[0];
const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const initialEvents: CalendarEventRecord[] = [
  {
    id: "1",
    title: "Hội nghị",
    start: formatDate(calendarSeedDate),
    extendedProps: { calendar: "Danger" },
  },
  {
    id: "2",
    title: "Cuộc họp",
    start: formatDate(addDays(calendarSeedDate, 1)),
    extendedProps: { calendar: "Success" },
  },
  {
    id: "3",
    title: "Hội thảo",
    start: formatDate(addDays(calendarSeedDate, 2)),
    end: formatDate(addDays(calendarSeedDate, 5)),
    extendedProps: { calendar: "Warning" },
  },
];

export const calendarEventStore: CalendarEventRecord[] = [...initialEvents];

export function resetCalendarEvents() {
  calendarEventStore.splice(0, calendarEventStore.length, ...initialEvents.map((event) => ({ ...event })));
}
