import { Config } from "./supabase.config";
import { TABLES } from "./supabase.init";

export type Api = {
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

export function getTableFields(tablename: string): string[] {
  const table = TABLES[tablename];
  const tableType = table.type;
  if (!tableType) {
    console.log("Table " + tablename + " not found");
    throw new Error("Table " + tablename + " not found");
  }
  const fields: string[] = Object.keys(table.row) as string[];

  return fields;
}

export function getSelectTable(tablename: string): string {
  const table = TABLES[tablename];
  const tableType = table.type;
  if (!tableType) {
    console.log("Table " + tablename + " not found");
    throw new Error("Table " + tablename + " not found");
  }

  const fields: string[] = Object.keys(table.row) as string[];

  if (Config[tablename]) {
    const have = Config[tablename].have;
    for (const item of have) {
      const itemFields = getSelectTable(item.table);
      fields.push(item.table + "(" + itemFields + ")");
    }
  }

  return fields.join(",");
}

export const GET_FARMS: Api = {
  name: "GET_FARMS",
  url: "/rest/v1/farms",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  fields: getTableFields("farms"),
  parameters: {
    select: {
      full: () => getSelectTable("farms"),
      partial: () => {
        return "";
      },
    },
  },
};

export const GET_SITES: Api = {
  name: "GET_SITES",
  url: "/rest/v1/sites",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  fields: getTableFields("sites"),
  parameters: {
    select: {
      full: () => getSelectTable("sites"),
      partial: () => {
        return "";
      },
    },
  },
};

export const INSERT_MINING: Api = {
  name: "INSERT_MINING",
  url: "/rest/v1/mining",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  fields: getTableFields("sites"),
  parameters: {
    select: {
      full: () => getSelectTable("mining"),
      partial: () => {
        return "";
      },
    },
  },
};
