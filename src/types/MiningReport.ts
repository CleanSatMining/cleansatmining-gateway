import { convertToUTCStartOfDay } from "@/tools/date";
import {
  DailyPartnaireFinancialStatement,
  FinancialPartnaire,
  FinancialStatementAmount,
} from "./FinancialSatement";
import { Database } from "./supabase";
import BigNumber from "bignumber.js";

export type MiningReport = {
  uptime: number;
  hashrateTHs: number;
  equipements: MiningEquipment;
} & MiningBalance;

export type MiningEquipment = {
  hashrateTHsMax: number;
  powerWMax: number;
  totalCost: number;
  asics: Miners[];
};

export type Miners = {
  containerId: number;
  units: number;
  manufacturer: string;
  model: string;
  hashrateTHs: number;
  powerW: number;
  cost: number;
};

export type MiningBalance = {
  btcSellPrice: number;
  expenses: {
    electricity: FinancialStatementAmount;
    csm: FinancialStatementAmount;
    operator: FinancialStatementAmount;
    other: FinancialStatementAmount;
    depreciation: FinancialStatementAmount;
  };
  incomes: {
    mining: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
  revenue: {
    gross: FinancialStatementAmount;
    net: FinancialStatementAmount;
  };
};

export type SiteMiningReport = {
  site: string;
} & MiningReport;

export type DailySiteMiningReport = DailyMiningReport & {
  site: string;
};

export type DailyFarmMiningReport = DailyMiningReport & {
  bySite: Record<string, SiteMiningReport>;
};

export type DailyMiningReport = {
  day: Date;
  site?: string;
  bySite?: Record<string, SiteMiningReport>;
} & MiningReport;

export function mapDailyMiningReportToSiteMiningReport(
  report: DailyMiningReport,
  site: string
): DailySiteMiningReport {
  return {
    day: report.day,
    site: site,
    uptime: report.uptime,
    hashrateTHs: report.hashrateTHs,
    btcSellPrice: report.btcSellPrice,
    expenses: {
      electricity: report.expenses.electricity,
      csm: report.expenses.csm,
      operator: report.expenses.operator,
      other: report.expenses.other,
      depreciation: report.expenses.depreciation,
    },
    incomes: {
      mining: report.incomes.mining,
      other: report.incomes.other,
    },
    revenue: report.revenue,
    equipements: report.equipements,
    bySite: report.bySite,
  };
}

export function mapSiteMiningReportToMiningReport(
  report: DailySiteMiningReport
): DailyMiningReport {
  return {
    day: report.day,
    uptime: report.uptime,
    hashrateTHs: report.hashrateTHs,
    btcSellPrice: report.btcSellPrice,
    expenses: {
      electricity: report.expenses.electricity,
      csm: report.expenses.csm,
      operator: report.expenses.operator,
      other: report.expenses.other,
      depreciation: report.expenses.depreciation,
    },
    incomes: {
      mining: report.incomes.mining,
      other: report.incomes.other,
    },
    revenue: report.revenue,
    equipements: report.equipements,
    bySite: report.bySite,
    site: report.site,
  };
}

export function convertDailyFinancialStatementToMiningReport(
  dayStatement: DailyPartnaireFinancialStatement,
  dayEquipements: MiningEquipment
): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(dayStatement.day),
    uptime: dayStatement.uptime,
    hashrateTHs: dayStatement.hashrateTHs,
    btcSellPrice: dayStatement.btcPrice,
    expenses: {
      electricity:
        dayStatement.partnaire === FinancialPartnaire.ELECTRICITY
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      csm:
        dayStatement.partnaire === FinancialPartnaire.CSM
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      operator:
        dayStatement.partnaire === FinancialPartnaire.OPERATOR
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      depreciation: { btc: 0, source: FinancialSource.NONE },
    },
    incomes: {
      mining:
        dayStatement.partnaire === FinancialPartnaire.POOL
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
    },
    revenue: {
      gross: { btc: 0, source: FinancialSource.NONE },
      net: { btc: 0, source: FinancialSource.NONE },
    },
    equipements: dayEquipements,
  };
}

export function convertMiningHistoryToMiningReport(
  miningDay: Database["public"]["Tables"]["mining"]["Row"],
  dayEquipements: MiningEquipment,
  btcPrice?: number,
  electricityCost?: FinancialStatementAmount,
  csmCost?: FinancialStatementAmount,
  operatorCost?: FinancialStatementAmount,
  otherCost?: FinancialStatementAmount,
  otherIncome?: FinancialStatementAmount,
  depreciation?: FinancialStatementAmount
): DailyMiningReport {
  const electricity = electricityCost ?? {
    btc: 0,
    source: FinancialSource.NONE,
  };
  const csm = csmCost ?? { btc: 0, source: FinancialSource.NONE };
  const operator = operatorCost ?? { btc: 0, source: FinancialSource.NONE };
  const otherOut = otherCost ?? { btc: 0, source: FinancialSource.NONE };
  const otherIn = otherIncome ?? { btc: 0, source: FinancialSource.NONE };
  const depreciationCost = depreciation ?? {
    btc: 0,
    source: FinancialSource.NONE,
  };
  return {
    day: convertToUTCStartOfDay(new Date(miningDay.day)),
    uptime: miningDay.uptime,
    hashrateTHs: miningDay.hashrateTHs,
    btcSellPrice: btcPrice ?? 0,
    expenses: {
      electricity: electricity,
      csm: csm,
      operator: operator,
      other: otherOut,
      depreciation: depreciationCost,
    },
    incomes: {
      mining: { btc: miningDay.mined, source: FinancialSource.STATEMENT },
      other: otherIn,
    },
    revenue: {
      gross: {
        btc: new BigNumber(miningDay.mined)
          .plus(otherIn.btc)
          .minus(electricity.btc)
          .minus(csm.btc)
          .minus(operator.btc)
          .minus(otherOut.btc)
          .toNumber(),
        source: FinancialSource.STATEMENT,
      },
      net: {
        btc: new BigNumber(miningDay.mined)
          .plus(otherIn.btc)
          .minus(electricity.btc)
          .minus(csm.btc)
          .minus(operator.btc)
          .minus(otherOut.btc)
          .minus(depreciationCost.btc)
          .toNumber(),
        source: FinancialSource.NONE,
      },
    },
    equipements: dayEquipements,
  };
}
export enum FinancialSource {
  NONE = "none",
  POOL = "pool",
  SIMULATOR = "simulator",
  STATEMENT = "statement",
}

export function isValidFinancialSource(value: string): boolean {
  return Object.values(FinancialSource).includes(value as FinancialSource);
}
