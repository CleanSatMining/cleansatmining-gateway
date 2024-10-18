import { Site } from "@/types/supabase.extend";
import { getSiteEquipments } from "../equipment/site";
import { calculateElectricityCost, calculateRevenue } from "./simulator";
import BigNumber from "bignumber.js";
import { FeeRates, SimulationResult } from "@/types/Simulator";
import { getContainerActivesDays } from "../equipment/container";

export function calculateSiteDayElectricityCost(
  site: Site,
  day: Date,
  uptime: number
): { usd: number } {
  const { powerWMax } = getSiteEquipments(site, day);
  const electricityPrice =
    site.contract.electricityPrice +
    site.contract.csmPowerTax +
    site.contract.opPowerTax;

  const powerW = new BigNumber(powerWMax).times(uptime).toNumber();

  const electricityCost = calculateElectricityCost(
    powerW,
    24,
    electricityPrice
  );

  return {
    usd: electricityCost,
  };
}

/**
 * calculateSiteGrossIncome
 * @param site
 * @param btcMined
 * @param electricityUsdCost
 * @param btcPrice
 * @param otherIncomesBtc
 * @param otherCostsBtc
 * @returns
 */
export function calculateSiteRevenue(
  site: Site,
  start: Date,
  end: Date,
  btcMined: number,
  electricityUsdCost: number,
  btcPrice: number,
  depreciationDuration: number,
  otherIncomesBtc: number = 0,
  otherCostsBtc: number = 0
): SimulationResult {
  const csmTaxes: FeeRates = {
    taxRate: site.contract.csmTaxRate,
    powerTaxUsd: site.contract.csmPowerTax,
    profitShareRate: site.contract.csmProfitSharing,
  };
  const opTaxes: FeeRates = {
    taxRate: site.contract.opTaxRate,
    powerTaxUsd: site.contract.opPowerTax,
    profitShareRate: site.contract.opProfitSharing,
  };

  const electricityCostBtc = new BigNumber(electricityUsdCost)
    .dividedBy(btcPrice)
    .toNumber();

  const equipementsDepreciationUsd = calculateSiteEquipementsDepreciation(
    site,
    start,
    end,
    depreciationDuration
  );

  const revenue = calculateRevenue(
    btcPrice,
    btcMined,
    electricityCostBtc,
    site.contract.electricityPrice,
    csmTaxes,
    opTaxes,
    equipementsDepreciationUsd,
    otherIncomesBtc,
    otherCostsBtc
  );

  return revenue;
}

export function calculateSiteEquipementsDepreciation(
  site: Site,
  start: Date,
  end: Date,
  depreciationDuration: number
): number {
  if (depreciationDuration < 0) {
    throw new Error("Depreciation duration must be greater than 0");
  } else if (depreciationDuration === 0) {
    return 0;
  }
  const depreciation = site.containers.reduce((acc, container) => {
    const equipementsCost = container.cost;
    const activeDays = getContainerActivesDays(container, start, end);
    const containerDepreciation = new BigNumber(equipementsCost)
      .dividedBy(depreciationDuration)
      .times(new BigNumber(activeDays).dividedBy(365));
    return containerDepreciation.plus(acc);
  }, new BigNumber(0));
  return depreciation.toNumber();
}
