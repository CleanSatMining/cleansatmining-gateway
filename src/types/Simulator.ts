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
  electricity: CurrencyDetail;
  csm: CurrencyDetail;
  operator: CurrencyDetail;
}

export interface SimulationResult {
  cost: Cost;
  income: CurrencyDetail;
}
