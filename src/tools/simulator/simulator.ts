import { FeeRates, SimulationResult } from "../../types/Simulator";
import { BigNumber } from "bignumber.js";
export function calculateElectricityCost(
  powerW: number,
  hours: number,
  costPerKwh: number
): number {
  const hoursCost = new BigNumber(powerW)
    .dividedBy(1000)
    .times(hours)
    .times(costPerKwh)
    .toNumber();

  return hoursCost;
}

export function calculate24hRevenue(
  btcPrice: number,
  btcMined: number,
  uptime: number,
  powerW: number,
  costPerKwh: number,
  csmTaxes: FeeRates,
  opTaxes: FeeRates,
  equipementsDepreciationUsd: number,
  electricity24hBtcCost?: number,
  otherIncomesBtc: number = 0,
  otherCostsBtc: number = 0
): SimulationResult {
  const costPerKwhwithTaxes =
    costPerKwh + csmTaxes.powerTaxUsd + opTaxes.powerTaxUsd;
  const electricityCostUsd = new BigNumber(
    calculateElectricityCost(powerW, 24, costPerKwhwithTaxes)
  ).times(uptime);
  const electricityCostBtc = electricityCostUsd.dividedBy(btcPrice).toNumber();

  // income after electricity
  const simulation = calculateRevenue(
    btcPrice,
    btcMined,
    electricity24hBtcCost ?? electricityCostBtc,
    costPerKwh,
    csmTaxes,
    opTaxes,

    equipementsDepreciationUsd,
    otherIncomesBtc,
    otherCostsBtc
  );

  return simulation;
}

export function calculateRevenue(
  btcPrice: number,
  btcMined: number,
  electricityCostBtc: number,
  costPerKwh: number,
  csmTaxes: FeeRates,
  opTaxes: FeeRates,
  equipementsDepreciationUsd: number,
  otherIncomesBtc: number = 0,
  otherCostsBtc: number = 0
): SimulationResult {
  const incomeAfterElectricity = new BigNumber(btcMined)
    .minus(electricityCostBtc)
    .plus(otherIncomesBtc)
    .minus(otherCostsBtc);

  const csmTaxesAmount = incomeAfterElectricity.times(csmTaxes.taxRate);
  const opTaxesAmount = incomeAfterElectricity.times(opTaxes.taxRate);
  // income after taxes
  const incomeAfterTaxes = incomeAfterElectricity.minus(
    csmTaxesAmount.plus(opTaxesAmount)
  );

  const csmProfitSharing = incomeAfterTaxes.times(csmTaxes.profitShareRate);
  const opProfitSharing = incomeAfterTaxes.times(opTaxes.profitShareRate);

  // income after profit sharing
  const incomeAfterProfitSharingBtc = incomeAfterTaxes.minus(
    csmProfitSharing.plus(opProfitSharing)
  );
  const incomeAfterProfitSharingUsd =
    incomeAfterProfitSharingBtc.times(btcPrice);

  // retrieve electricity costs
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

  // income after depreciation of equipment
  const incomeAfterDepreciationUsd = incomeAfterProfitSharingUsd.minus(
    equipementsDepreciationUsd
  );
  const incomeAfterDepreciationBtc =
    incomeAfterDepreciationUsd.dividedBy(btcPrice);

  const simulationResult: SimulationResult = {
    btcSellPrice: btcPrice,
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
      depreciation: {
        equipment: {
          btc: new BigNumber(equipementsDepreciationUsd)
            .dividedBy(btcPrice)
            .toNumber(),
          usd: equipementsDepreciationUsd,
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
      other: {
        btc: otherCostsBtc,
        usd: new BigNumber(otherCostsBtc).times(btcPrice).toNumber(),
      },
    },
    income: {
      mining: {
        btc: btcMined,
        usd: new BigNumber(btcMined).times(btcPrice).toNumber(),
      },
      other: {
        btc: otherIncomesBtc,
        usd: new BigNumber(otherIncomesBtc).times(btcPrice).toNumber(),
      },
    },
    revenue: {
      gross: {
        btc: incomeAfterProfitSharingBtc.toNumber(),
        usd: incomeAfterProfitSharingUsd.toNumber(),
      },
      net: {
        btc: incomeAfterDepreciationBtc.toNumber(),
        usd: incomeAfterDepreciationUsd.toNumber(),
      },
    },
  };

  return simulationResult;
}

export function sumRevenue(revenues: SimulationResult[]): SimulationResult {
  // sum all revenues

  const totalRevenue = revenues.reduce((acc, revenue) => {
    acc.btcSellPrice = revenue.btcSellPrice;
    acc.cost.electricity.csmFee.btc = new BigNumber(
      revenue.cost.electricity.csmFee.btc
    )
      .plus(acc.cost.electricity.csmFee.btc)
      .toNumber();
    acc.cost.electricity.csmFee.usd = new BigNumber(
      revenue.cost.electricity.csmFee.usd
    )
      .plus(acc.cost.electricity.csmFee.usd)
      .toNumber();
    acc.cost.electricity.operatorFee.btc = new BigNumber(
      revenue.cost.electricity.operatorFee.btc
    )
      .plus(acc.cost.electricity.operatorFee.btc)
      .toNumber();

    acc.cost.electricity.operatorFee.usd = new BigNumber(
      revenue.cost.electricity.operatorFee.usd
    )
      .plus(acc.cost.electricity.operatorFee.usd)
      .toNumber();
    acc.cost.electricity.providerFee.btc = new BigNumber(
      revenue.cost.electricity.providerFee.btc
    )
      .plus(acc.cost.electricity.providerFee.btc)
      .toNumber();
    acc.cost.electricity.providerFee.usd = new BigNumber(
      revenue.cost.electricity.providerFee.usd
    )
      .plus(acc.cost.electricity.providerFee.usd)
      .toNumber();
    acc.cost.electricity.total.btc = new BigNumber(
      revenue.cost.electricity.total.btc
    )
      .plus(acc.cost.electricity.total.btc)
      .toNumber();
    acc.cost.electricity.total.usd = new BigNumber(
      revenue.cost.electricity.total.usd
    )
      .plus(acc.cost.electricity.total.usd)
      .toNumber();
    acc.cost.depreciation.equipment.btc = new BigNumber(
      revenue.cost.depreciation.equipment.btc
    )
      .plus(acc.cost.depreciation.equipment.btc)
      .toNumber();
    acc.cost.depreciation.equipment.usd = new BigNumber(
      revenue.cost.depreciation.equipment.usd
    )
      .plus(acc.cost.depreciation.equipment.usd)
      .toNumber();
    acc.cost.csm.btc = new BigNumber(revenue.cost.csm.btc)
      .plus(acc.cost.csm.btc)
      .toNumber();
    acc.cost.csm.usd = new BigNumber(revenue.cost.csm.usd)
      .plus(acc.cost.csm.usd)
      .toNumber();
    acc.cost.operator.btc = new BigNumber(revenue.cost.operator.btc)
      .plus(acc.cost.operator.btc)
      .toNumber();
    acc.cost.operator.usd = new BigNumber(revenue.cost.operator.usd)
      .plus(acc.cost.operator.usd)
      .toNumber();
    acc.cost.other.btc = new BigNumber(revenue.cost.other.btc)
      .plus(acc.cost.other.btc)
      .toNumber();
    acc.cost.other.usd = new BigNumber(revenue.cost.other.usd)
      .plus(acc.cost.other.usd)
      .toNumber();
    acc.income.mining.btc = new BigNumber(revenue.income.mining.btc)
      .plus(acc.income.mining.btc)
      .toNumber();
    acc.income.mining.usd = new BigNumber(revenue.income.mining.usd)
      .plus(acc.income.mining.usd)
      .toNumber();
    acc.income.other.btc = new BigNumber(revenue.income.other.btc)
      .plus(acc.income.other.btc)
      .toNumber();
    acc.income.other.usd = new BigNumber(revenue.income.other.usd)
      .plus(acc.income.other.usd)
      .toNumber();
    acc.revenue.gross.btc = new BigNumber(revenue.revenue.gross.btc)
      .plus(acc.revenue.gross.btc)
      .toNumber();
    acc.revenue.gross.usd = new BigNumber(revenue.revenue.gross.usd)
      .plus(acc.revenue.gross.usd)
      .toNumber();
    acc.revenue.net.btc = new BigNumber(revenue.revenue.net.btc)
      .plus(acc.revenue.net.btc)
      .toNumber();
    acc.revenue.net.usd = new BigNumber(revenue.revenue.net.usd)
      .plus(acc.revenue.net.usd)
      .toNumber();
    return acc;
  }, createEmptyRevenue());

  return totalRevenue;
}

function createEmptyRevenue(): SimulationResult {
  return {
    btcSellPrice: 1,
    cost: {
      electricity: {
        csmFee: {
          btc: 0,
          usd: 0,
        },
        operatorFee: {
          btc: 0,
          usd: 0,
        },
        providerFee: {
          btc: 0,
          usd: 0,
        },
        total: {
          btc: 0,
          usd: 0,
        },
      },
      depreciation: {
        equipment: {
          btc: 0,
          usd: 0,
        },
      },
      csm: {
        btc: 0,
        usd: 0,
      },
      operator: {
        btc: 0,
        usd: 0,
      },
      other: {
        btc: 0,
        usd: 0,
      },
    },
    income: {
      mining: {
        btc: 0,
        usd: 0,
      },
      other: {
        btc: 0,
        usd: 0,
      },
    },
    revenue: {
      gross: {
        btc: 0,
        usd: 0,
      },
      net: {
        btc: 0,
        usd: 0,
      },
    },
  };
}
