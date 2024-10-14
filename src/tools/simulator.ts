import { FeeRates, SimulationResult } from "../types/Simulator";
import { BigNumber } from "bignumber.js";
export function calculateElectricityCost(
  powerW: number,
  hours: number,
  costPerKwh: number
): number {
  const hoursConsomption = new BigNumber(powerW)
    .dividedBy(1000)
    .times(hours)
    .toNumber();
  const hoursCost = new BigNumber(powerW)
    .dividedBy(1000)
    .times(hours)
    .times(costPerKwh)
    .toNumber();

  return hoursCost;
}

export function calculateDailyGrossIncome(
  btcMined: number,
  btcPrice: number,
  uptime: number,
  powerW: number,
  costPerKwh: number,
  csmTaxes: FeeRates,
  opTaxes: FeeRates,
  dailyElectricityBtcCost?: number,
  otherIncome?: number
): SimulationResult {
  const costPerKwhwithTaxes =
    costPerKwh + csmTaxes.powerTaxUsd + opTaxes.powerTaxUsd;
  const electricityCostUsd = new BigNumber(
    calculateElectricityCost(powerW, 24, costPerKwhwithTaxes)
  ).times(uptime);
  const electricityCostBtc = electricityCostUsd.dividedBy(btcPrice).toNumber();

  // income after electricity
  const simulation = calculateGrossIncome(
    btcMined,
    dailyElectricityBtcCost ?? electricityCostBtc,
    costPerKwh,
    csmTaxes,
    opTaxes,
    btcPrice,
    otherIncome
  );

  return simulation;
}

export function calculateGrossIncome(
  btcMined: number,
  electricityCostBtc: number,
  costPerKwh: number,
  csmTaxes: FeeRates,
  opTaxes: FeeRates,
  btcPrice: number,
  otherIncome: number = 0
): SimulationResult {
  const incomeAfterElectricity = new BigNumber(btcMined)
    .minus(electricityCostBtc)
    .plus(otherIncome);

  const csmTaxesAmount = incomeAfterElectricity.times(csmTaxes.taxRate);
  const opTaxesAmount = incomeAfterElectricity.times(opTaxes.taxRate);
  // income after taxes
  const incomeAfterTaxes = incomeAfterElectricity.minus(
    csmTaxesAmount.plus(opTaxesAmount)
  );

  const csmProfitSharing = incomeAfterTaxes.times(csmTaxes.profitShareRate);
  const opProfitSharing = incomeAfterTaxes.times(opTaxes.profitShareRate);

  // income after profit sharing
  const incomeAfterProfitSharing = incomeAfterTaxes.minus(
    csmProfitSharing.plus(opProfitSharing)
  );

  const csmElectricityCost = new BigNumber(electricityCostBtc)
    .times(csmTaxes.powerTaxUsd)
    .dividedBy(csmTaxes.powerTaxUsd + opTaxes.powerTaxUsd + costPerKwh);
  const opElectricityCost = new BigNumber(electricityCostBtc)
    .times(opTaxes.powerTaxUsd)
    .dividedBy(csmTaxes.powerTaxUsd + opTaxes.powerTaxUsd + costPerKwh);
  const providerElectricityCost = new BigNumber(electricityCostBtc)
    .times(costPerKwh)
    .dividedBy(csmTaxes.powerTaxUsd + opTaxes.powerTaxUsd + costPerKwh);
  const csmTax = csmTaxesAmount.plus(csmProfitSharing);
  const opTax = opTaxesAmount.plus(opProfitSharing);

  const simulationResult: SimulationResult = {
    cost: {
      electricity: {
        csmFee: {
          btc: csmElectricityCost.toNumber(),
          usd: csmElectricityCost.times(btcPrice).toNumber(),
        },
        operatorFee: {
          btc: opElectricityCost.toNumber(),
          usd: opElectricityCost.times(btcPrice).toNumber(),
        },
        providerFee: {
          btc: providerElectricityCost.toNumber(),
          usd: providerElectricityCost.times(btcPrice).toNumber(),
        },
        total: {
          btc: electricityCostBtc,
          usd: new BigNumber(electricityCostBtc).times(btcPrice).toNumber(),
        },
      },
      csm: {
        btc: csmTax.toNumber(),
        usd: csmTax.times(btcPrice).toNumber(),
      },
      operator: {
        btc: opTax.toNumber(),
        usd: opTax.times(btcPrice).toNumber(),
      },
    },
    income: {
      btc: incomeAfterProfitSharing.toNumber(),
      usd: incomeAfterProfitSharing.times(btcPrice).toNumber(),
    },
  };

  return simulationResult;
}
