import { resolveFinancialSource } from "@/types/FinancialSatement";
import { FinancialSource } from "@/types/MiningReport";
import { DailyMiningReport, MiningReport } from "@/types/MiningReport";
import { BigNumber } from "bignumber.js";
import {
  calculateDaysBetweenDates,
  calculateFullDaysBetweenDates,
} from "@/tools/date";
import { BalanceSheet } from "@/types/BalanceSeet";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";

export function calculateBalanceSheet(
  data: DailyMiningReport[],
  btcPrice?: number,
  startDay?: Date,
  endDay?: Date
): BalanceSheet {
  //console.log("");
  //console.log("=>");
  //console.log("calculateBalanceSheet", data.length, startDay, endDay);
  //filter the data by date
  const filteredData = data.filter((report) => {
    return (
      (startDay === undefined ||
        new Date(report.day).getTime() >= new Date(startDay).getTime()) &&
      (endDay === undefined ||
        new Date(report.day).getTime() <= new Date(endDay).getTime())
    );
  });

  const { start: startDayReport, end: endDayReport } =
    getDailyMiningReportsPeriod(filteredData);
  if (startDayReport === undefined || endDayReport === undefined) {
    console.warn(
      "WARN calculateBalanceSheet",
      data.length,
      filteredData.length,
      startDay,
      endDay
    );
    return getEmptyBalanceSheet(btcPrice, startDay, endDay);
  }

  const start = startDay ?? startDayReport;
  const end = endDay ?? endDayReport;

  const balance = _calculateBalanceSheet(filteredData, btcPrice);

  return {
    start: start,
    end: end,
    days: calculateDaysBetweenDates(start, end),
    balance,
  };
}

function _calculateBalanceSheet(
  data: DailyMiningReport[],
  btcPrice?: number
): MiningReport {
  if (data.length === 0) {
    return {
      uptime: 0,
      hashrateTHs: 0,
      hashrateTHsMax: 0,
      btcSellPrice: btcPrice ?? 1,
      expenses: {
        electricity: { btc: 0, source: FinancialSource.NONE },
        csm: { btc: 0, source: FinancialSource.NONE },
        operator: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
      income: {
        pool: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
    };
  }

  // sort the data by date
  data.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  const start = data[0].day;
  const end = new Date(data[data.length - 1].day);
  const days = calculateFullDaysBetweenDates(start, end);

  //console.log("BALANCE SHEET data", JSON.stringify(data, null, 2));

  const total: MiningReport = data.reduce(
    (acc, report) => {
      acc.uptime = new BigNumber(report.uptime)
        .dividedBy(days)
        .plus(acc.uptime)
        .toNumber();
      acc.hashrateTHs = new BigNumber(report.hashrateTHs)
        .dividedBy(days)
        .plus(acc.hashrateTHs)
        .toNumber();
      acc.hashrateTHsMax = new BigNumber(report.hashrateTHsMax)
        .dividedBy(days)
        .plus(acc.hashrateTHsMax)
        .toNumber();
      acc.btcSellPrice = report.btcSellPrice;
      acc.expenses.electricity.btc = new BigNumber(
        report.expenses.electricity.btc
      )
        .plus(acc.expenses.electricity.btc)
        .toNumber();
      acc.expenses.csm.btc = new BigNumber(report.expenses.csm.btc)
        .plus(acc.expenses.csm.btc)
        .toNumber();
      acc.expenses.operator.btc = new BigNumber(report.expenses.operator.btc)
        .plus(acc.expenses.operator.btc)
        .toNumber();
      acc.expenses.other.btc = new BigNumber(report.expenses.other.btc)
        .plus(acc.expenses.other.btc)
        .toNumber();
      acc.income.pool.btc = new BigNumber(report.income.pool.btc)
        .plus(acc.income.pool.btc)
        .toNumber();
      acc.income.other.btc = new BigNumber(report.income.other.btc)
        .plus(acc.income.other.btc)
        .toNumber();

      // resolve sources
      acc.expenses.electricity.source = resolveFinancialSource(
        acc.expenses.electricity.source,
        report.expenses.electricity.source
      );
      acc.expenses.csm.source = resolveFinancialSource(
        acc.expenses.csm.source,
        report.expenses.csm.source
      );
      acc.expenses.operator.source = resolveFinancialSource(
        acc.expenses.operator.source,
        report.expenses.operator.source
      );
      acc.expenses.other.source = resolveFinancialSource(
        acc.expenses.other.source,
        report.expenses.other.source
      );
      acc.income.pool.source = resolveFinancialSource(
        acc.income.pool.source,
        report.income.pool.source
      );
      acc.income.other.source = resolveFinancialSource(
        acc.income.other.source,
        report.income.other.source
      );

      return acc;
    },
    {
      uptime: 0,
      hashrateTHs: 0,
      hashrateTHsMax: 0,
      btcSellPrice: btcPrice ?? 1,
      expenses: {
        electricity: { btc: 0, source: FinancialSource.NONE },
        csm: { btc: 0, source: FinancialSource.NONE },
        operator: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
      income: {
        pool: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
    } as MiningReport
  );

  if (btcPrice) {
    total.btcSellPrice = btcPrice;
    total.expenses.electricity.usd = new BigNumber(
      total.expenses.electricity.btc
    )
      .multipliedBy(btcPrice)
      .toNumber();
    total.expenses.csm.usd = new BigNumber(total.expenses.csm.btc)
      .multipliedBy(btcPrice)
      .toNumber();
    total.expenses.operator.usd = new BigNumber(total.expenses.operator.btc)
      .multipliedBy(btcPrice)
      .toNumber();
    total.expenses.other.usd = new BigNumber(total.expenses.other.btc)
      .multipliedBy(btcPrice)
      .toNumber();
    total.income.pool.usd = new BigNumber(total.income.pool.btc)
      .multipliedBy(btcPrice)
      .toNumber();
    total.income.other.usd = new BigNumber(total.income.other.btc)
      .multipliedBy(btcPrice)
      .toNumber();
  }

  return total;
}

export function getEmptyBalanceSheet(
  btcPrice: number = 1,
  startDay: Date = new Date(),
  endDay: Date = new Date()
): BalanceSheet {
  return {
    start: startDay,
    end: endDay,
    days: calculateDaysBetweenDates(startDay, endDay),
    balance: {
      uptime: 0,
      hashrateTHs: 0,
      hashrateTHsMax: 0,
      btcSellPrice: btcPrice,
      expenses: {
        electricity: { btc: 0, source: FinancialSource.NONE },
        csm: { btc: 0, source: FinancialSource.NONE },
        operator: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
      income: {
        pool: { btc: 0, source: FinancialSource.NONE },
        other: { btc: 0, source: FinancialSource.NONE },
      },
    },
  };
}

export function mergeBalanceSheets(sheets: BalanceSheet[]): BalanceSheet {
  if (sheets.length === 0) {
    console.error("ERROR mergeBalanceSheets: no balance sheets to merge");
    throw new Error("ERROR mergeBalanceSheets: no balance sheets to merge");
  }

  // check if all balance sheets have the same start and end dates
  const start = sheets[0].start;
  const end = sheets[0].end;

  if (
    sheets.some(
      (sheet) =>
        sheet.start.getTime() !== start.getTime() ||
        sheet.end.getTime() !== end.getTime()
    )
  ) {
    console.log(
      "==> sheets start",
      JSON.stringify(
        sheets.map((s) => s.start),
        null,
        2
      )
    );
    console.log(
      "==> sheets end",
      JSON.stringify(
        sheets.map((s) => s.end),
        null,
        2
      )
    );
    console.error(
      "ERROR mergeBalanceSheets: sheets have different start or end dates. " +
        "start: " +
        start +
        " end: " +
        end
    );
    throw new Error(
      "ERROR mergeBalanceSheets: sheets have different start or end dates. " +
        "start: " +
        start +
        " end: " +
        end
    );
  }

  const hashrateTHsMax_ = sheets.reduce(
    (acc, sheet) => acc + sheet.balance.hashrateTHsMax,
    0
  );
  const hashrateTHsMax = hashrateTHsMax_ > 0 ? hashrateTHsMax_ : 1;

  const balance0 = sheets[0].balance;

  // summarize the balance sheets
  const balances = sheets
    .map((s) => s.balance)
    .reduce(
      (acc, sheet) => {
        const uptimeWeight = new BigNumber(sheet.hashrateTHsMax).dividedBy(
          hashrateTHsMax
        );
        acc.uptime = new BigNumber(acc.uptime)
          .plus(new BigNumber(sheet.uptime).times(uptimeWeight))
          .toNumber();
        acc.hashrateTHs = new BigNumber(acc.hashrateTHs)
          .plus(sheet.hashrateTHs)
          .toNumber();
        acc.hashrateTHsMax = new BigNumber(acc.hashrateTHsMax)
          .plus(sheet.hashrateTHsMax)
          .toNumber();
        acc.btcSellPrice = sheet.btcSellPrice;
        acc.expenses.electricity.btc = new BigNumber(
          acc.expenses.electricity.btc
        )
          .plus(sheet.expenses.electricity.btc)
          .toNumber();
        acc.expenses.csm.btc = new BigNumber(acc.expenses.csm.btc)
          .plus(sheet.expenses.csm.btc)
          .toNumber();
        acc.expenses.operator.btc = new BigNumber(acc.expenses.operator.btc)
          .plus(sheet.expenses.operator.btc)
          .toNumber();
        acc.expenses.other.btc = new BigNumber(acc.expenses.other.btc)
          .plus(sheet.expenses.other.btc)
          .toNumber();
        acc.income.pool.btc = new BigNumber(acc.income.pool.btc)
          .plus(sheet.income.pool.btc)
          .toNumber();
        acc.income.other.btc = new BigNumber(acc.income.other.btc)
          .plus(sheet.income.other.btc)
          .toNumber();
        return acc;
      },
      {
        uptime: 0,
        hashrateTHs: 0,
        hashrateTHsMax: 0,
        btcSellPrice: 1,
        expenses: {
          electricity: {
            btc: 0,
            source: balance0
              ? balance0.expenses.electricity.source
              : FinancialSource.NONE,
          },
          csm: {
            btc: 0,
            source: balance0
              ? balance0.expenses.csm.source
              : FinancialSource.NONE,
          },
          operator: {
            btc: 0,
            source: balance0
              ? balance0.expenses.operator.source
              : FinancialSource.NONE,
          },
          other: {
            btc: 0,
            source: balance0
              ? balance0.expenses.other.source
              : FinancialSource.NONE,
          },
        },
        income: {
          pool: {
            btc: 0,
            source: balance0
              ? balance0.income.pool.source
              : FinancialSource.NONE,
          },
          other: {
            btc: 0,
            source: balance0
              ? balance0.income.other.source
              : FinancialSource.NONE,
          },
        },
      }
    );
  balances.expenses.csm.usd = new BigNumber(balances.expenses.csm.btc)
    .times(balances.btcSellPrice)
    .toNumber();
  balances.expenses.operator.usd = new BigNumber(balances.expenses.operator.btc)
    .times(balances.btcSellPrice)
    .toNumber();
  balances.expenses.other.usd = new BigNumber(balances.expenses.other.btc)
    .times(balances.btcSellPrice)
    .toNumber();
  balances.expenses.electricity.usd = new BigNumber(
    balances.expenses.electricity.btc
  )
    .times(balances.btcSellPrice)
    .toNumber();
  balances.income.pool.usd = new BigNumber(balances.income.pool.btc)
    .times(balances.btcSellPrice)
    .toNumber();
  balances.income.other.usd = new BigNumber(balances.income.other.btc)
    .times(balances.btcSellPrice)
    .toNumber();

  const mergedSheets: BalanceSheet = {
    start,
    end,
    days: calculateDaysBetweenDates(start, end),
    balance: balances,
  };
  return mergedSheets;
}
