import { Farm, Site } from "@/types/supabase.extend";
import { Database } from "@/types/supabase";
import { convertDateToMapKey } from "@/tools/date";

export function filterMiningHistoryWithFinancialStatement(
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
  start: Date;
  end: Date;
} {
  const start = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc < new Date(statement.day) ? acc : new Date(statement.day);
    }, new Date())
  );
  const end = new Date(
    financialStatements.reduce((acc, statement) => {
      return acc > new Date(statement.day) ? acc : new Date(statement.day);
    }, start)
  );

  return { start, end };
}
