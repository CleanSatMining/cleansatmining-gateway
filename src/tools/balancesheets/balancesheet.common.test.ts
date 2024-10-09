import { FinancialSource } from "@/types/MiningReport";

import BigNumber from "bignumber.js";
import { calculateDaysBetweenDates } from "../date";
import { DailyMiningReport } from "@/types/MiningReport";
import { calculateBalanceSheet } from "./balancesheet.common";

// Exemple de données de test
const data: DailyMiningReport[] = [
  {
    day: new Date("2023-01-01"),
    uptime: 95,
    hashrateTHs: 100,
    btcSellPrice: 45000,
    expenses: {
      electricity: { btc: 0.1, source: FinancialSource.NONE },
      csm: { btc: 0.05, source: FinancialSource.NONE },
      operator: { btc: 0.02, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
    income: {
      pool: { btc: 0.5, source: FinancialSource.NONE },
      other: { btc: 0.1, source: FinancialSource.NONE },
    },
  },
  {
    day: new Date("2023-01-02"),
    uptime: 96,
    hashrateTHs: 105,
    btcSellPrice: 46000,
    expenses: {
      electricity: { btc: 0.12, source: FinancialSource.NONE },
      csm: { btc: 0.06, source: FinancialSource.NONE },
      operator: { btc: 0.03, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
    income: {
      pool: { btc: 0.55, source: FinancialSource.NONE },
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

    expect(result.balance.uptime).toBeCloseTo((95 + 96) / days);
    expect(result.balance.hashrateTHs).toBeCloseTo((100 + 105) / days);
    expect(result.balance.btcSellPrice).toBe(10);
    expect(result.balance.expenses.electricity.btc).toBeCloseTo(
      (0.1 + 0.12) / days
    );
  });
});
