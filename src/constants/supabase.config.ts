import { TableType } from "@/types/supabase.extend";
import { TABLES } from "./supabase.init";

export enum ObjectType {
  Object = "object",
  Array = "array",
}

export type TableConfig = {
  have: {
    field: string;
    table: TableType;
    type: ObjectType;
  }[];
};

export const Config: Record<string, TableConfig> = {
  farms: {
    have: [
      {
        field: "sites",
        table: "sites",
        type: ObjectType.Array,
      },
      {
        field: "society",
        table: "societies",
        type: ObjectType.Object,
      },
      {
        field: "token",
        table: "tokens",
        type: ObjectType.Object,
      },
      {
        field: "vault",
        table: "vaults",
        type: ObjectType.Object,
      },
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
      {
        field: "fundraisings",
        table: "fundraisings",
        type: ObjectType.Array,
      },
    ],
  },
  sites: {
    have: [
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
      {
        field: "operator",
        table: "operators",
        type: ObjectType.Object,
      },
      {
        field: "powerPlant",
        table: "powerPlants",
        type: ObjectType.Object,
      },
      {
        field: "containers",
        table: "containers",
        type: ObjectType.Array,
      },
      {
        field: "contracts",
        table: "contracts",
        type: ObjectType.Object,
      },
    ],
  },
  containers: {
    have: [
      {
        field: "asic",
        table: "asics",
        type: ObjectType.Object,
      },
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
    ],
  },
  contracts: {
    have: [
      {
        field: "api",
        table: "apis",
        type: ObjectType.Object,
      },
    ],
  },
};

export const OP = {
  EQUALS: (param: string) => {
    return "eq." + param;
  },
};

export function getQueryTableFields(tablename: string): string[] {
  const table = TABLES[tablename];
  const tableType = table.type;
  if (!tableType) {
    console.log("Table " + tablename + " not found");
    throw new Error("Table " + tablename + " not found");
  }
  const fields: string[] = Object.keys(table.row) as string[];

  return fields;
}

export function getQueryTableSelect(tablename: string): string {
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
      const itemFields = getQueryTableSelect(item.table);
      fields.push(item.table + "(" + itemFields + ")");
    }
  }

  return fields.join(",");
}
