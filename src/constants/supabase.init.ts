import { Database } from "@/types/supabase";
import { TableType, TableRow } from "../types/supabase.extend";

// Initialiser des objets pour chaque table
export const apisInitRow: Database["public"]["Tables"]["apis"]["Row"] = {
  closed_at: null,
  id: 0,
  poolId: 0,
  url: "",
  username: "",
  contractId: 0,
};

export const asicsInitRow: Database["public"]["Tables"]["asics"]["Row"] = {
  created_at: "",
  hashrateTHs: 0,
  id: 0,
  manufacturer: "",
  model: "",
  powerW: 0,
};

export const containersInitRow: Database["public"]["Tables"]["containers"]["Row"] =
  {
    asicId: 0,
    cost: 0,
    created_at: "",
    end: null,
    id: 0,
    locationId: 0,
    slug: "",
    start: null,
    units: 0,
    siteSlug: "",
  };

export const contractsInitRow: Database["public"]["Tables"]["contracts"]["Row"] =
  {
    created_at: "",
    csmPowerTax: 0,
    csmProfitSharing: 0,
    csmTaxRate: 0,
    electricityContractDuration: 0,
    electricityContractRenewable: false,
    electricityPrice: 0,
    id: 0,
    operator: "",
    opPowerTax: 0,
    opProfitSharing: 0,
    opTaxRate: 0,
    pool: "",
    poolTaxRate: 0,
    slug: "",
  };

export const energiesInitRow: Database["public"]["Tables"]["energies"]["Row"] =
  {
    id: 0,
    type: "",
  };

export const farmsInitRow: Database["public"]["Tables"]["farms"]["Row"] = {
  created_at: "",
  id: 0,
  imageLink: "",
  name: "",
  shortName: "",
  slug: "",
  status: "",
  updated_at: "",
  locationSlug: "",
};

export const financialStatementsInitRow: Database["public"]["Tables"]["financialStatements"]["Row"] =
  {
    btc: 0,
    btcPrice: 0,
    created_at: "",
    end: "",
    flow: "",
    id: 0,
    start: "",
    fiat: 0,
    farmSlug: "",
    siteSlug: "",
    from: null,
    to: null,
    currency: "",
  };

export const fundraisingsInitRow: Database["public"]["Tables"]["fundraisings"]["Row"] =
  {
    amount: 0,
    created_at: "",
    farmSlug: "",
    id: 0,
    asicsCost: 0,
    containerCost: 0,
    date: "",
    depositAmount: 0,
    otherCost: 0,
    transportCost: 0,
  };

export const flowsInitRow: Database["public"]["Tables"]["flows"]["Row"] = {
  cash: "",
};

export const locationsInitRow: Database["public"]["Tables"]["locations"]["Row"] =
  {
    aera: "",
    country: "",
    countryCode: "",
    id: 0,
    slug: "",
  };

export const miningInitRow: Database["public"]["Tables"]["mining"]["Row"] = {
  created_at: "",
  day: "",
  hashrateTHs: 0,
  id: 0,
  mined: 0,
  uptime: 0,
  farmSlug: "",
  siteSlug: "",
};

export const operatorsInitRow: Database["public"]["Tables"]["operators"]["Row"] =
  {
    id: 0,
    logo: "",
    name: "",
    website: "",
  };

export const poolsInitRow: Database["public"]["Tables"]["pools"]["Row"] = {
  id: 0,
  name: "",
};

export const powerPlantsInitRow: Database["public"]["Tables"]["powerPlants"]["Row"] =
  {
    created_at: "",
    energies: [],
    id: 0,
    locationId: 0,
    powerMW: 0,
    slug: "",
  };

export const providersInitRow: Database["public"]["Tables"]["providers"]["Row"] =
  {
    provider: "",
  };

export const sitesInitRow: Database["public"]["Tables"]["sites"]["Row"] = {
  closed_at: null,
  created_at: "",
  id: 0,
  isClosed: false,
  powerPlantId: 0,
  slug: "",
  updated_at: "",
  contractId: 0,
  farmSlug: "",
  localisationSlug: "",
  operatorName: "",
  started_at: "",
};

export const societiesInitRow: Database["public"]["Tables"]["societies"]["Row"] =
  {
    created_at: "",
    crowdFundingFeeRate: 0,
    csmSaShare: 0,
    farmId: 0,
    id: 0,
    locationId: 0,
    name: "",
    provisionRate: 0,
    registrationNumber: "",
    shareCapital: 0,
    taxRate: 0,
    tokenization: 0,
    updated_at: "",
  };

export const tokensInitRow: Database["public"]["Tables"]["tokens"]["Row"] = {
  address: "",
  created_at: "",
  decimals: 0,
  farmId: 0,
  gnosisscanUrl: "",
  id: 0,
  initialPrice: 0,
  name: "",
  supply: 0,
  symbol: "",
  updated_at: "",
};

export const vaultsInitRow: Database["public"]["Tables"]["vaults"]["Row"] = {
  created_at: "",
  farmId: 0,
  id: 0,
  xpub: "",
};

export type GenericTable = {
  type: TableType;
  row: TableRow;
};

export const TABLES: Record<string, GenericTable> = {
  apis: {
    type: "apis",
    row: apisInitRow,
  },
  asics: {
    type: "asics",
    row: asicsInitRow,
  },
  containers: {
    type: "containers",
    row: containersInitRow,
  },
  contracts: {
    type: "contracts",
    row: contractsInitRow,
  },
  energies: {
    type: "energies",
    row: energiesInitRow,
  },
  farms: {
    type: "farms",
    row: farmsInitRow,
  },
  financialStatements: {
    type: "financialStatements",
    row: financialStatementsInitRow,
  },
  flows: {
    type: "flows",
    row: flowsInitRow,
  },
  fundraisings: {
    type: "fundraisings",
    row: fundraisingsInitRow,
  },
  locations: {
    type: "locations",
    row: locationsInitRow,
  },
  mining: {
    type: "mining",
    row: miningInitRow,
  },
  operators: {
    type: "operators",
    row: operatorsInitRow,
  },
  pools: {
    type: "pools",
    row: poolsInitRow,
  },
  powerPlants: {
    type: "powerPlants",
    row: powerPlantsInitRow,
  },
  providers: {
    type: "providers",
    row: providersInitRow,
  },
  sites: {
    type: "sites",
    row: sitesInitRow,
  },
  societies: {
    type: "societies",
    row: societiesInitRow,
  },
  tokens: {
    type: "tokens",
    row: tokensInitRow,
  },
  vaults: {
    type: "vaults",
    row: vaultsInitRow,
  },
};
