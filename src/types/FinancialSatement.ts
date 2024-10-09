import { FinancialSource } from "./MiningReport";

export type DailyFinancialStatement = {
  day: Date;
  uptime: number;
  hashrateTHs: number;
  flow: FinancialFlow;
  partnaire: FinancialPartnaire;
  amount: FinancialStatementAmount;
  btcPrice: number;
};

export type FinancialStatementAmount = {
  btc: number;
  usd?: number;
  source: FinancialSource;
};

export enum FinancialFlow {
  IN = "in",
  OUT = "out",
}

export enum FinancialPartnaire {
  OPERATOR = "operator",
  CSM = "csm sa",
  ELECTRICITY = "electricity",
  POOL = "pool",
  OTHER = "other",
}

export function resolveFinancialSource(
  source1: FinancialSource,
  source2: FinancialSource
): FinancialSource {
  if (source1 === FinancialSource.NONE) {
    return source2;
  } else if (source2 === FinancialSource.NONE) {
    return source1;
  } else if (
    source1 === FinancialSource.STATEMENT ||
    source2 === FinancialSource.STATEMENT
  ) {
    return FinancialSource.STATEMENT;
  } else if (
    source1 === FinancialSource.POOL ||
    source2 === FinancialSource.POOL
  ) {
    return FinancialSource.POOL;
  } else if (
    source1 === FinancialSource.SIMULATOR ||
    source2 === FinancialSource.SIMULATOR
  ) {
    return FinancialSource.SIMULATOR;
  }
  return source1;
}

export function addFinancialAmount(
  amount1: FinancialStatementAmount,
  amount2: FinancialStatementAmount
): FinancialStatementAmount {
  const source = resolveFinancialSource(amount1.source, amount2.source);
  // add only if both are of the same source
  let btc: number = 0;
  let usd: number | undefined = undefined;
  if (amount1.source === amount2.source) {
    btc = amount1.btc + amount2.btc;
    usd = amount1.usd && amount2.usd ? amount1.usd + amount2.usd : undefined;
  } else if (amount1.source === source) {
    btc = amount1.btc;
    usd = amount1.usd;
  } else if (amount2.source === source) {
    btc = amount2.btc;
    usd = amount2.usd;
  }

  return {
    btc: btc,
    usd: usd,
    source: source,
  };
}
