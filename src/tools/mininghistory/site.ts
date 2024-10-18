import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import { convertDateToKey } from "../date";
import BigNumber from "bignumber.js";
import { calculateSiteDayElectricityCost } from "../simulator/site";

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
export function calculateSiteElectricityCost(
  siteMiningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site
) {
  return siteMiningHistory.reduce((acc, history) => {
    return new BigNumber(acc)
      .plus(
        calculateSiteDayElectricityCost(
          site,
          new Date(history.day),
          history.uptime
        ).usd
      )
      .toNumber();
  }, 0);
}
