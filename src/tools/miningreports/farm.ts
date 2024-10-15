import {
  DailyFarmMiningReport,
  DailyMiningReport,
  DailySiteMiningReport,
  SiteMiningReport,
} from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Farm } from "@/types/supabase.extend";
import { getTodayDate } from "../date";
import { mergeMiningReports } from "./miningreport";
import { getSiteMiningReportsByDay } from "./site";

export function getFarmDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  farm: Farm,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getTodayDate(),
  withDetails: boolean = false
): DailyFarmMiningReport[] {
  const sitesMiningReportsByDay: Map<string, DailyMiningReport>[] = [];
  const farmStartedAt = farm.sites.reduce((acc, site) => {
    const startedAt = site.started_at
      ? new Date(site.started_at)
      : getTodayDate();
    return acc.getTime() < startedAt.getTime() ? acc : startedAt;
  }, getTodayDate());

  const inputStartDay =
    startDay && startDay.getTime() > farmStartedAt.getTime()
      ? startDay
      : farmStartedAt;

  farm.sites.forEach((site) => {
    const siteMiningReportsByDay = getSiteMiningReportsByDay(
      financialStatements,
      miningHistory,
      site,
      btcPrice,
      inputStartDay,
      endDay,
      withDetails
    );

    sitesMiningReportsByDay.push(siteMiningReportsByDay);
  });

  console.log(
    "=> sitesMiningReportsByDay",
    "withDetails? " + withDetails,
    JSON.stringify(
      sitesMiningReportsByDay[1].get("2023-06-20T00:00:00.000Z"),
      null,
      2
    )
  );

  const miningReportByDay = mergeMiningReports(sitesMiningReportsByDay);

  const dailyMiningReport: DailyMiningReport[] = Array.from(
    miningReportByDay.values()
  );

  const dailyFarmMiningReport: DailyFarmMiningReport[] = dailyMiningReport.map(
    (report) => {
      const bySite: Record<string, SiteMiningReport> = report.bySite
        ? report.bySite
        : {};

      return {
        ...report,
        bySite,
      };
    }
  );

  // sort the daily accounting by date
  const sortedDays = dailyFarmMiningReport.sort((a, b) => {
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
