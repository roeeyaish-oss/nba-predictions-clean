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

  const now = new Date();
  const nowIL = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Jerusalem",
    })
  );

  if (gameDate) {
    const todayIL = getIsraelToday();
    if (gameDate < todayIL) return true;
    if (gameDate > todayIL) return false;
  }

  const [hours, minutes] = gameTimeIL.split(":").map(Number);
  return nowIL.getHours() > hours || (nowIL.getHours() === hours && nowIL.getMinutes() >= minutes);
}
