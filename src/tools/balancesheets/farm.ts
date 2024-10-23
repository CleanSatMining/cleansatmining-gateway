import { DetailedBalanceSheet, BalanceSheet } from "@/types/BalanceSeet";
import { DailyMiningReport } from "@/types/MiningReport";
import { Farm } from "@/types/supabase.extend";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";
import { calculateFarmPowerHistory } from "../equipment/farm";
import {
  calculateBalanceSheet,
  mergeBalanceSheets,
} from "./balancesheet.common";
import { calculateSiteBalanceSheet } from "./site";

export function calculateFarmBalanceSheet(
  farm: Farm,
  miningReports: DailyMiningReport[],
  btcPrice: number
): DetailedBalanceSheet {
  if (miningReports.length === 0) {
    throw new Error("No mining reports found");
  }

  console.log(
    "=> calculateFarmBalanceSheet",
    "miningReports",
    miningReports.length,
    "BySite? " + miningReports[0].bySite !== undefined
  );

  const { start: startDay, end: endDay } =
    getDailyMiningReportsPeriod(miningReports);

  if (!startDay || !endDay) {
    throw new Error(
      "Cannot calculate balance sheet without start and end date"
    );
  }

  const powerHistory = calculateFarmPowerHistory(farm, startDay, endDay);
  console.log("=> powerHistory", JSON.stringify(powerHistory, null, 2));

  let details: BalanceSheet[] = [];
  let sheet: BalanceSheet;

  console.log(
    "=> BALANCE SHEET has mining reports",
    miningReports.length > 0 && miningReports[0].bySite !== undefined
  );
  if (miningReports.length > 0 && miningReports[0].bySite !== undefined) {
    // We have a more precise result by calculating the balance sheet for each site
    const sheets: BalanceSheet[] = [];
    const sheetsDetailsBySite: BalanceSheet[][] = [];

    for (const site of farm.sites) {
      console.log("=> BALANCE SHEET site", site.slug);
      const siteMiningReports = miningReports
        .map((report) => {
          if (report.bySite) {
            const mr = report.bySite[site.slug];
            if (mr === undefined) {
              return undefined;
            }
            const dailyReport: DailyMiningReport = {
              day: report.day,
              ...mr,
            };
            return dailyReport;
          } else {
            return undefined;
          }
        })
        .filter((report) => report !== undefined);

      console.log(
        "=> calculateSiteBalanceSheet for farm " + farm.slug,
        site.slug
      );
      const siteSheet: BalanceSheet = calculateSiteBalanceSheet(
        site,
        siteMiningReports,
        btcPrice,
        startDay,
        endDay
      );

      sheets.push(siteSheet);

      const siteDetails = powerHistory.map((power) => {
        console.log(
          "=> calculateBalanceSheet for detail",
          site.slug,
          power.start
        );
        const balanceSheet = calculateBalanceSheet(
          siteMiningReports.filter(
            (report) =>
              new Date(power.start).getTime() <=
                new Date(report.day).getTime() &&
              new Date(report.day).getTime() < new Date(power.end).getTime()
          ),
          btcPrice,
          power.start,
          power.end
        );

        return balanceSheet;
      });
      sheetsDetailsBySite.push(siteDetails);
    }

    // console.log("=> sites sheets", sheets.length);
    // console.log(
    //   "=> sites sheets detail",
    //   JSON.stringify(sheetsDetailsBySite, null, 2)
    // );

    // merge all site sheets
    console.log(
      "=> §§§§§§§§§§§§§§§§§§§§§§ mergeBalanceSheets",
      sheets.map((s) => s.end)
    );
    sheet = mergeBalanceSheets(sheets);

    const detailsLength = powerHistory.length;

    for (let detailIndex = 0; detailIndex < detailsLength; detailIndex++) {
      // for each detail period from power history, sum the balance sheets of each site
      const periodDetails: BalanceSheet[] = [];

      for (let siteIndex = 0; siteIndex < farm.sites.length; siteIndex++) {
        console.log(
          "=> detail sheets site ",
          "number of site " + sheetsDetailsBySite.length,
          "current " + (siteIndex + 1) + "/" + farm.sites.length
        );

        console.log(
          "=> detail sheets period ",
          "nomber of period " + sheetsDetailsBySite[siteIndex].length,
          "current " +
            (detailIndex + 1) +
            "/" +
            sheetsDetailsBySite.length +
            "(" +
            detailsLength +
            ")"
        );
        // get the balance sheet of each site for the detail period
        periodDetails.push(sheetsDetailsBySite[siteIndex][detailIndex]);
      }
      details.push(mergeBalanceSheets(periodDetails));
    }
  } else {
    sheet = calculateBalanceSheet(miningReports, btcPrice, startDay, endDay);

    details = powerHistory.map((power) => {
      const balanceSheet = calculateBalanceSheet(
        miningReports.filter(
          (report) =>
            new Date(power.start).getTime() <= new Date(report.day).getTime() &&
            new Date(report.day).getTime() < new Date(power.end).getTime()
        ),
        btcPrice
      );

      return balanceSheet;
    });
  }

  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    equipments: sheet.equipments,
    details,
  };
}
