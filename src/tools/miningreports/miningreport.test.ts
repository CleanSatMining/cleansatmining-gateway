import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import {} from "../financialstatements/financialstatement.commons";
import { getSiteDailyMiningReports } from "./site";
import { FinancialSource } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";

const mockSite: Site = {
  id: 1,
  slug: "alpha1",
  farmSlug: "alpha",
  contractId: 1,
  closed_at: null,
  isClosed: false,
  location: {
    aera: "aera",
    country: "country",
    countryCode: "countryCode",
    id: 1,
    slug: "alpha",
  },
  created_at: "2024-09-02T00:00:00.000Z",
  localisationSlug: "alpha",
  operatorName: "alpha",
  powerPlantId: 1,
  updated_at: "2024-09-02T00:00:00.000Z",
  operator: {
    id: 1,
    logo: "logo",
    name: "name",
    website: "website",
  },
  powerPlant: {
    created_at: "2024-09-02T00:00:00.000Z",
    energies: [],
    id: 1,
    locationId: 1,
    powerMW: 1,
    slug: "alpha",
  },
  contract: {
    id: 1,
    api: {
      closed_at: null,
      contractId: 1,
      id: 1,
      poolId: 1,
      url: "url",
      username: "username",
    },
    created_at: "2024-09-02T00:00:00.000Z",
    csmPowerTax: 0,
    electricityPrice: 0.04,
    poolTaxRate: 0.015,
    pool: "pool",
    csmProfitSharing: 0,
    csmTaxRate: 0.1,
    electricityContractDuration: 1,
    electricityContractRenewable: true,
    operator: "operator",
    opPowerTax: 0,
    opProfitSharing: 0,
    opTaxRate: 0.15,
    slug: "alpha",
  },
  containers: [
    {
      asicId: 1,
      cost: 1,
      created_at: "2024-09-02T00:00:00.000Z",
      end: null,
      id: 1,
      location: {
        aera: "aera",
        country: "country",
        countryCode: "countryCode",
        id: 1,
        slug: "alpha",
      },
      locationId: 1,
      siteSlug: "alpha1",
      slug: "alpha",
      start: "2024-09-02T00:00:00.000Z",
      units: 1,
      asics: {
        created_at: "2024-09-02T00:00:00.000Z",
        hashrateTHs: 1,
        id: 1,
        manufacturer: "manufacturer",
        model: "model",
        powerW: 1,
      },
    },
  ],
};

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

const mockDailyAccounting1: DailyMiningReport = {
  day: new Date("2023-01-01"),
  uptime: 10,
  hashrateTHs: 100,
  btcSellPrice: 50000,
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

const mockDailyAccounting2: DailyMiningReport = {
  day: new Date("2023-01-01"),
  uptime: 10,
  hashrateTHs: 100,
  btcSellPrice: 50000,
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

describe("miningreport.ts", () => {
  test("get Site Daily Mining Reports", () => {
    // Add your test logic here
    const dailyReports = getSiteDailyMiningReports(
      [
        mockPoolFinancialStatement,
        mockElecFinancialStatement,
        mockOpeFinancialStatement,
        mockCsmFinancialStatement,
      ],
      mockMiningHistory,
      mockSite,
      1
    );

    expect(dailyReports.length).toBe(10);
    expect(
      dailyReports.reduce((acc, account) => acc + account.income.pool.btc, 0)
    ).toBe(mockPoolFinancialStatement.btc);
  });

  test("mapFinancialPartnaireToField", () => {
    // Add your test logic here
  });
});
