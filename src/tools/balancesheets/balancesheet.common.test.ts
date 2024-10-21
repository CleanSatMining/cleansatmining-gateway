import { FinancialSource } from "@/types/MiningReport";

import BigNumber from "bignumber.js";
import { calculateDaysBetweenDates } from "../date";
import { DailyMiningReport } from "@/types/MiningReport";
import { calculateBalanceSheet } from "./balancesheet.common";

// Exemple de données de test
const data: DailyMiningReport[] = [
  {
    day: new Date("2023-01-01"),
    hashrateTHs: 105,
    btcSellPrice: 45000,
    uptime: 0.96,
    equipements: {
      totalCost: 30000,
      hashrateTHsMax: 100,
      powerWMax: 1000,
      asics: [
        {
          containerId: 1,
          hashrateTHs: 100,
          powerW: 1000,
          cost: 30000,
          manufacturer: "Bitmain",
          model: "S19",
          units: 100,
        },
      ],
    },
    revenue: {
      gross: {
        btc: 0.65,
        usd: 30000,
        source: FinancialSource.NONE,
      },
      net: {
        btc: 0.65,
        usd: 30000,
        source: FinancialSource.NONE,
      },
    },
    expenses: {
      depreciation: { btc: 0.01, source: FinancialSource.NONE },
      electricity: { btc: 0.12, source: FinancialSource.NONE },
      csm: { btc: 0.06, source: FinancialSource.NONE },
      operator: { btc: 0.03, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
    incomes: {
      mining: { btc: 0.55, source: FinancialSource.NONE },
      other: { btc: 0.15, source: FinancialSource.NONE },
    },
  },
  {
    day: new Date("2023-01-02"),
    hashrateTHs: 105,
    btcSellPrice: 45000,
    uptime: 0.96,
    equipements: {
      totalCost: 30000,
      hashrateTHsMax: 100,
      powerWMax: 1000,
      asics: [
        {
          containerId: 1,
          hashrateTHs: 100,
          powerW: 1000,
          cost: 30000,
          manufacturer: "Bitmain",
          model: "S19",
          units: 100,
        },
      ],
    },
    revenue: {
      gross: {
        btc: 0.65,
        usd: 30000,
        source: FinancialSource.NONE,
      },
      net: {
        btc: 0.65,
        usd: 30000,
        source: FinancialSource.NONE,
      },
    },
    expenses: {
      depreciation: { btc: 0.01, source: FinancialSource.NONE },
      electricity: { btc: 0.12, source: FinancialSource.NONE },
      csm: { btc: 0.06, source: FinancialSource.NONE },
      operator: { btc: 0.03, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
    incomes: {
      mining: { btc: 0.55, source: FinancialSource.NONE },
      other: { btc: 0.15, source: FinancialSource.NONE },
    },
  },
];

describe("BalanceSheet Calculations", () => {
  it("should sort data by date and calculate totals correctly", () => {
    // Sort the data by date
    data.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
    const start = data[0].day;
    const end = data[data.length - 1].day;
    const days = calculateDaysBetweenDates(new Date(start), new Date(end));

    const result = calculateBalanceSheet(
      data,
      10,
      new Date(start),
      new Date(end)
    );

    expect(result.equipments.uptime).toBeCloseTo((95 + 96) / days);
    expect(result.equipments.hashrateTHs).toBeCloseTo((100 + 105) / days);
    expect(result.balance.btcSellPrice).toBe(10);
    expect(result.balance.expenses.electricity.btc).toBeCloseTo(
      (0.1 + 0.12) / days
    );
  });
});
