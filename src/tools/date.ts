// Fonction pour convertir une date au format 2024-09-18T16:51:34.083188+00:00
export function convertDateToTimestamptzFormat(date: Date): string {
  let isoString = "";
  try {
    isoString = date.toISOString();
  } catch (e) {
    console.error(e);
    isoString = date.toString();
  }

  const [datePart, timePart] = isoString.split("T");
  const [time, ms] = timePart.split(".");
  const formattedDate = `${datePart}T${time}.${ms.slice(0, 6)}`;
  return formattedDate;
}

// Fonction pour calculer le nombre de jours entre deux dates en supposant que les dates sont des jours entiers
// start : AAAA-MM-JJ 00:00:00.000
// end : AAAA-MM-JJ 23:59:59.999
export function calculateFullDaysBetweenDates(start: Date, end: Date): number {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Nombre de millisecondes dans un jour
  const startTime = convertToUTCStartOfDay(start).getTime();
  const endTime = convertToUTCStartOfDay(end).getTime();
  const differenceInMilliseconds = endTime - startTime;
  const differenceInDays = differenceInMilliseconds / oneDayInMilliseconds;
  return Math.round(differenceInDays) + 1;
}

export function calculateDaysBetweenDates(start: Date, end: Date): number {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Nombre de millisecondes dans un jour
  const startTime = convertToUTCStartOfDay(start).getTime();
  const endTime = convertToUTCStartOfDay(end).getTime();
  const differenceInMilliseconds = endTime - startTime;
  const differenceInDays = differenceInMilliseconds / oneDayInMilliseconds;
  return Math.round(differenceInDays);
}

// Fonction pour convertir une date en UTC avec l'heure réglée à 00:00
export function convertToUTCStartOfDay(_date: Date): Date {
  const date = new Date(_date);
  //const date = new Date(dateString);
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();

  const utcStartOfDay = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0));
  //return utcStartOfDay.toISOString();
  return utcStartOfDay;
}

export function convertDateToKey(date: Date): string {
  return convertToUTCStartOfDay(date).toISOString();
}

export function getYesterdayDate(
  hours: number = 0,
  min: number = 0,
  sec: number = 0,
  ms: number = 0
): Date {
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - 1);

  // Remettre l'heure à 00:00:00.000 pour obtenir le début de la journée en UTC
  today.setUTCHours(hours, min, sec, ms);

  return today;
}

export function getTodayDate(
  hours: number = 0,
  min: number = 0,
  sec: number = 0,
  ms: number = 0
): Date {
  const today = new Date();

  // Remettre l'heure à 00:00:00.000 pour obtenir le début de la journée en UTC
  today.setUTCHours(hours, min, sec, ms);

  return today;
}

export function getNDaysAgo(N: number): Date {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - N);

  // Réinitialiser l'heure à 00:00:00.000
  targetDate.setUTCHours(0, 0, 0, 0);

  // Retourner le timestamp
  return targetDate;
}
