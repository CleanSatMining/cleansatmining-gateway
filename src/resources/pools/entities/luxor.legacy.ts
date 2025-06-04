import { APIMiningPoolResponse, DayPoolData } from "@/types/Pool";
import { Site } from "@/types/supabase.extend";
import BigNumber from "bignumber.js";
import { calculateSitePower } from "@/tools/equipment/site";

/* ─────────── Types communs ─────────── */

type CurrencyType = "BTC";
type RevenueType = "MINING";
type TickSize = "1d";

export interface Subaccount {
  id: number;
  name: string;
}

/* Revenue endpoint -------------------------------------------------------- */

export interface RevenueBreakdown {
  currency_type: CurrencyType;
  revenue_type: RevenueType;
  revenue: number;
}
export interface RevenueItem {
  date_time: string;
  revenue: RevenueBreakdown;
}
export interface RevenueResponse {
  currency_type: CurrencyType;
  subaccounts: Subaccount[];
  start_date: string;
  end_date: string;
  revenue: RevenueItem[];
}

/* Hashrate‑efficiency endpoint ------------------------------------------- */

export interface HashrateEfficiencyItem {
  date_time: string;
  hashrate: string; // H/s
  efficiency: number;
}
export interface Pagination {
  page_number: number;
  page_size: number;
  item_count: number;
  previous_page_url: string | null;
  next_page_url: string | null;
}
export interface HashrateEfficiencyResponse {
  currency_type: CurrencyType;
  subaccounts: Subaccount[];
  start_date: string;
  end_date: string;
  tick_size: TickSize;
  hashrate_efficiency: HashrateEfficiencyItem[];
  pagination: Pagination;
}

/* ───────────────────────────────────────────────────────────────────────── */

export async function luxorLegacyHistory(
  daysBack: number,
  site: Site
): Promise<APIMiningPoolResponse> {
  const { username, url: baseUrl } = site.contract.api;
  const LUXOR_KEY = process.env.LUXOR_D_API_KEY_ACCOUNT;
  if (!LUXOR_KEY) {
    throw new Error(
      "Variable d’environnement LUXOR_D_API_KEY_ACCOUNT manquante"
    );
  }

  /* Fenêtre temporelle ---------------------------------------------------- */
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysBack);
  const start = startDate.toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);

  /* URLs ------------------------------------------------------------------ */
  const revenueUrl =
    `${baseUrl}revenue/BTC?start_date=${start}&end_date=${end}` +
    `&subaccount_names=${encodeURIComponent(username)}`;

  const hashrateUrl =
    `${baseUrl}hashrate-efficiency/BTC?start_date=${start}&end_date=${end}` +
    `&tick_size=1d&page_number=1&page_size=${daysBack}` +
    `&subaccount_names=${encodeURIComponent(username)}`;

  /* Appels parallèles ----------------------------------------------------- */
  const headers = {
    authorization: LUXOR_KEY,
    "Content-Type": "application/json",
  };

  console.log("Luxor API", site.slug);
  console.log("Luxor API revenue URL:", revenueUrl);
  console.log("Luxor API hashrate URL:", hashrateUrl);

  //await fetch(revenueUrl, { headers })

  const [revenueRes, hashrateRes] = await Promise.all([
    fetch(revenueUrl, { headers }),
    fetch(hashrateUrl, { headers }),
  ]);
  if (!revenueRes.ok || !hashrateRes.ok) {
    console.error(JSON.stringify(revenueRes.text, null, 2));
    console.error(JSON.stringify(hashrateRes, null, 2));
    throw new Error(`Luxor API → ${revenueRes.status} / ${hashrateRes.status}`);
  }

  const revenueJson = (await revenueRes.json()) as RevenueResponse;
  const hashrateJson = (await hashrateRes.json()) as HashrateEfficiencyResponse;

  /* Map date → revenu BTC ------------------------------------------------- */
  const revenueMap = new Map<string, BigNumber>();
  for (const { date_time, revenue } of revenueJson.revenue ?? []) {
    revenueMap.set(date_time.slice(0, 10), new BigNumber(revenue.revenue));
  }

  /* Transformation finale ------------------------------------------------- */
  const days: DayPoolData[] = (hashrateJson.hashrate_efficiency ?? []).map(
    ({ date_time, hashrate, efficiency }) => {
      const date = date_time.slice(0, 10); // YYYY‑MM‑DD

      /* Hashrate mesuré (TH/s) */
      const hashrateTHsBN = new BigNumber(hashrate).dividedBy(1e12);

      /* Puissance max théorique à cette date */
      const { hashrateTHs: hashrateMax, units } = calculateSitePower(
        site,
        new Date(date_time)
      );
      const hashrateMaxBN = new BigNumber(hashrateMax);

      /* Uptime % = mesuré / max × 100 */
      const uptimePctBN = hashrateMaxBN.isZero()
        ? new BigNumber(0)
        : hashrateTHsBN.dividedBy(hashrateMaxBN).times(100);

      /* Minutes d’uptime = % × 1440 */
      const uptimeTotalMinutesBN = uptimePctBN.dividedBy(100).times(1440);

      /* Machines réellement up = units × % */
      const uptimeTotalMachinesBN = uptimePctBN
        .dividedBy(100)
        .times(units)
        .decimalPlaces(0, BigNumber.ROUND_HALF_UP);

      return {
        site: site.slug,
        date,
        efficiency,
        hashrateTHs: hashrateTHsBN.toNumber(),
        revenue: revenueMap.get(date)?.toNumber() ?? 0,
        uptimePercentage: uptimePctBN.toNumber(),
        uptimeTotalMinutes: uptimeTotalMinutesBN.toNumber(),
        uptimeTotalMachines: uptimeTotalMachinesBN.toNumber(),
      };
    }
  );

  return {
    days,
    site: site.slug,
    updated: Date.now(),
  };
}
