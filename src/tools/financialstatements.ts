import { Database } from "@/types/supabase";
import { calculateDaysBetweenDates } from "./date";
import {
  DailyAccounting,
  DailyFinancialStatement,
  FinancialStatementAmount,
  FinancialFlow,
  FinancialPartnaire,
  convertFinancialStatementToAccounting,
  addDailyAccounting,
} from "@/types/FinancialSatement";
import { BigNumber } from "bignumber.js";

export function getFinancialStatementUptimeWeight(
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): number {
  const timestampStart = new Date(financialStatement.start).getTime();
  const timestampEnd = new Date(financialStatement.end).getTime();
  let weight = 0;
  let daysInHistory = 0;
  for (const history of miningHistory) {
    const timestamp = new Date(history.day).getTime();
    if (timestamp >= timestampStart && timestamp <= timestampEnd) {
      weight += history.uptime;
      daysInHistory++;
    }
  }

  const days = calculateDaysBetweenDates(
    new Date(financialStatement.start),
    new Date(financialStatement.end)
  );
  if (daysInHistory !== days) {
    console.warn(
      `The number of days in the financial statement (${days}) does not match the number of days in the mining history (${daysInHistory}) : ${JSON.stringify(
        financialStatement
      )}`
    );
  }

  return weight;
}

export function getMiningHistoryRelatedToFinancialStatement(
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): Database["public"]["Tables"]["mining"]["Row"][] {
  const farm = financialStatement.farmSlug;
  const site = financialStatement.siteSlug;
  const timestampStart = new Date(financialStatement.start).getTime();
  const timestampEnd = new Date(financialStatement.end).getTime();
  const history = miningHistory.filter((history) => {
    const timestamp = new Date(history.day).getTime();
    return (
      timestamp >= timestampStart &&
      timestamp <= timestampEnd &&
      history.farmSlug === farm &&
      history.siteSlug === site
    );
  });

  return history;
}

export function getDailyFinancialStatement(
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): DailyFinancialStatement[] {
  const dailyFinancialStatement: DailyFinancialStatement[] = [];
  const totalDays = calculateDaysBetweenDates(
    new Date(financialStatement.start),
    new Date(financialStatement.end)
  );

  const financialStatementAmount: FinancialStatementAmount = {
    btc: financialStatement.btc,
    usd: financialStatement.usd,
    isFromFinancialStatement: true,
  };

  const uptimeWeight = getFinancialStatementUptimeWeight(
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
        historyDay.getFullYear() === day.getFullYear() &&
        historyDay.getMonth() === day.getMonth() &&
        historyDay.getDate() === day.getDate()
      );
    });

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
          acc.isFromFinancialStatement =
            acc.isFromFinancialStatement ||
            financialStatementAmount.isFromFinancialStatement;
          return acc;
        },
        { usd: 0, btc: 0, isFromFinancialStatement: false }
      );

      dailyFinancialStatement.push({
        day: day,
        uptime: uptime,
        amount: totalAmount,
        flow:
          financialStatement.flow === "IN"
            ? FinancialFlow.IN
            : FinancialFlow.OUT,
        partnaire: mapFinancialPartnaireToField(financialStatement),
      });
    }
  }

  return dailyFinancialStatement;
}

export function getDailyAccounting(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): DailyAccounting[] {
  const dailyAccounting: DailyAccounting[] = [];
  const dailyFinancialStatements: DailyFinancialStatement[] = [];
  const financialStatementMiningHistories = financialStatements.map(
    (financialStatement) => {
      return getMiningHistoryRelatedToFinancialStatement(
        financialStatement,
        miningHistory
      );
    }
  );

  for (
    let FinancialStatementindex = 0;
    FinancialStatementindex < financialStatements.length;
    FinancialStatementindex++
  ) {
    const financialStatement = financialStatements[FinancialStatementindex];
    const miningHistory =
      financialStatementMiningHistories[FinancialStatementindex];

    dailyFinancialStatements.push(
      ...getDailyFinancialStatement(financialStatement, miningHistory)
    );
  }

  for (const dailyFinancialStatement of dailyFinancialStatements) {
    const dailyStatementAcounting = convertFinancialStatementToAccounting(
      dailyFinancialStatement
    );
    // recherche si la date existe déjà
    const index = dailyAccounting.findIndex(
      (accounting) =>
        accounting.day.getTime() === dailyStatementAcounting.day.getTime()
    );

    if (index === -1) {
      dailyAccounting.push(dailyStatementAcounting);
    } else {
      dailyAccounting[index] = addDailyAccounting(
        dailyAccounting[index],
        dailyStatementAcounting
      );
    }
  }

  return dailyAccounting;
}

export function mapFinancialPartnaireToField(
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"]
): FinancialPartnaire {
  const partenaire =
    financialStatement.flow === "OUT"
      ? financialStatement.to
      : financialStatement.from;

  switch (partenaire) {
    case "OPERATOR":
      return FinancialPartnaire.OPERATOR;
    case "CSM SA":
      return FinancialPartnaire.CSM;
    case "ELECTRICITY":
      return FinancialPartnaire.ELECTRICITY;
    case "POOL":
      return FinancialPartnaire.POOL;
    default:
      return FinancialPartnaire.OTHER;
  }
}
