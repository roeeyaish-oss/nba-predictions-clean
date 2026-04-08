export function getIsraelToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getIsraelTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
}

export function isGameStarted(gameTimeIL, gameDate) {
  if (!gameTimeIL) return false;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const p = Object.fromEntries(
    parts.filter((x) => x.type !== "literal").map((x) => [x.type, x.value])
  );

  if (gameDate) {
    const todayIL = getIsraelToday();
    if (gameDate < todayIL) return true;
    if (gameDate > todayIL) return false;
  }

  const nowHour = parseInt(p.hour, 10);
  const nowMinute = parseInt(p.minute, 10);
  const [hours, minutes] = gameTimeIL.split(":").map(Number);
  return nowHour > hours || (nowHour === hours && nowMinute >= minutes);
}
