import {
  DailyFinancialStatement,
  FinancialFlow,
  FinancialStatementAmount,
} from "@/types/FinancialSatement";
import { FinancialSource } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import BigNumber from "bignumber.js";
import { calculateDaysBetweenDates, convertDateToKey } from "../date";
import { calculateSitePower } from "../powerhistory/site";
import {
  mapFinancialPartnaireToField,
  getFinancialStatementUptimeWeight,
  getEmptyDailyFinancialStatement,
} from "./financialstatement.commons";

export function aggregateSiteFinancialStatementsByDay(
  site: Site,
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): Map<string, DailyFinancialStatement[]> {
  const dailyFinancialStatements: Map<string, DailyFinancialStatement[]> =
    new Map();
  for (const financialStatement of financialStatements) {
    const dailyFinancialStatement = convertSiteFinancialStatementInDailyPeriod(
      site,
      financialStatement,
      miningHistory
    );
    for (const key of dailyFinancialStatement.keys()) {
      const statements = dailyFinancialStatements.get(key);
      const statement = dailyFinancialStatement.get(key);
      if (dailyFinancialStatements.has(key)) {
        statements?.push(statement!);
      } else {
        dailyFinancialStatements.set(key, [statement!]);
      }
    }
  }
  return dailyFinancialStatements;
}
export function convertSiteFinancialStatementInDailyPeriod(
  site: Site,
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): Map<string, DailyFinancialStatement> {
  //const dailyFinancialStatement: DailyFinancialStatement[] = [];
  const dailyStatementMap: Map<string, DailyFinancialStatement> = new Map();

  // get the flow of the financial statement
  const flow =
    financialStatement.flow === "IN" ? FinancialFlow.IN : FinancialFlow.OUT;

  // get the partenaire of the financial statement
  const partenaire = mapFinancialPartnaireToField(financialStatement);

  // calculate the total number of days in the financial statement
  const totalDays = calculateDaysBetweenDates(
    new Date(financialStatement.start),
    new Date(financialStatement.end)
  );

  // Get the amount of the statement
  const financialStatementAmount: FinancialStatementAmount = {
    btc: financialStatement.btc,
    //usd: financialStatement.fiat,
    source: FinancialSource.STATEMENT,
  };

  // Get the uptime weight of the financial statement
  const { uptimeWeight, daysInHistory } = getFinancialStatementUptimeWeight(
    financialStatement,
    miningHistory
  );

  // Loop through each day of the financial statement
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    // Get the mining history for the day
    const day = new Date(financialStatement.start);
    day.setDate(day.getDate() + dayIndex);
    const dayMiningHistory = miningHistory.filter((history) => {
      const historyDay = new Date(history.day);
      return (
        historyDay.getUTCFullYear() === day.getUTCFullYear() &&
        historyDay.getUTCMonth() === day.getUTCMonth() &&
        historyDay.getUTCDate() === day.getUTCDate()
      );
    });

    const key = convertDateToKey(day);
    const { hashrateTHs: hashrateTHsMax } = calculateSitePower(site, day);

    // Calculate the uptime and the total amount of the statement for the day
    if (dayMiningHistory.length > 0) {
      // Normally, it should have only one occurance of the day and if not the uptime should be the same for all the history of the day
      // Calculate the uptime for the day
      const uptime =
        dayMiningHistory.reduce((acc, history) => acc + history.uptime, 0) /
        dayMiningHistory.length;

      // Calculate the total amount of the statement for the day
      const totalAmount = dayMiningHistory.reduce(
        (acc, history) => {
          acc.btc = new BigNumber(acc.btc)
            .plus(
              new BigNumber(financialStatementAmount.btc)
                .times(history.uptime)
                .dividedBy(uptimeWeight)
            )
            .toNumber();
          acc.usd = financialStatementAmount.usd
            ? new BigNumber(acc.usd)
                .plus(
                  new BigNumber(financialStatementAmount.usd)
                    .times(history.uptime)
                    .dividedBy(uptimeWeight)
                )
                .toNumber()
            : 0;
          acc.source = financialStatementAmount.source;
          return acc;
        },
        { usd: 0, btc: 0, source: FinancialSource.NONE }
      );

      const hashrateTHs = dayMiningHistory.reduce(
        (acc, history) => acc + history.hashrateTHs,
        0
      );

      const financialStatementOfTheDay: DailyFinancialStatement = {
        day: day,
        uptime: uptime,
        hashrateTHs: hashrateTHs,
        hashrateTHsMax: hashrateTHsMax,
        amount: totalAmount,
        flow: flow,
        partnaire: partenaire,
        btcPrice: financialStatement.btcPrice,
      };

      dailyStatementMap.set(key, financialStatementOfTheDay);
    } else if (daysInHistory === 0) {
      // no mining history data for the day : set the uptime to 0.9 and the amount to the total amount divided by the total number of days
      const financialStatementOfTheDay: DailyFinancialStatement = {
        day: day,
        uptime: 0.9,
        hashrateTHs: 0,
        hashrateTHsMax: hashrateTHsMax,
        btcPrice: financialStatement.btcPrice,
        amount: {
          btc: financialStatement.btc / totalDays,
          /*usd: financialStatement.fiat
            ? financialStatement.fiat / totalDays
            : undefined,*/
          source: FinancialSource.STATEMENT,
        },
        flow: flow,
        partnaire: partenaire,
      };
      dailyStatementMap.set(key, financialStatementOfTheDay);
    } else {
      // If there is no mining history for the day, we add an empty financial statement
      dailyStatementMap.set(
        key,
        getEmptyDailyFinancialStatement(day, flow, partenaire)
      );
    }
  }

  return dailyStatementMap;
}
