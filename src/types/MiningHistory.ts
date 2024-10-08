export type PoolData = {
  hashrate: number;
  uptime: number;
  btc: number;
};

export type MiningData = {
  id: number;
  created_at: string;
  day: string;
  mined: number;
  uptime: number;
  hashrateTHs: number;
  farmSlug: string;
  siteSlug: string;
};
