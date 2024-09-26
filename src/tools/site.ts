import { Site } from "@/types/supabase.extend";
import { BigNumber } from "bignumber.js";
import { calculateDailyGrossIncome } from "@/tools/simulator";
import { Database } from "@/types/supabase";
import { SimulationResult } from "@/types/Simulator";

export function calculateSitePower(
  site: Site,
  day: Date
): { watts: number; hashrateTHs: number } {
  const containers = site.containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      return false;
    }

    const yearStart = new Date(container.start).getUTCFullYear();
    const monthStart = new Date(container.start).getUTCMonth();
    const dayStart = new Date(container.start).getUTCDate();

    //check if the container is active on the day
    const isStarted =
      yearStart <= day.getUTCFullYear() &&
      monthStart <= day.getUTCMonth() &&
      dayStart <= day.getUTCDate();

    let isEnded = false;

    // check if the container is still active
    if (container.end !== null && container.end !== undefined) {
      const yearEnd = new Date(container.end).getUTCFullYear();
      const monthEnd = new Date(container.end).getUTCMonth();
      const dayEnd = new Date(container.end).getUTCDate();

      isEnded =
        yearEnd >= day.getUTCFullYear() &&
        monthEnd >= day.getUTCMonth() &&
        dayEnd >= day.getUTCDate();
    }

    return isStarted && !isEnded;
  });

  // Calculate the electricity power of the site
  const watts = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.powerW)
      );
    }, new BigNumber(0))
    .toNumber();

  // Calculate the hashrate of the site
  const hashrateTHs = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.hashrateTHs)
      );
    }, new BigNumber(0))
    .toNumber();

  return { watts, hashrateTHs };
}

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
