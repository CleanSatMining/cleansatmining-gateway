import { Database } from "@/types/supabase";
import {
  getFinancialStatementUptimeWeight,
  getMiningHistoryRelatedToFinancialStatement,
  getDailyFinancialStatement,
  getDailyAccounting,
} from "./financialstatements";
import {
  DailyAccounting,
  FinancialSource,
  FinancialFlow,
  FinancialPartnaire,
  addDailyAccounting,
} from "@/types/FinancialSatement";

// Mock data for testing
const mockPoolFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 1,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 1,
    usd: 50000,
    flow: "IN",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: "POOL",
    to: null,
  };

const mockElecFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 2,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 0.5,
    usd: 25000,
    flow: "OUT",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: null,
    to: "ELECTRICITY",
  };

const mockOpeFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 3,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 0.05,
    usd: 2500,
    flow: "OUT",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: null,
    to: "OPERATOR",
  };

const mockCsmFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 4,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 0.025,
    usd: 1250,
    flow: "OUT",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: null,
    to: "CSM SA",
  };

const mockMiningHistory: Database["public"]["Tables"]["mining"]["Row"][] = [
  {
    id: 1,
    day: "2024-01-01",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.2,
  },
  {
    id: 2,
    day: "2024-01-02",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.2,
  },
  {
    id: 3,
    day: "2024-01-03",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.1,
  },
  {
    id: 4,
    day: "2024-01-04",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.1,
  },
  {
    id: 5,
    day: "2024-01-05",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.1,
  },
  {
    id: 6,
    day: "2024-01-06",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.1,
  },
  {
    id: 7,
    day: "2024-01-07",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.05,
  },
  {
    id: 8,
    day: "2024-01-08",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.05,
  },
  {
    id: 9,
    day: "2024-01-09",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.05,
  },
  {
    id: 10,
    day: "2024-01-10",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.05,
  },
  {
    id: 11,
    day: "2024-01-11",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrate: 100,
    mined: 0.1,
  },
];

const mockDailyAccounting1: DailyAccounting = {
  day: new Date("2023-01-01"),
  uptime: 10,
  expenses: {
    electricity: { btc: 100, usd: 0, source: FinancialSource.STATEMENT },
    csm: { btc: 50, usd: 0, source: FinancialSource.STATEMENT },
    operator: { btc: 30, usd: 0, source: FinancialSource.STATEMENT },
    other: { btc: 20, usd: 0, source: FinancialSource.STATEMENT },
  },
  income: {
    pool: { btc: 200, usd: 0, source: FinancialSource.STATEMENT },
    other: { btc: 10, usd: 0, source: FinancialSource.STATEMENT },
  },
};

const mockDailyAccounting2: DailyAccounting = {
  day: new Date("2023-01-01"),
  uptime: 10,
  expenses: {
    electricity: { btc: 100, usd: 0, source: FinancialSource.STATEMENT },
    csm: { btc: 50, usd: 0, source: FinancialSource.STATEMENT },
    operator: { btc: 30, usd: 0, source: FinancialSource.STATEMENT },
    other: { btc: 20, usd: 0, source: FinancialSource.STATEMENT },
  },
  income: {
    pool: { btc: 200, usd: 0, source: FinancialSource.STATEMENT },
    other: { btc: 10, usd: 0, source: FinancialSource.STATEMENT },
  },
};

describe("financialstatements.ts", () => {
  test("getFinancialStatementUptimeWeight", () => {
    const weight = getFinancialStatementUptimeWeight(
      mockPoolFinancialStatement,
      mockMiningHistory
    );
    expect(weight).toBe(8); // Adjust expected value based on your logic
  });

  test("getMiningHistoryRelatedToFinancialStatement", () => {
    const relatedHistory = getMiningHistoryRelatedToFinancialStatement(
      mockPoolFinancialStatement,
      mockMiningHistory
    );
    expect(relatedHistory).toHaveLength(10); // Adjust expected value based on your logic
  });

  test("getDailyFinancialStatement", () => {
    // Add your test logic here

    const dailyFinancialStatement = getDailyFinancialStatement(
      mockPoolFinancialStatement,
      mockMiningHistory
    );

    expect(dailyFinancialStatement.length).toBe(10);
    expect(dailyFinancialStatement[0].amount.btc).toBe(
      mockPoolFinancialStatement.btc / 8
    );
    expect(dailyFinancialStatement[0].amount.usd).toBe(
      mockPoolFinancialStatement.usd / 8
    );
    expect(dailyFinancialStatement[0].uptime).toBe(1);
    expect(dailyFinancialStatement[0].flow).toBe(FinancialFlow.IN);
    expect(dailyFinancialStatement[0].partnaire).toBe(FinancialPartnaire.POOL);
  });

  test("getDailyAccounting", () => {
    // Add your test logic here
    const dailyAccounting = getDailyAccounting(
      [
        mockPoolFinancialStatement,
        mockElecFinancialStatement,
        mockOpeFinancialStatement,
        mockCsmFinancialStatement,
      ],
      mockMiningHistory
    );
    console.log("Daily accounting", JSON.stringify(dailyAccounting, null, 2));
    expect(dailyAccounting.length).toBe(10);
    expect(
      dailyAccounting.reduce((acc, account) => acc + account.income.pool.btc, 0)
    ).toBe(mockPoolFinancialStatement.btc);
  });

  test("mapFinancialPartnaireToField", () => {
    // Add your test logic here
  });

  test("addDailyAccounting", () => {
    const result = addDailyAccounting(
      mockDailyAccounting1,
      mockDailyAccounting2
    );
    expect(result.uptime).toBe(10);
    expect(result.expenses.electricity.btc).toBe(200);
    expect(result.income.pool.btc).toBe(400);
    // Add other assertions as necessary
  });
});
