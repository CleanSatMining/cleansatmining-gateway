import { Database } from "@/types/supabase";
import { calculateDaysBetweenDates, convertDateToKey } from "../date";
import {
  DailyFinancialStatement,
  FinancialStatementAmount,
  FinancialFlow,
  FinancialPartnaire,
  FinancialSource,
} from "@/types/FinancialSatement";
import { BigNumber } from "bignumber.js";

function getEmptyDailyFinancialStatement(
  day: Date,
  flow: FinancialFlow,
  partnaire: FinancialPartnaire
): DailyFinancialStatement {
  return {
    day: day,
    uptime: 0,
    hashrateTHs: 0,
    flow: flow,
    partnaire: partnaire,
    amount: { btc: 0, source: FinancialSource.NONE },
    btcPrice: 1,
  };
}

export function getFinancialStatementUptimeWeight(
  financialStatement: Database["public"]["Tables"]["financialStatements"]["Row"],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): { uptimeWeight: number; daysInHistory: number } {
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

  return { uptimeWeight: weight, daysInHistory };
}

export function getFinancialStatementsPeriod(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][]
): {
  start: Date | undefined;
  end: Date | undefined;
} {
  if (financialStatements.length === 0) {
    return { start: undefined, end: undefined };
  }

  const start = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc < new Date(statement.start) ? acc : new Date(statement.start);
    }, new Date())
  );
  const end = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc > new Date(statement.end) ? acc : new Date(statement.end);
    }, start)
  );

  // end date finish at 00:00:00, we need to add one day
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export function convertFinancialStatementInDailyPeriod(
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
    usd: financialStatement.usd,
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

      const financialStatementOfTheDay = {
        day: day,
        uptime: uptime,
        hashrateTHs: hashrateTHs,
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
        btcPrice: financialStatement.btcPrice,
        amount: {
          btc: financialStatement.btc / totalDays,
          usd: financialStatement.usd
            ? financialStatement.usd / totalDays
            : undefined,
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

export function aggregateFinancialStatementsByDay(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][]
): Map<string, DailyFinancialStatement[]> {
  const dailyFinancialStatements: Map<string, DailyFinancialStatement[]> =
    new Map();
  for (const financialStatement of financialStatements) {
    const dailyFinancialStatement = convertFinancialStatementInDailyPeriod(
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
