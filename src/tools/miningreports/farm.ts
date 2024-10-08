import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Farm } from "@/types/supabase.extend";
import { getYesterdayDate } from "../date";
import { mergeMiningReports } from "./miningreport";
import { getSiteMiningReportsByDay } from "./site";

export function getFarmDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  farm: Farm,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getYesterdayDate(23, 59, 59, 999)
): DailyMiningReport[] {
  const sitesMiningReportsByDay: Map<string, DailyMiningReport>[] = [];

  farm.sites.forEach((site) => {
    const siteMiningReportsByDay = getSiteMiningReportsByDay(
      financialStatements,
      miningHistory,
      site,
      btcPrice,
      startDay,
      endDay
    );

    sitesMiningReportsByDay.push(siteMiningReportsByDay);
  });

  const miningReportByDay = mergeMiningReports(sitesMiningReportsByDay);

  const dailyMiningReport: DailyMiningReport[] = Array.from(
    miningReportByDay.values()
  );

  // sort the daily accounting by date
  const sortedDays = dailyMiningReport.sort((a, b) => {
    const dateA = new Date(a.day);
    const dateB = new Date(b.day);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedDays.filter((report) => {
    return (
      (startDay === undefined || report.day >= startDay) && report.day <= endDay
    );
  });
}
