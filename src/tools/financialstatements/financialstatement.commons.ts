import { Database } from "@/types/supabase";
import { calculateDaysBetweenDates } from "../date";
import {
  DailyPartnaireFinancialStatement,
  FinancialFlow,
  FinancialPartnaire,
} from "@/types/FinancialSatement";
import { FinancialSource } from "@/types/MiningReport";

export function getEmptyDailyFinancialStatement(
  day: Date,
  flow: FinancialFlow,
  partnaire: FinancialPartnaire
): DailyPartnaireFinancialStatement {
  return {
    day: day,
    uptime: 0,
    hashrateTHs: 0,
    hashrateTHsMax: 0,
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
  for (const mining of miningHistory) {
    const timestampMiningDay = new Date(mining.day).getTime();
    if (
      timestampMiningDay >= timestampStart &&
      timestampMiningDay < timestampEnd
    ) {
      //console.log("mining.uptime", mining.day);
      weight += mining.uptime;
      daysInHistory++;
    }
  }

  const days = calculateDaysBetweenDates(
    new Date(financialStatement.start),
    new Date(financialStatement.end)
  );
  if (daysInHistory !== days) {
    console.warn("");
    console.warn(
      `The number of days in the financial statement (${days}) does not match the number of days in the mining history (${daysInHistory}/${
        miningHistory.length
      }) weight is ${weight} : ${JSON.stringify(financialStatement, null, 2)}`
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
