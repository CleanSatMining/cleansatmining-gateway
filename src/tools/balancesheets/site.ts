import { BalanceSheet, DetailedBalanceSheet } from "@/types/BalanceSeet";
import { DailyMiningReport, FinancialSource } from "@/types/MiningReport";
import { Site } from "@/types/supabase.extend";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";
import {
  calculateSitePowerHistory,
  getSiteEquipments,
} from "../equipment/site";
import { calculateBalanceSheet } from "./balancesheet.common";
import { calculateDaysBetweenDates } from "../date";
import { calculateGrossIncome } from "../simulator";
import { FeeRates } from "@/types/Simulator";
import BigNumber from "bignumber.js";

export function calculateSiteBalanceSheet(
  site: Site,
  miningReports: DailyMiningReport[],
  btcPrice: number,
  startInput?: Date,
  endInput?: Date
): DetailedBalanceSheet {
  if (miningReports.length === 0) {
    console.log("     => WARN No mining reports found for site", site.slug);
    return getEmptyDetailedBalanceSheet(site, btcPrice, startInput, endInput);
  }

  const { start: startDay, end: endDay } =
    getDailyMiningReportsPeriod(miningReports);

  if (!startDay || !endDay) {
    throw new Error(
      "Cannot calculate balance sheet without start and end date"
    );
  }

  const powerHistory = calculateSitePowerHistory(site, startDay, endDay);
  const sheet: BalanceSheet = calculateSiteSummaryBalanceSheet(
    site,
    miningReports,
    btcPrice,
    startDay,
    endDay
  );

  const details: BalanceSheet[] = powerHistory.map((power) => {
    const balance = calculateSiteSummaryBalanceSheet(
      site,
      miningReports.filter(
        (report) =>
          new Date(power.start).getTime() <= new Date(report.day).getTime() &&
          new Date(report.day).getTime() <= new Date(power.end).getTime()
      ),
      btcPrice
    );
    return balance;
  });

  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    equipments: sheet.equipments,
    details,
  };
}

function calculateSiteSummaryBalanceSheet(
  site: Site,
  miningReports: DailyMiningReport[],
  btcPrice: number,
  startDay?: Date,
  endDay?: Date
) {
  const sheet = calculateBalanceSheet(
    miningReports,
    btcPrice,
    startDay,
    endDay
  );

  updateSheetBalanceTaxes(site, sheet, btcPrice);

  // calculate the revenue
  const revenue = new BigNumber(sheet.balance.incomes.mining.btc)
    .plus(sheet.balance.incomes.other.btc)
    .minus(sheet.balance.expenses.electricity.btc)
    .minus(sheet.balance.expenses.csm.btc)
    .minus(sheet.balance.expenses.operator.btc)
    .minus(sheet.balance.expenses.other.btc)
    .toNumber();
  sheet.balance.revenue.btc = revenue;
  sheet.balance.revenue.source = sheet.balance.expenses.electricity.source;
  sheet.balance.revenue.usd = new BigNumber(revenue).times(btcPrice).toNumber();

  return sheet;
}

function updateSheetBalanceTaxes(
  site: Site,
  sheet: BalanceSheet,
  btcPrice: number
): BalanceSheet {
  const csmTaxes: FeeRates = {
    taxRate: site.contract.csmTaxRate,
    powerTaxUsd: site.contract.csmPowerTax,
    profitShareRate: site.contract.csmProfitSharing,
  };
  const opTaxes: FeeRates = {
    taxRate: site.contract.opTaxRate,
    powerTaxUsd: site.contract.opPowerTax,
    profitShareRate: site.contract.opProfitSharing,
  };

  // set real tax values
  const grossIncome = calculateGrossIncome(
    sheet.balance.incomes.mining.btc,
    sheet.balance.expenses.electricity.btc,
    site.contract.electricityPrice,
    csmTaxes,
    opTaxes,
    btcPrice,
    sheet.balance.incomes.other.btc
  );

  sheet.balance.expenses.operator.btc =
    grossIncome.cost.operator.btc > 0 ? grossIncome.cost.operator.btc : 0;
  sheet.balance.expenses.csm.btc =
    grossIncome.cost.csm.btc > 0 ? grossIncome.cost.csm.btc : 0;
  sheet.balance.expenses.operator.usd =
    grossIncome.cost.operator.usd > 0 ? grossIncome.cost.operator.usd : 0;
  sheet.balance.expenses.csm.usd =
    grossIncome.cost.csm.usd > 0 ? grossIncome.cost.csm.usd : 0;

  return sheet;
}

export function getEmptyDetailedBalanceSheet(
  site: Site,
  btcPrice: number,
  startInput?: Date,
  endInput?: Date
): DetailedBalanceSheet {
  const siteStart = site.started_at ? new Date(site.started_at) : undefined;
  const siteClose = site.closed_at ? new Date(site.closed_at) : undefined;

  const calculStart = startInput ?? siteStart ?? new Date();
  const calculEnd = endInput ?? siteClose ?? new Date();

  const equipements = getSiteEquipments(site, calculStart);

  return {
    start: calculStart,
    end: calculEnd,
    days: calculateDaysBetweenDates(calculStart, calculEnd),
    details: [],
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
        electricity: {
          btc: 0,
          source: FinancialSource.NONE,
        },
        csm: {
          btc: 0,
          source: FinancialSource.NONE,
        },
        operator: {
          btc: 0,
          source: FinancialSource.NONE,
        },
        other: {
          btc: 0,
          source: FinancialSource.NONE,
        },
      },
      incomes: {
        mining: {
          btc: 0,
          source: FinancialSource.NONE,
        },
        other: {
          btc: 0,
          source: FinancialSource.NONE,
        },
      },
      revenue: {
        btc: 0,
        source: FinancialSource.NONE,
      },
    },
  };
}
