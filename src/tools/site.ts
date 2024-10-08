import { Site } from "@/types/supabase.extend";
import { calculateDailyGrossIncome } from "@/tools/simulator";
import { Database } from "@/types/supabase";
import { SimulationResult } from "@/types/Simulator";
import { calculateSitePower } from "./powerhistory/site";

export function calculateSiteGrossIncome(
  site: Site,
  miningDay: Database["public"]["Tables"]["mining"]["Row"],
  btcPrice: number,
  dailyElectricityBtcCost?: number
): SimulationResult {
  // check the farm et the site
  const { farmSlug, siteSlug } = miningDay;
  if (farmSlug !== site.farmSlug || siteSlug !== site.slug) {
    throw new Error("The mining day is not related to the site " + site.slug);
  }

  const { watts } = calculateSitePower(site, new Date(miningDay.day));
  return calculateDailyGrossIncome(
    miningDay.mined,
    btcPrice,
    miningDay.uptime,
    watts,
    site.contract.electricityPrice,
    {
      powerTaxUsd: site.contract.csmPowerTax,
      profitShareRate: site.contract.csmProfitSharing,
      taxRate: site.contract.csmTaxRate,
    },
    {
      powerTaxUsd: site.contract.opPowerTax,
      profitShareRate: site.contract.opProfitSharing,
      taxRate: site.contract.opTaxRate,
    },
    dailyElectricityBtcCost
  );
}

export function formatSiteDates(site: Site): Site {
  site.containers.forEach((container) => {
    if (container.start) {
      container.start = new Date(container.start).toISOString();
    }
    if (container.end) {
      container.end = new Date(container.end).toISOString();
    }
  });
  return site;
}
