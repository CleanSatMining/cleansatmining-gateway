// Fonction pour convertir une date au format 2024-09-18T16:51:34.083188+00:00
export function convertDateToTimestamptzFormat(date: Date): string {
  const isoString = date.toISOString();
  const [datePart, timePart] = isoString.split("T");
  const [time, ms] = timePart.split(".");
  const formattedDate = `${datePart}T${time}.${ms.slice(0, 6)}+00:00`;
  return formattedDate;
}

export function calculateDaysBetweenDates(start: Date, end: Date): number {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Nombre de millisecondes dans un jour
  const startTime = start.getTime();
  const endTime = end.getTime();
  const differenceInMilliseconds = endTime - startTime;
  const differenceInDays = differenceInMilliseconds / oneDayInMilliseconds;
  return Math.round(differenceInDays);
}
