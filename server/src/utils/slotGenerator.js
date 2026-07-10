export const generateSlots = (date, timeRanges, slotDuration = 5) => {
  const slots = [];
  const slotDate = new Date(date);
  slotDate.setHours(0, 0, 0, 0);

  for (const range of timeRanges) {
    const [startHour, startMin] = range.startTime.split(':').map(Number);
    const [endHour, endMin] = range.endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60);
      const slotStartMin = currentMinutes % 60;
      const slotEndMin = (currentMinutes + slotDuration) % 60;
      const slotEndHour = Math.floor((currentMinutes + slotDuration) / 60);

      const startTime = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`;
      const endTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

      slots.push({
        date: slotDate,
        startTime,
        endTime,
        status: 'available'
      });

      currentMinutes += slotDuration;
    }
  }

  return slots;
};

export const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const isToday = (date) => {
  const today = getTodayDate();
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return today.getTime() === compareDate.getTime();
};

export const resetDailyAttempts = (student) => {
  const today = getTodayDate();
  const lastReset = student.lastResetDate ? new Date(student.lastResetDate) : null;
  
  if (!lastReset || lastReset.getTime() < today.getTime()) {
    student.bookingAttempts = 2;
    student.hasCancelledToday = false;
    student.lastResetDate = today;
  }
  return student;
};