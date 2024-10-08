export type DayPoolData = {
  site: string;
  date: string;
  efficiency: number;
  hashrateTHs: number;
  revenue: number;
  uptimePercentage: number;
  uptimeTotalMinutes: number;
  uptimeTotalMachines: number;
};

export enum Pool {
  Antpool = 1,
  Foundry = 2,
  Luxor = 3,
}

export type APIMiningPoolQuery = {
  site: string;
  first: number;
};
export type APIMiningPoolDataQuery = {
  site: string;
  first: number;
  username: string;
};

export type APIMiningPoolResponse = {
  updated: number;
  site: string;
  days: DayPoolData[];
  error?: any;
};

export type APIMiningPoolDataResponse = {
  site: string;
  updated: number;
  days: any[];
  error?: any;
};

export type APIEbitdaQuery = {
  site: string;
  startTimestamp: number;
  endTimestamp: number;
  btcPrice: number;
  basePricePerKWH?: number;
  subaccount?: number;
};

export interface DayDataAntpool {
  timestamp: string;
  hashrate: string;
  hashrate_unit: number;
  ppsAmount: number;
  pplnsAmount: number;
  soloAmount: number;
  ppappsAmount: number;
  ppapplnsAmount: number;
  fppsBlockAmount: number;
  fppsFeeAmount: number;
}

export interface DayDataLuxor {
  date: string;
  efficiency: number;
  hashrate: number;
  revenue: number;
  uptimePercentage: number;
  uptimeTotalMinutes: number;
  uptimeTotalMachines: number;
}

export interface DayDataFoundry {
  startTime: string;
  endTime: string;
  totalAmount: number;
  hashrate: number;
  ppsBaseAmount: number;
  txFeeRewardAmount: number;
  fppsRatePercent: number;
  ppapplnsAmount: number;
  feeAmount: number;
  feeRatePercent: number;
}
