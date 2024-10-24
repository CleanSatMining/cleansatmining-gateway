/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";

import { convertToUTCStartOfDay } from "../../src/tools/date";
import { fetchFarm } from "../../src/resources/farm";
import { fetchSite } from "../../src/resources/site";
import { fetchMiningReport } from "../../src/resources/miningreports/miningreport.common";
import { calculateFarmBalanceSheet } from "../../src/tools/balancesheets/farm";
import { calculateSiteBalanceSheet as calculateSiteDetailedBalanceSheet } from "../../src/tools/balancesheets/site";

import { MicroServiceMiningReportResponse } from "../../src/types/Api";
import { Farm, Site } from "../../src/types/supabase.extend";
import { DetailedBalanceSheet } from "../../src/types/BalanceSeet";
import {
  FinancialSource,
  isValidFinancialSource,
} from "../../src/types/MiningReport";

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

  const btc = Number(btc_input);
  const financialSources = financial_sources
    ?.split(",")
    .map((source) => source as FinancialSource);

  console.log(
    "MICROSERVICE BALANCE SHEET",
    farm,
    site,
    "$" + btc,
    start_input,
    end_input
  );

  try {
    if (site === undefined) {
      // Fetch farm

      const farmResponse = await fetchFarm(farm);

      if (!farmResponse.ok || farmResponse.farmData === undefined) {
        return new Response(farmResponse.statusText, {
          status: farmResponse.status,
        });
      }

      const farmData: Farm = farmResponse.farmData;

      // Fetch farm report
      const microserviceResponse = await fetchMiningReport(
        farm,
        undefined,
        btc,
        start_input,
        end_input,
        financialSources
      );

      if (!microserviceResponse.ok) {
        return new Response(microserviceResponse.message, {
          status: microserviceResponse.status,
        });
      }

      //const startInput = start_input ? new Date(start_input) : undefined;
      //const endInput = end_input ? new Date(end_input) : undefined;

      const report: MicroServiceMiningReportResponse =
        microserviceResponse.report;

      const balance: DetailedBalanceSheet = calculateFarmBalanceSheet(
        farmData,
        report.data,
        btc
      );

      return new Response(JSON.stringify(balance), {
        headers: { "content-type": "application/json" },
      });
    } else {
      // Fetch site
      const siteResponse = await fetchSite(farm, site);

      if (!siteResponse.ok || siteResponse.siteData === undefined) {
        return new Response(siteResponse.statusText, {
          status: siteResponse.status,
        });
      }

      const siteData: Site = await siteResponse.siteData;

      // Fetch farm report
      const microserviceResponse = await fetchMiningReport(
        farm,
        site,
        btc,
        start_input,
        end_input,
        financialSources
      );

      if (!microserviceResponse.ok) {
        return new Response(microserviceResponse.message, {
          status: microserviceResponse.status,
        });
      }

      console.log(
        "=> FETCH MINING REPORT",
        JSON.stringify(microserviceResponse.report, null, 2)
      );

      const report: MicroServiceMiningReportResponse =
        microserviceResponse.report;

      const balance: DetailedBalanceSheet = calculateSiteDetailedBalanceSheet(
        siteData,
        report.data,
        btc,
        start_input ? new Date(start_input) : undefined,
        end_input ? new Date(end_input) : undefined
      );

      return new Response(JSON.stringify(balance), {
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error api balance sheet " + error);
    return new Response("Failed to compute mining balance sheet! " + error, {
      status: 500,
    });
  }
};
