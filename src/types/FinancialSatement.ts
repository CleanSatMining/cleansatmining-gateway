import BigNumber from "bignumber.js";
import { FinancialSource } from "./MiningReport";

export type DailyPartnaireFinancialStatement = {
  day: Date;
  uptime: number;
  hashrateTHs: number;
  hashrateTHsMax: number;
  flow: FinancialFlow;
  partnaire: FinancialPartnaire;
  amount: FinancialStatementAmount;
  btcPrice: number;
};

export type DailyFinancialStatement = {
  day: Date;
  uptime: number;
  hashrateTHs: number;
  hashrateTHsMax: number;
  flows: {
    [key in FinancialPartnaire]: {
      flow: FinancialFlow;
      partnaire: FinancialPartnaire;
      amount: FinancialStatementAmount;
    };
  };
};

export type FinancialStatementAmount = {
  btc: number;
  usd?: number;
  source: FinancialSource;
};

export type FinancialStatementFlow = FinancialStatementAmount & {
  flow: FinancialFlow;
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

export function addSourceFinancialAmount(
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

export function addFinancialAmount(
  amount1: FinancialStatementAmount,
  amount2: FinancialStatementAmount
): FinancialStatementAmount {
  const source = resolveFinancialSource(amount1.source, amount2.source);
  // add only if both are of the same source
  let btc: number = 0;
  let usd: number | undefined = undefined;
  //if (amount1.source === amount2.source) {
  btc = amount1.btc + amount2.btc;
  usd = amount1.usd && amount2.usd ? amount1.usd + amount2.usd : undefined;
  /*} else if (amount1.source === source) {
    btc = amount1.btc;
    usd = amount1.usd;
  } else if (amount2.source === source) {
    btc = amount2.btc;
    usd = amount2.usd;
  }*/

  return {
    btc: btc,
    usd: usd,
    source: source,
  };
}

export function addFinancialAmounts(
  amounts: FinancialStatementAmount[]
): FinancialStatementAmount {
  let btc: number = 0;
  let usd: number | undefined = undefined;
  let source: FinancialSource = FinancialSource.NONE;
  for (const amount of amounts) {
    const newAmount = addFinancialAmount({ btc, usd, source }, amount);
    btc = newAmount.btc;
    usd = newAmount.usd;
    source = newAmount.source;
  }

  return {
    btc: btc,
    usd: usd,
    source: source,
  };
}

export function substractFinancialAmount(
  amount1: FinancialStatementAmount,
  amount2: FinancialStatementAmount
): FinancialStatementAmount {
  const source = resolveFinancialSource(amount1.source, amount2.source);
  // add only if both are of the same source
  let btc: number = 0;
  let usd: number | undefined = undefined;
  //if (amount1.source === amount2.source) {
  btc = amount1.btc - amount2.btc;
  usd = amount1.usd && amount2.usd ? amount1.usd - amount2.usd : undefined;
  /*} else if (amount1.source === source) {
    btc = amount1.btc;
    usd = amount1.usd;
  } else if (amount2.source === source) {
    btc = amount2.btc;
    usd = amount2.usd;
  }*/

  return {
    btc: btc,
    usd: usd,
    source: source,
  };
}

export function addFinancialFlow(
  flow1: FinancialStatementFlow,
  flow2: FinancialStatementFlow
): FinancialStatementFlow {
  const source = resolveFinancialSource(flow1.source, flow2.source);
  const sign1 = flow1.flow === FinancialFlow.IN ? 1 : -1;
  const sign2 = flow2.flow === FinancialFlow.IN ? 1 : -1;
  const btc = new BigNumber(flow1.btc)
    .times(sign1)
    .plus(new BigNumber(flow2.btc).times(sign2))
    .toNumber();
  const usd =
    flow1.usd && flow2.usd
      ? new BigNumber(flow1.usd)
          .times(sign1)
          .plus(new BigNumber(flow2.usd).times(sign2))
          .toNumber()
      : undefined;

  const flow: FinancialFlow = btc >= 0 ? FinancialFlow.IN : FinancialFlow.OUT;

  return {
    btc: btc,
    usd: usd,
    flow: flow,
    source: source,
  };
}
