/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";

import { convertToUTCStartOfDay } from "../../src/tools/date";
import { fetchFarmDailyReport } from "../../src/resources/miningreports/farm";
import { fetchSiteDailyReport } from "../../src/resources/miningreports/site";

import type { DailyMiningReport } from "../../src/types/MiningReport";
import type { MicroServiceMiningReportResponse } from "../../src/types/Api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || "undefined";
  const site = url.searchParams.get("site") || "undefined";
  const start_input = url.searchParams.get("start") || undefined;
  const end_input = url.searchParams.get("end") || undefined;
  const btc_input = url.searchParams.get("btc") || undefined;

  const todayUTC = convertToUTCStartOfDay(new Date());

  if (farm === "undefined" && site === "undefined") {
    return new Response("Please provide a farm or a site", { status: 400 });
  }

  if (btc_input === undefined) {
    return new Response("Please provide a btc price", { status: 400 });
  }

  if (btc_input && isNaN(Number(btc_input))) {
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
  if (start_input && end_input && new Date(start_input) >= todayUTC) {
    return new Response("Start date is greater than current date", {
      status: 400,
    });
  }

  if (end_input && new Date(end_input) > todayUTC) {
    return new Response("End date is greater than current date", {
      status: 400,
    });
  }

  const btc = Number(btc_input);

  try {
    if (site === "undefined") {
      // Farm report
      console.log("api farm", farm);
      const response = await fetchFarmDailyReport(
        farm,
        btc,
        start_input,
        end_input
      );
      if (!response.ok) {
        return new Response(response.message, {
          status: response.status,
        });
      }

      //console.log("api farm response", response.report.length);

      const report: DailyMiningReport[] = response.report;
      const numberOfDays = report.length;
      const dateStart = numberOfDays > 0 ? new Date(report[0].day) : undefined;
      const dateEnd =
        numberOfDays > 0 ? new Date(report[numberOfDays - 1].day) : undefined;
      // add a day to the end date
      if (dateEnd) dateEnd.setDate(dateEnd.getDate() + 1);

      const apiResponse: MicroServiceMiningReportResponse = {
        farm: farm,
        start: dateStart,
        end: dateEnd,
        numberOfDays: response.report.length,
        btcSellPrice: btc,
        data: response.report,
      };

      return new Response(JSON.stringify(apiResponse), {
        headers: { "content-type": "application/json" },
      });
    } else {
      // Site report
      const response = await fetchSiteDailyReport(
        farm,
        site,
        btc,
        start_input,
        end_input
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
    console.error("Error api site " + error);
    return new Response("Failed to compute mining report! " + error, {
      status: 500,
    });
  }
};
