export const formatTime = (time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const getTimeDifference = (targetTime) => {
  const now = new Date();
  const [hours, targetMinutes] = targetTime.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, targetMinutes, 0, 0);

  if (target <= now) {
    return { expired: true, minutes: 0, seconds: 0 };
  }

  const diff = target - now;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { expired: false, minutes, seconds };
};

export const isSlotActive = (startTime, endTime) => {
  const now = new Date();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const start = new Date();
  start.setHours(startH, startM, 0, 0);
  
  const end = new Date();
  end.setHours(endH, endM, 0, 0);

  return now >= start && now < end;
};

export const getTodayDateString = () => {
  const today = new Date();
  return today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};