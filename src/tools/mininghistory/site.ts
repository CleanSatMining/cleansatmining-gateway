import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import { convertDateToKey } from "../date";

export function getSiteMiningHistoryByDay(
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site
): Map<string, Database["public"]["Tables"]["mining"]["Row"]> {
  const historyByDay: Map<
    string,
    Database["public"]["Tables"]["mining"]["Row"]
  > = new Map();
  for (const history of miningHistory) {
    if (history.farmSlug === site.farmSlug && history.siteSlug === site.slug) {
      historyByDay.set(convertDateToKey(new Date(history.day)), history);
    }
  }

  return historyByDay;
}
