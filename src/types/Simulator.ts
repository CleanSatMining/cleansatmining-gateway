export type FeeRates = {
  taxRate: number;
  profitShareRate: number;
  powerTaxUsd: number;
};

interface CurrencyDetail {
  btc: number;
  usd: number;
}

interface Cost {
  electricity: {
    csmFee: CurrencyDetail;
    operatorFee: CurrencyDetail;
    providerFee: CurrencyDetail;
    total: CurrencyDetail;
  };
  csm: CurrencyDetail;
  operator: CurrencyDetail;
  depreciation: {
    equipment: CurrencyDetail;
  };
  other: CurrencyDetail;
}

interface Income {
  mining: CurrencyDetail;
  other: CurrencyDetail;
}

interface Revenue {
  gross: CurrencyDetail;
  net: CurrencyDetail;
}

export interface SimulationResult {
  btcSellPrice: number;
  cost: Cost;
  income: Income;
  revenue: Revenue;
}
