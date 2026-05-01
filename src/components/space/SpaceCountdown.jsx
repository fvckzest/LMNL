import { useEffect, useState } from 'react';

function getTimeLeft(target) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return { days, hours, minutes, seconds };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function TimeUnit({ value, label }) {
  return (
    <div className="space-time-unit">
      <div className="space-time-value">{value}</div>
      <div className="space-time-label">{label}</div>
    </div>
  );
}

export default function SpaceCountdown({ eventDate, eventTime }) {
  const targetStr = (eventDate && eventTime)
    ? `${eventDate}T${eventTime}`
    : '2026-07-03T18:00:00';

  const [time, setTime] = useState(() => getTimeLeft(new Date(targetStr)));

  useEffect(() => {
    const target = new Date(targetStr);
    const interval = setInterval(() => {
      setTime(getTimeLeft(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetStr]);

  return (
    <div className="space-timer-container">
      <p className="space-timer-label">countdown</p>
      <div className="space-timer-grid">
        <TimeUnit value={pad(time.days)} label="days" />
        <TimeUnit value={pad(time.hours)} label="hours" />
        <TimeUnit value={pad(time.minutes)} label="mins" />
        <TimeUnit value={pad(time.seconds)} label="secs" />
      </div>
    </div>
  );
}
