// GET /api/ics?t=<title>&c=<course>&d=<ISO due date>&id=<milestone id>&l=<submit link>
// Answers with a one-event calendar file. On an iPhone, opening this link shows the
// system "Add to Calendar" sheet; on a computer it downloads a .ics file.
// Nothing is stored: the event is built only from the query string.

const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// calendar lines must be at most 75 bytes; longer ones continue on the next line after a space
const fold = (line) => {
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
};

export default function handler(req, res) {
  const q = req.query || {};
  const due = new Date(clip(q.d, 40));
  const title = clip(q.t, 120);
  if (!title || Number.isNaN(due.getTime())) {
    res.status(400).setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send('Missing or invalid deadline.');
  }
  const course = clip(q.c, 120);
  const id = clip(q.id, 64).replace(/[^A-Za-z0-9-]/g, '') || stamp(due);
  const link = /^https:\/\/[^\s]+$/i.test(clip(q.l, 500)) ? clip(q.l, 500) : '';

  const start = new Date(due.getTime() - 30 * 60 * 1000); // a 30 minute block that ends at the deadline
  const summary = course ? `${title} due · ${course}` : `${title} due`;
  const description = ['Deadline from UniMate.', link ? `Submit: ${link}` : ''].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UniMate//Project deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@unimate`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(due)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    ...(link ? [`URL:${link}`] : []),
    // reminders: 1 day and 2 hours before the deadline (counted from the start, 30 min earlier)
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, 'TRIGGER:-PT23H30M', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, 'TRIGGER:-PT1H30M', 'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const file = (title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deadline').slice(0, 40);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${file}.ics"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(lines.map(fold).join('\r\n') + '\r\n');
}
