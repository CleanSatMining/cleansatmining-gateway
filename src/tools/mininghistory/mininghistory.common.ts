import { Farm } from "@/types/supabase.extend";
import { Database } from "@/types/supabase";
import { calculateDaysBetweenDates, getTodayDate } from "@/tools/date";
import { get } from "http";
import BigNumber from "bignumber.js";

export function filterMiningHistoryWithFinancialStatementPeriod(
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

export function getMiningHistoryPeriod(
  history: Database["public"]["Tables"]["mining"]["Row"][]
): {
  start: Date | undefined;
  end: Date | undefined;
} {
  if (history.length === 0) {
    return { start: undefined, end: undefined };
  }

  const start = new Date(
    history.reduce((acc, statement) => {
      return acc < new Date(statement.day) ? acc : new Date(statement.day);
    }, getTodayDate())
  );
  const end = new Date(
    history.reduce((acc, statement) => {
      return acc > new Date(statement.day) ? acc : new Date(statement.day);
    }, start)
  );

  // end date finish at 00:00:00, we need to add one day
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export function calculateMinedBtc(
  siteMiningHistory: Database["public"]["Tables"]["mining"]["Row"][]
) {
  return siteMiningHistory.reduce((acc, history) => {
    return new BigNumber(acc).plus(history.mined).toNumber();
  }, 0);
}
