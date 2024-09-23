export type DailyFinancialStatement = {
  day: Date;
  uptime: number;
  flow: FinancialFlow;
  partnaire: FinancialPartnaire;
  amount: FinancialStatementAmount;
};

export type FinancialStatementAmount = {
  btc: number;
  usd?: number;
  isFromFinancialStatement: boolean;
};

export type DailyAccounting = {
  day: Date;
  uptime: number;
  expenses: {
    electricity: FinancialStatementAmount;
    csm: FinancialStatementAmount;
    operator: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
  income: {
    pool: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
};

export enum FinancialFlow {
  IN,
  OUT,
}

export enum FinancialPartnaire {
  OPERATOR,
  CSM,
  ELECTRICITY,
  POOL,
  OTHER,
}

export function convertFinancialStatementToAccounting(
  dayStatement: DailyFinancialStatement
): DailyAccounting {
  return {
    day: dayStatement.day,
    uptime: dayStatement.uptime,
    expenses: {
      electricity:
        dayStatement.partnaire === FinancialPartnaire.ELECTRICITY
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
      csm:
        dayStatement.partnaire === FinancialPartnaire.CSM
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
      operator:
        dayStatement.partnaire === FinancialPartnaire.OPERATOR
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
    },
    income: {
      pool:
        dayStatement.partnaire === FinancialPartnaire.POOL
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, isFromFinancialStatement: false },
    },
  };
}

export function addFinancialAmount(
  amount1: FinancialStatementAmount,
  amount2: FinancialStatementAmount
): FinancialStatementAmount {
  return {
    btc: amount1.btc + amount2.btc,
    usd: amount1.usd && amount2.usd ? amount1.usd + amount2.usd : 0,
    isFromFinancialStatement:
      amount1.isFromFinancialStatement || amount2.isFromFinancialStatement,
  };
}

export function addDailyAccounting(
  account1: DailyAccounting,
  account2: DailyAccounting
): DailyAccounting {
  return {
    day: account1.day, // Assuming the day is the same for both accounts
    uptime: account1.uptime, // Assuming the uptime is the same for both accounts
    expenses: {
      electricity: addFinancialAmount(
        account1.expenses.electricity,
        account2.expenses.electricity
      ),
      csm: addFinancialAmount(account1.expenses.csm, account2.expenses.csm),
      operator: addFinancialAmount(
        account1.expenses.operator,
        account2.expenses.operator
      ),
      other: addFinancialAmount(
        account1.expenses.other,
        account2.expenses.other
      ),
    },
    income: {
      pool: addFinancialAmount(account1.income.pool, account2.income.pool),
      other: addFinancialAmount(account1.income.other, account2.income.other),
    },
  };
}
