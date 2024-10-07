import { Farm, Site } from "@/types/supabase.extend";
import { Database } from "@/types/supabase";
import { convertDateToMapKey, getTodayDate } from "@/tools/date";
import { get } from "http";

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

export function getMiningHistoryByDay(
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site
): Map<string, Database["public"]["Tables"]["mining"]["Row"]> {
  const historyByDay: Map<
    string,
    Database["public"]["Tables"]["mining"]["Row"]
  > = new Map();
  for (const history of miningHistory) {
    if (history.farmSlug === site.farmSlug && history.siteSlug === site.slug) {
      historyByDay.set(convertDateToMapKey(new Date(history.day)), history);
    }
  }

  return historyByDay;
}

export function getMiningHistoryPeriod(
  financialStatements: Database["public"]["Tables"]["mining"]["Row"][]
): {
  start: Date | undefined;
  end: Date | undefined;
} {
  if (financialStatements.length === 0) {
    return { start: undefined, end: undefined };
  }

  const start = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc < new Date(statement.day) ? acc : new Date(statement.day);
    }, getTodayDate())
  );
  const end = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc > new Date(statement.day) ? acc : new Date(statement.day);
    }, start)
  );

  // end date finish at 00:00:00, we need to add one day
  end.setDate(end.getDate() + 1);

  return { start, end };
}
