import { ScheduleEvent } from '../types';

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const getNextDayOfWeek = (dayName: string): Date => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDay = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  // Use the current week's day, even if it's in the past.
  const date = new Date(now);
  date.setDate(now.getDate() + diff);
  return date;
};

export const generateICS = (events: ScheduleEvent[]): string => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//College Container//UniMate//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    const now = new Date();
    let startDate: Date;
    let rrule = '';

    if (event.date) {
      // Specific date
      startDate = new Date(`${event.date}T${event.startTime}:00`);
    } else if (event.dayOfWeek) {
      // Recurring weekly
      startDate = getNextDayOfWeek(event.dayOfWeek);
      const [hours, minutes] = event.startTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${event.dayOfWeek.substring(0, 2).toUpperCase()}`;
    } else {
      return; // Skip if no date or dayOfWeek
    }

    const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${event.id}@unimate.app`);
    icsContent.push(`DTSTAMP:${formatICSDate(now)}`);
    icsContent.push(`DTSTART:${formatICSDate(startDate)}`);
    icsContent.push(`DTEND:${formatICSDate(endDate)}`);
    if (rrule) icsContent.push(rrule);
    icsContent.push(`SUMMARY:${event.code ? event.code + ' - ' : ''}${event.title}`);
    if (event.location) icsContent.push(`LOCATION:${event.location}`);
    if (event.description) icsContent.push(`DESCRIPTION:${event.description}`);
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
};

export const downloadICS = (events: ScheduleEvent[], filename = 'schedule.ics') => {
  const icsString = generateICS(events);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
