import { SimulationResult } from "@/types/Simulator";
import { Farm } from "@/types/supabase.extend";
import { calculateSiteRevenue } from "./site";
import { sumRevenue } from "./simulator";

export function calculateFarmRevenue(
  farm: Farm,
  start: Date,
  end: Date,
  btcMined: number,
  electricityUsdCost: number,
  btcPrice: number,
  depreciationDuration: number,
  otherIncomesBtc: number = 0,
  otherCostsBtc: number = 0
): SimulationResult {
  const sitesRevenues = farm.sites.map((site) => {
    return calculateSiteRevenue(
      site,
      start,
      end,
      btcMined,
      electricityUsdCost,
      btcPrice,
      depreciationDuration,
      otherIncomesBtc,
      otherCostsBtc
    );
  });

  return sumRevenue(sitesRevenues);
}
