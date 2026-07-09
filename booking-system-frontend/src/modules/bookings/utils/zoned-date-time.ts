export function buildZonedDateTimeToIso(
  date: string,
  time: string,
  timeZone: string,
): string | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offsetAt = (timestamp: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return (
      Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
      ) - timestamp
    );
  };

  const firstOffset = offsetAt(utcGuess);
  let timestamp = utcGuess - firstOffset;
  const correctedOffset = offsetAt(timestamp);
  if (correctedOffset !== firstOffset) timestamp = utcGuess - correctedOffset;
  return new Date(timestamp).toISOString();
}
