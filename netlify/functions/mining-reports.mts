/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";

import { convertToUTCStartOfDay } from "../../src/tools/date";
import { fetchFarmDailyReport } from "../../src/resources/miningreports/farm";
import { fetchSiteDailyMiningReport } from "../../src/resources/miningreports/site";

import {
  FinancialSource,
  isValidFinancialSource,
  type DailyMiningReport,
} from "../../src/types/MiningReport";
import type { MicroServiceMiningReportResponse } from "../../src/types/Api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || undefined;
  const site = url.searchParams.get("site") || undefined;
  const start_input = url.searchParams.get("start") || undefined;
  const end_input = url.searchParams.get("end") || undefined;
  const btc_input = url.searchParams.get("btc") || undefined;
  const financial_sources =
    url.searchParams.get("financial_sources") || undefined;
  const detail = url.searchParams.get("detail") || undefined;

  const todayUTC = convertToUTCStartOfDay(new Date());

  if (farm === undefined) {
    return new Response("Please provide a farm", { status: 400 });
  }

  if (btc_input === undefined) {
    return new Response("Please provide a btc price", { status: 400 });
  }

  if (btc_input && (isNaN(Number(btc_input)) || Number(btc_input) <= 0)) {
    return new Response("Invalid btc price", { status: 400 });
  }

  if (start_input && !Date.parse(start_input)) {
    return new Response("Invalid start date", { status: 400 });
  }
  if (end_input && !Date.parse(end_input)) {
    return new Response("Invalid end date", { status: 400 });
  }

  if (
    start_input &&
    end_input &&
    new Date(start_input) >= new Date(end_input)
  ) {
    return new Response("Start date is greater than end date", { status: 400 });
  }
  if (start_input && new Date(start_input) >= todayUTC) {
    return new Response("Start date is greater than current date", {
      status: 400,
    });
  }

  if (end_input && new Date(end_input) > todayUTC) {
    return new Response("End date is greater than current date", {
      status: 400,
    });
  }

  if (
    financial_sources &&
    !financial_sources
      .split(",")
      .every((source) => isValidFinancialSource(source))
  ) {
    //!isValidFinancialSource(financial_sources)
    return new Response("Invalid financial_sources", { status: 400 });
  }

  // check if detail is a boolean
  if (detail && detail !== "true" && detail !== "false") {
    return new Response("Invalid detail", { status: 400 });
  }

  const detailRequested = detail === "true";
  const btc = Number(btc_input);
  const financialSources = financial_sources
    ?.split(",")
    .map((source) => source as FinancialSource);

  try {
    if (site === undefined) {
      // Farm report
      console.log("api farm", farm, "with detail", detailRequested);
      const dailyReportsResponse = await fetchFarmDailyReport(
        farm,
        btc,
        start_input,
        end_input,
        financialSources,
        detailRequested
      );
      if (!dailyReportsResponse.ok) {
        return new Response(dailyReportsResponse.message, {
          status: dailyReportsResponse.status,
        });
      }

      //console.log("api farm response", response.report.length);

      const report: DailyMiningReport[] = dailyReportsResponse.report;
      const numberOfDays = report.length;
      const dateStart = numberOfDays > 0 ? new Date(report[0].day) : undefined;
      const dateEnd =
        numberOfDays > 0 ? new Date(report[numberOfDays - 1].day) : undefined;
      // add a day to the end date
      if (dateEnd) dateEnd.setDate(dateEnd.getDate() + 1);

      const miningReportsReturn: MicroServiceMiningReportResponse = {
        farm: farm,
        start: dateStart,
        end: dateEnd,
        numberOfDays: dailyReportsResponse.report.length,
        btcSellPrice: btc,
        data: dailyReportsResponse.report,
      };

      return new Response(JSON.stringify(miningReportsReturn), {
        headers: { "content-type": "application/json" },
      });
    } else {
      // Site report
      const response = await fetchSiteDailyMiningReport(
        farm,
        site,
        btc,
        start_input,
        end_input,
        financialSources
      );

      if (!response.ok) {
        return new Response(response.message, { status: response.status });
      }

      const report: DailyMiningReport[] = response.report;
      const numberOfDays = report.length;
      const dateStart = numberOfDays > 0 ? new Date(report[0].day) : undefined;
      const dateEnd =
        numberOfDays > 0 ? new Date(report[numberOfDays - 1].day) : undefined;
      // add a day to the end date
      if (dateEnd) dateEnd.setDate(dateEnd.getDate() + 1);

      const apiResponse: MicroServiceMiningReportResponse = {
        farm: farm,
        site: site,
        start: dateStart,
        end: dateEnd,
        numberOfDays: response.report.length,
        btcSellPrice: btc,
        data: response.report,
      };

      return new Response(JSON.stringify(apiResponse), {
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error api mining report " + error);
    return new Response("Failed to compute mining report! " + error, {
      status: 500,
    });
  }
};
