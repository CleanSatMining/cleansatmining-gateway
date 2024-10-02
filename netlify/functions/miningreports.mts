/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";

import { convertToUTCStartOfDay } from "../../src/tools/date";
import { fetchFarmDailyReport } from "../../src/resources/farm";
import { fetchSiteDailyReport } from "../../src/resources/site";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || "undefined";
  const site = url.searchParams.get("site") || "undefined";
  const start = url.searchParams.get("start") || undefined;
  const end = url.searchParams.get("end") || undefined;
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

  if (start && !Date.parse(start)) {
    return new Response("Invalid start date", { status: 400 });
  }
  if (end && !Date.parse(end)) {
    return new Response("Invalid end date", { status: 400 });
  }

  if (start && end && new Date(start) > new Date(end)) {
    return new Response("Start date is greater than end date", { status: 400 });
  }
  if (start && end && new Date(start) > todayUTC) {
    return new Response("Start date is greater than current date", {
      status: 400,
    });
  }

  if (end && new Date(end) > todayUTC) {
    return new Response("End date is greater than current date", {
      status: 400,
    });
  }

  const btc = Number(btc_input);

  try {
    if (site === "undefined") {
      // Farm report
      console.log("api farm", farm);
      const response = await fetchFarmDailyReport(farm, btc, start, end);
      if (!response.ok) {
        return new Response(response.message, {
          status: response.status,
        });
      }

      console.log("api farm response", response.report.length);

      return new Response(JSON.stringify(response.report), {
        headers: { "content-type": "application/json" },
      });
    } else {
      // Site report
      const response = await fetchSiteDailyReport(farm, site, btc, start, end);

      if (!response.ok) {
        return new Response(response.message, { status: response.status });
      }

      return new Response(JSON.stringify(response.report), {
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
