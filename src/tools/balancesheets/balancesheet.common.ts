import { resolveFinancialSource } from "@/types/FinancialSatement";
import { FinancialSource, MiningEquipment } from "@/types/MiningReport";
import { DailyMiningReport, MiningReport } from "@/types/MiningReport";
import { BigNumber } from "bignumber.js";
import {
  calculateDaysBetweenDates,
  calculateFullDaysBetweenDates,
} from "@/tools/date";
import { BalanceSheet } from "@/types/BalanceSeet";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";
import { concatUniqueAsics } from "../equipment/asics";

export function calculateBalanceSheet(
  data: DailyMiningReport[],
  btcPrice?: number,
  startDay?: Date,
  endDay?: Date
): BalanceSheet {
  console.log(
    "    => calculateBalanceSheet START",
    data.length,
    startDay,
    endDay
  );
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
  console.log(
    "    => calculateBalanceSheet START",
    startDayReport,
    endDayReport
  );
  if (startDayReport === undefined || endDayReport === undefined) {
    console.log(
      "WARN calculateBalanceSheet NO MINING REPORTS",
      JSON.stringify(
        {
          "Data Length ": data.length,
          "Filtered Data length ": filteredData.length,
          "start data ": startDay,
          "end data ": endDay,
        },
        null,
        2
      )
    );
    /*console.warn(
      "WARN calculateBalanceSheet NO MINING REPORTS",
      JSON.stringify(
        {
          "Data Length ": data.length,
          "Filtered Data length ": filteredData.length,
          "start data ": startDay,
          "end data ": endDay,
        },
        null,
        2
      )
    );*/
    return getEmptyBalanceSheet(btcPrice, startDay, endDay);
  }

  const start = startDay ?? startDayReport;
  const end = endDay ?? endDayReport;

  const miningPerformance = calculateAverageMiningPerformance(
    filteredData,
    btcPrice
  );

  const balancesheet: BalanceSheet = {
    start: start,
    end: end,
    days: calculateDaysBetweenDates(start, end),
    balance: miningPerformance,
    equipments: {
      uptime: miningPerformance.uptime,
      hashrateTHs: miningPerformance.hashrateTHs,
      hashrateTHsMax: miningPerformance.equipements.hashrateTHsMax,
      powerWMax: miningPerformance.equipements.powerWMax,
      asics: miningPerformance.equipements.asics,
    },
  };

  return balancesheet;
}

function calculateAverageMiningPerformance(
  data: DailyMiningReport[],
  btcPrice?: number
): MiningReport {
  if (data.length === 0) {
    return {
      uptime: 0,
      hashrateTHs: 0,
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
      equipements: {
        asics: [],
        hashrateTHsMax: 0,
        powerWMax: 0,
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
      const asics = concatUniqueAsics(
        acc.equipements.asics,
        report.equipements.asics
      );
      acc.uptime = new BigNumber(report.uptime)
        .dividedBy(days)
        .plus(acc.uptime)
        .toNumber();
      acc.hashrateTHs = new BigNumber(report.hashrateTHs)
        .dividedBy(days)
        .plus(acc.hashrateTHs)
        .toNumber();
      acc.equipements.hashrateTHsMax = new BigNumber(
        report.equipements.hashrateTHsMax
      )
        .dividedBy(days)
        .plus(acc.equipements.hashrateTHsMax)
        .toNumber();
      acc.equipements.powerWMax = new BigNumber(report.equipements.powerWMax)
        .dividedBy(days)
        .plus(acc.equipements.powerWMax)
        .toNumber();
      acc.equipements.asics = asics;
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
      equipements: {
        asics: [],
        hashrateTHsMax: 0,
        powerWMax: 0,
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
  endDay: Date = new Date(),
  equipments?: MiningEquipment
): BalanceSheet {
  const equipements = equipments ?? {
    asics: [],
    hashrateTHsMax: 0,
    powerWMax: 0,
  };
  return {
    start: startDay,
    end: endDay,
    days: calculateDaysBetweenDates(startDay, endDay),
    equipments: {
      asics: equipements.asics,
      hashrateTHsMax: equipements.hashrateTHsMax,
      powerWMax: equipements.powerWMax,
      hashrateTHs: 0,
      uptime: 0,
    },
    balance: {
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

/**
 *
 * @param sheets merge balance sheets
 * WARN:
 * - all balance sheets must have the same start and end dates
 * - the balance sheets must have different containers
 * @returns
 */
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

  // gets all the containers id
  const containersIds: number[] = [];
  for (const sheet of sheets) {
    const containerIds = sheet.equipments.asics.map((asic) => asic.containerId);
    containersIds.push(...containerIds);
  }
  // check if all containers are different
  if (containersIds.length !== new Set(containersIds).size) {
    console.error("ERROR mergeBalanceSheets: sheets have same containers");
    throw new Error("ERROR mergeBalanceSheets: sheets have same containers");
  }

  const hashrateTHsMax_ = sheets.reduce(
    (acc, sheet) => acc + sheet.equipments.hashrateTHsMax,
    0
  );
  const hashrateTHsMax = hashrateTHsMax_ > 0 ? hashrateTHsMax_ : 1;

  // summarize the balance sheets
  const mergedSheets = sheets.reduce((acc, sheet) => {
    const uptimeWeight = new BigNumber(
      sheet.equipments.hashrateTHsMax
    ).dividedBy(hashrateTHsMax);
    acc.equipments.uptime = new BigNumber(acc.equipments.uptime)
      .plus(new BigNumber(sheet.equipments.uptime).times(uptimeWeight))
      .toNumber();
    acc.equipments.hashrateTHs = new BigNumber(acc.equipments.hashrateTHs)
      .plus(sheet.equipments.hashrateTHs)
      .toNumber();
    acc.equipments.hashrateTHsMax = new BigNumber(acc.equipments.hashrateTHsMax)
      .plus(sheet.equipments.hashrateTHsMax)
      .toNumber();
    acc.equipments.powerWMax = new BigNumber(acc.equipments.powerWMax)
      .plus(sheet.equipments.powerWMax)
      .toNumber();
    acc.equipments.asics = acc.equipments.asics.concat(sheet.equipments.asics);
    acc.balance.btcSellPrice = sheet.balance.btcSellPrice;

    // sum btc values
    acc.balance.expenses.electricity.btc = new BigNumber(
      acc.balance.expenses.electricity.btc
    )
      .plus(sheet.balance.expenses.electricity.btc)
      .toNumber();
    acc.balance.expenses.csm.btc = new BigNumber(acc.balance.expenses.csm.btc)
      .plus(sheet.balance.expenses.csm.btc)
      .toNumber();
    acc.balance.expenses.operator.btc = new BigNumber(
      acc.balance.expenses.operator.btc
    )
      .plus(sheet.balance.expenses.operator.btc)
      .toNumber();
    acc.balance.expenses.other.btc = new BigNumber(
      acc.balance.expenses.other.btc
    )
      .plus(sheet.balance.expenses.other.btc)
      .toNumber();
    acc.balance.income.pool.btc = new BigNumber(acc.balance.income.pool.btc)
      .plus(sheet.balance.income.pool.btc)
      .toNumber();
    acc.balance.income.other.btc = new BigNumber(acc.balance.income.other.btc)
      .plus(sheet.balance.income.other.btc)
      .toNumber();

    // resolve sources
    acc.balance.expenses.electricity.source = resolveFinancialSource(
      acc.balance.expenses.electricity.source,
      sheet.balance.expenses.electricity.source
    );
    acc.balance.expenses.csm.source = resolveFinancialSource(
      acc.balance.expenses.csm.source,
      sheet.balance.expenses.csm.source
    );
    acc.balance.expenses.operator.source = resolveFinancialSource(
      acc.balance.expenses.operator.source,
      sheet.balance.expenses.operator.source
    );
    acc.balance.expenses.other.source = resolveFinancialSource(
      acc.balance.expenses.other.source,
      sheet.balance.expenses.other.source
    );
    acc.balance.income.pool.source = resolveFinancialSource(
      acc.balance.income.pool.source,
      sheet.balance.income.pool.source
    );
    acc.balance.income.other.source = resolveFinancialSource(
      acc.balance.income.other.source,
      sheet.balance.income.other.source
    );
    return acc;
  }, getEmptyBalanceSheet(sheets[0].balance.btcSellPrice, start, end));

  // compute usd values
  mergedSheets.balance.expenses.csm.usd = new BigNumber(
    mergedSheets.balance.expenses.csm.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();
  mergedSheets.balance.expenses.operator.usd = new BigNumber(
    mergedSheets.balance.expenses.operator.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();
  mergedSheets.balance.expenses.other.usd = new BigNumber(
    mergedSheets.balance.expenses.other.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();
  mergedSheets.balance.expenses.electricity.usd = new BigNumber(
    mergedSheets.balance.expenses.electricity.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();
  mergedSheets.balance.income.pool.usd = new BigNumber(
    mergedSheets.balance.income.pool.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();
  mergedSheets.balance.income.other.usd = new BigNumber(
    mergedSheets.balance.income.other.btc
  )
    .times(mergedSheets.balance.btcSellPrice)
    .toNumber();

  /*const mergedSheets: BalanceSheet = {
    start,
    end,
    days: calculateDaysBetweenDates(start, end),
    balance: balances,
  };*/
  return mergedSheets;
}
