import React, { useMemo } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: '09', minute: '00', period: 'AM' };
  let hour = Number(match[1]);
  const period = (match[3] || (hour >= 12 ? 'PM' : 'AM')).toUpperCase();
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return { hour: String(hour).padStart(2, '0'), minute: match[2], period };
}

export default function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const update = (part: 'hour' | 'minute' | 'period', next: string) => {
    const nextTime = { ...parsed, [part]: next };
    onChange(`${nextTime.hour}:${nextTime.minute} ${nextTime.period}`);
  };

  const selectClass = `form-input !mt-0 !w-auto min-w-0 flex-1 !px-3 ${className}`;
  return (
    <div className="flex items-center gap-1.5">
      <select aria-label="Hour" value={parsed.hour} onChange={event => update('hour', event.target.value)} className={selectClass}>{hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}</select>
      <span className="text-lg font-black text-on-surface-variant">:</span>
      <select aria-label="Minute" value={parsed.minute} onChange={event => update('minute', event.target.value)} className={selectClass}>{minutes.map(minute => <option key={minute} value={minute}>{minute}</option>)}</select>
      <select aria-label="AM or PM" value={parsed.period} onChange={event => update('period', event.target.value)} className={`${selectClass} !font-black`}><option value="AM">AM</option><option value="PM">PM</option></select>
    </div>
  );
}
