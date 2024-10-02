import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Farm } from "@/types/supabase.extend";
import { getSiteMiningReportsByDay } from "./site";
import { mergeMiningReports } from "./miningreport";
import { getYesterdayDate } from "./date";

export function getFarmDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  farm: Farm,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getYesterdayDate(23, 59, 59, 999)
): DailyMiningReport[] {
  const sitesMiningReportsByDay: Map<string, DailyMiningReport>[] = [];

  console.log("farm", farm.name);
  console.log("sites", farm.sites.length);
  console.log("financialStatements", financialStatements.length);
  console.log("miningHistory", miningHistory.length);
  console.log("startDay", startDay?.toISOString());
  console.log("endDay", endDay?.toISOString());

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
