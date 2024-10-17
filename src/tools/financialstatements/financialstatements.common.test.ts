import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import { getFinancialStatementUptimeWeight } from "./financialstatement.commons";
import { convertSiteFinancialStatementInDailyPeriod } from "./site";
import { filterMiningHistoryWithFinancialStatementPeriod } from "../mininghistory/mininghistory.common";

import { FinancialFlow, FinancialPartnaire } from "@/types/FinancialSatement";
import { FinancialSource } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";

// Mock data for testing
const mockPoolFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 1,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 1,
    fiat: 50000,
    currency: "USD",
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
    fiat: 25000,
    currency: "USD",
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
    fiat: 2500,
    flow: "OUT",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: null,
    to: "OPERATOR",
    currency: "USD",
  };

const mockCsmFinancialStatement: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    id: 4,
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-10T23:59:59.999Z",
    // Add other necessary fields
    btc: 0.025,
    fiat: 1250,
    flow: "OUT",
    btcPrice: 50000,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    from: null,
    to: "CSM SA",
    currency: "USD",
  };

const mockMiningHistory: Database["public"]["Tables"]["mining"]["Row"][] = [
  {
    id: 1,
    day: "2024-01-01",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.2,
  },
  {
    id: 2,
    day: "2024-01-02",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.2,
  },
  {
    id: 3,
    day: "2024-01-03",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.1,
  },
  {
    id: 4,
    day: "2024-01-04",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.1,
  },
  {
    id: 5,
    day: "2024-01-05",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.1,
  },
  {
    id: 6,
    day: "2024-01-06",
    uptime: 1,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.1,
  },
  {
    id: 7,
    day: "2024-01-07",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.05,
  },
  {
    id: 8,
    day: "2024-01-08",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.05,
  },
  {
    id: 9,
    day: "2024-01-09",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.05,
  },
  {
    id: 10,
    day: "2024-01-10",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.05,
  },
  {
    id: 11,
    day: "2024-01-11",
    uptime: 0.5,
    created_at: "2024-09-02T00:00:00.000Z",
    farmSlug: "alpha",
    siteSlug: "alpha1",
    hashrateTHs: 100,
    mined: 0.1,
  },
];

describe("financialstatements.ts", () => {
  test("getFinancialStatementUptimeWeight", () => {
    const weight = getFinancialStatementUptimeWeight(
      mockPoolFinancialStatement,
      mockMiningHistory
    );
    expect(weight.uptimeWeight).toBe(8); // Adjust expected value based on your logic
  });

  test("getMiningHistoryRelatedToFinancialStatement", () => {
    const relatedHistory = filterMiningHistoryWithFinancialStatementPeriod(
      mockPoolFinancialStatement,
      mockMiningHistory
    );
    expect(relatedHistory).toHaveLength(10); // Adjust expected value based on your logic
  });

  test("mapFinancialPartnaireToField", () => {
    // Add your test logic here
  });
});
