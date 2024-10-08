import { getQueryTableFields, getQueryTableSelect } from "./supabase.config";

export type SupabaseApi = {
  name: string;
  url: string;
  method: string;
  fields: string[];
  headers?: Record<string, string>;
  parameters: {
    select: {
      full: () => string;
      partial: () => string;
    };
  };
};

export type GatewayApi = {
  name: string;
  url:
    | ((params: string) => string)
    | ((param1: string, param2?: string) => string)
    | string;
  method: string;
  headers?: Record<string, string>;
  parameters?: Record<string, string>;
};

export type MicroServiceApi = {
  name: string;
  url: (farm: string, site: string | undefined, btc: number) => string;
  method: string;
  headers?: Record<string, string>;
  parameters?: Record<string, string>;
};

export function createParameters(parameters: Record<string, string>): string {
  let result = "";
  for (const key in parameters) {
    if (parameters.hasOwnProperty(key)) {
      const value = parameters[key];
      result += key + "=" + value + "&";
    }
  }
  return result === "" ? "" : "?" + result;
}

export const GET_SUPABASE_FARMS: SupabaseApi = {
  name: "GET_FARMS",
  url: "/rest/v1/farms",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  fields: getQueryTableFields("farms"),
  parameters: {
    select: {
      full: () => getQueryTableSelect("farms"),
      partial: () => {
        return "";
      },
    },
  },
};

export const GET_SUPABASE_SITES: SupabaseApi = {
  name: "GET_SITES",
  url: "/rest/v1/sites",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  fields: getQueryTableFields("sites"),
  parameters: {
    select: {
      full: () => getQueryTableSelect("sites"),
      partial: () => {
        return "";
      },
    },
  },
};

export const INSERT_SUPABASE_MINING: SupabaseApi = {
  name: "INSERT_MINING",
  url: "/rest/v1/mining",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  fields: getQueryTableFields("sites"),
  parameters: {
    select: {
      full: () => getQueryTableSelect("mining"),
      partial: () => {
        return "";
      },
    },
  },
};

export const GET_GATEWAY_FARM: GatewayApi = {
  name: "GET_GATEWAY_FARM",
  url: (farm: string) => `/api/farms/${farm}`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

export const GET_GATEWAY_FARMS: GatewayApi = {
  name: "GET_GATEWAY_FARM",
  url: `/api/farms`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

export const GET_GATEWAY_SITE: GatewayApi = {
  name: "GET_GATEWAY_FARM",
  url: (farm: string, site?: string) =>
    site ? `/api/farms/${farm}/sites/${site}` : `/api/farms/${farm}/sites`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

export const GET_GATEWAY_MINING_HISTORY: GatewayApi = {
  name: "GET_GATEWAY_MINING_HISTORY",
  url: (farm: string, site?: string) =>
    site
      ? `/api/farms/${farm}/sites/${site}/mining/history`
      : `/api/farms/${farm}/mining/history`,

  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  parameters: {
    start: "start",
    end: "end",
  },
};

export const GET_GATEWAY_FINANCIAL_STATEMENTS: GatewayApi = {
  name: "GET_GATEWAY_FINANCIAL_STATEMENTS",
  url: (farm: string, site?: string) =>
    site
      ? `/api/farms/${farm}/sites/${site}/finance/statements`
      : `/api/farms/${farm}/finance/statements`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  parameters: {
    start: "start",
    end: "end",
  },
};

export const GET_MICROSERVICE_MINING_REPORT: MicroServiceApi = {
  name: "GET_MICROSERVICE_MINING_REPORT",
  url: (farm: string, site: string | undefined, btc: number) =>
    `/.netlify/functions/miningreports?farm=${farm}&btc=${btc}${
      site ? "&site=" + site : ""
    }`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  parameters: {
    start: "start",
    end: "end",
  },
};
