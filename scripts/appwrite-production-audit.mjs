#!/usr/bin/env node

import { Client, TablesDB } from "node-appwrite";

const args = new Set(process.argv.slice(2));
const applyIndexes = args.has("--apply-indexes");
const strict = args.has("--strict");

const endpoint =
  process.env.APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID ?? "trustfirst-core";
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "trustfirst-main-db";
const apiKey = process.env.APPWRITE_API_KEY ?? "";

if (!apiKey) {
  console.error(
    "Missing APPWRITE_API_KEY. Set a server API key with Tables/Databases read permissions.",
  );
  process.exit(1);
}

const ACCESS = {
  clientReadable: {
    read: true,
    create: false,
    update: false,
    delete: false,
  },
  clientCreateOnly: {
    read: false,
    create: true,
    update: false,
    delete: false,
  },
  privateOnly: {
    read: false,
    create: false,
    update: false,
    delete: false,
  },
};

const SPECS = [
  {
    id: "users",
    access: ACCESS.privateOnly,
    recommendedRowSecurity: true,
    requiredColumns: [],
    requiredAnyColumns: [],
    indexGroups: [],
  },
  {
    id: "tables",
    access: ACCESS.clientReadable,
    recommendedRowSecurity: false,
    requiredColumns: ["client_id"],
    requiredAnyColumns: [["table_no", "table_code"]],
    indexGroups: [
      {
        key: "idx_tables_client_table_no",
        label: "Lookup by client_id + table_no",
        required: true,
        options: [{ type: "key", columns: ["client_id", "table_no"] }],
      },
      {
        key: "idx_tables_client_table_code",
        label: "Lookup by client_id + table_code",
        required: true,
        options: [{ type: "key", columns: ["client_id", "table_code"] }],
      },
    ],
  },
  {
    id: "categories",
    access: ACCESS.clientReadable,
    recommendedRowSecurity: false,
    requiredColumns: ["client_id"],
    requiredAnyColumns: [["name", "title", "categoryName"]],
    indexGroups: [
      {
        key: "idx_categories_client",
        label: "Client scoped category fetch",
        required: true,
        options: [{ type: "key", columns: ["client_id"] }],
      },
    ],
  },
  {
    id: "menu_items",
    access: ACCESS.clientReadable,
    recommendedRowSecurity: false,
    requiredColumns: ["client_id"],
    requiredAnyColumns: [["name", "title", "itemName"], ["price", "amount", "rate"]],
    indexGroups: [
      {
        key: "idx_menu_items_client",
        label: "Client scoped menu fetch",
        required: true,
        options: [{ type: "key", columns: ["client_id"] }],
      },
      {
        key: "idx_menu_items_client_category",
        label: "Client + category filtering",
        required: false,
        options: [
          { type: "key", columns: ["client_id", "category_id"] },
          { type: "key", columns: ["client_id", "categoryId"] },
          { type: "key", columns: ["client_id", "catogries_id"] },
          { type: "key", columns: ["client_id", "categories_id"] },
        ],
      },
    ],
  },
  {
    id: "orders",
    access: ACCESS.clientCreateOnly,
    recommendedRowSecurity: true,
    requiredColumns: [
      "client_id",
      "table_id",
      "order_number",
      "status",
      "payment_status",
      "subtotal",
      "total_amount",
    ],
    requiredAnyColumns: [],
    indexGroups: [
      {
        key: "idx_orders_client_table",
        label: "Order lookup by client + table",
        required: true,
        options: [{ type: "key", columns: ["client_id", "table_id"] }],
      },
      {
        key: "idx_orders_client_order_number",
        label: "Order number lookup",
        required: false,
        options: [
          { type: "unique", columns: ["client_id", "order_number"] },
          { type: "key", columns: ["client_id", "order_number"] },
        ],
      },
    ],
  },
  {
    id: "payments",
    access: ACCESS.clientCreateOnly,
    recommendedRowSecurity: true,
    requiredColumns: ["order_id", "amount", "method", "status"],
    requiredAnyColumns: [],
    indexGroups: [
      {
        key: "idx_payments_order",
        label: "Payment lookup by order",
        required: false,
        options: [{ type: "key", columns: ["order_id"] }],
      },
    ],
  },
  {
    id: "reports",
    access: ACCESS.privateOnly,
    recommendedRowSecurity: true,
    requiredColumns: [],
    requiredAnyColumns: [],
    indexGroups: [],
  },
  {
    id: "settings",
    access: ACCESS.clientReadable,
    recommendedRowSecurity: false,
    requiredColumns: ["client_id"],
    requiredAnyColumns: [],
    indexGroups: [
      {
        key: "idx_settings_client",
        label: "Settings lookup by client",
        required: true,
        options: [{ type: "key", columns: ["client_id"] }],
      },
    ],
  },
  {
    id: "notifications",
    access: ACCESS.privateOnly,
    recommendedRowSecurity: true,
    requiredColumns: [],
    requiredAnyColumns: [],
    indexGroups: [],
  },
];

const clientAudiences = new Set([
  "any",
  "role:all",
  "users",
  "role:users",
  "guests",
  "role:guests",
]);

function parsePermissionStrings(permissions, action) {
  const regex = new RegExp(`^${action}\\("([^"]+)"\\)$`);
  return permissions
    .map((entry) => regex.exec(entry)?.[1] ?? "")
    .filter(Boolean);
}

function hasClientAccess(permissions, action) {
  return parsePermissionStrings(permissions, action).some((audience) =>
    clientAudiences.has(audience),
  );
}

function normalizeColumns(columns) {
  return columns.map((column) => column.trim().toLowerCase());
}

function startsWithColumns(indexColumns, targetColumns) {
  if (indexColumns.length < targetColumns.length) {
    return false;
  }
  for (let i = 0; i < targetColumns.length; i += 1) {
    if (indexColumns[i] !== targetColumns[i]) {
      return false;
    }
  }
  return true;
}

function findMatchingIndex(indexes, option) {
  const expectedType = option.type.toLowerCase();
  const expectedColumns = normalizeColumns(option.columns);

  return indexes.find((index) => {
    const indexType = String(index.type ?? "").toLowerCase();
    const indexColumns = normalizeColumns(index.columns ?? []);
    if (indexType !== expectedType) {
      return false;
    }
    return startsWithColumns(indexColumns, expectedColumns);
  });
}

function formatColumns(columns) {
  return `[${columns.join(", ")}]`;
}

async function main() {
  const sdkClient = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDb = new TablesDB(sdkClient);
  const report = [];
  let failures = 0;
  let warnings = 0;

  const push = (level, message) => {
    report.push({ level, message });
    if (level === "FAIL") {
      failures += 1;
    }
    if (level === "WARN") {
      warnings += 1;
    }
  };

  push("INFO", `Endpoint: ${endpoint}`);
  push("INFO", `Project: ${projectId}`);
  push("INFO", `Database: ${databaseId}`);
  push(
    "INFO",
    `Mode: ${applyIndexes ? "audit + create missing indexes" : "audit only"}`,
  );

  for (const spec of SPECS) {
    push("INFO", `--- Table: ${spec.id} ---`);

    let table;
    try {
      table = await tablesDb.getTable({ databaseId, tableId: spec.id });
      push("PASS", `Table exists (${spec.id})`);
    } catch (error) {
      push("FAIL", `Table missing or inaccessible (${spec.id}): ${error.message}`);
      continue;
    }

    const permissions = Array.isArray(table.$permissions) ? table.$permissions : [];

    for (const action of ["read", "create", "update", "delete"]) {
      const allowed = hasClientAccess(permissions, action);
      const expected = spec.access[action];
      if (expected && !allowed) {
        push(
          "FAIL",
          `${spec.id}: expected browser-client ${action} permission (users/any), not found`,
        );
      } else if (!expected && allowed) {
        push(
          "FAIL",
          `${spec.id}: browser-client ${action} permission should be blocked, but is allowed`,
        );
      } else {
        push("PASS", `${spec.id}: ${action} permission check ok`);
      }
    }

    if (typeof spec.recommendedRowSecurity === "boolean") {
      if (table.rowSecurity !== spec.recommendedRowSecurity) {
        push(
          "WARN",
          `${spec.id}: rowSecurity=${table.rowSecurity} (recommended: ${spec.recommendedRowSecurity})`,
        );
      } else {
        push("PASS", `${spec.id}: rowSecurity matches recommendation`);
      }
    }

    let columns = [];
    let indexes = [];
    try {
      const columnList = await tablesDb.listColumns({
        databaseId,
        tableId: spec.id,
        total: false,
      });
      columns = columnList.columns ?? [];
      push("PASS", `${spec.id}: columns fetched (${columns.length})`);
    } catch (error) {
      push("FAIL", `${spec.id}: unable to list columns: ${error.message}`);
    }

    try {
      const indexList = await tablesDb.listIndexes({
        databaseId,
        tableId: spec.id,
        total: false,
      });
      indexes = indexList.indexes ?? [];
      push("PASS", `${spec.id}: indexes fetched (${indexes.length})`);
    } catch (error) {
      push("FAIL", `${spec.id}: unable to list indexes: ${error.message}`);
    }

    const columnKeys = new Set(columns.map((column) => String(column.key)));

    for (const requiredColumn of spec.requiredColumns) {
      if (!columnKeys.has(requiredColumn)) {
        push("FAIL", `${spec.id}: missing required column "${requiredColumn}"`);
      } else {
        push("PASS", `${spec.id}: has required column "${requiredColumn}"`);
      }
    }

    for (const anyGroup of spec.requiredAnyColumns) {
      const hasAny = anyGroup.some((column) => columnKeys.has(column));
      if (!hasAny) {
        push(
          "FAIL",
          `${spec.id}: requires at least one column from ${formatColumns(anyGroup)}`,
        );
      } else {
        push(
          "PASS",
          `${spec.id}: has at least one expected column from ${formatColumns(anyGroup)}`,
        );
      }
    }

    for (const group of spec.indexGroups) {
      const matchingIndex = group.options
        .map((option) => findMatchingIndex(indexes, option))
        .find(Boolean);

      if (matchingIndex) {
        push(
          "PASS",
          `${spec.id}: index ok for "${group.label}" via ${matchingIndex.key}`,
        );
        continue;
      }

      const missingLevel = group.required ? "FAIL" : "WARN";
      push(
        missingLevel,
        `${spec.id}: missing index for "${group.label}" (expected one of: ${group.options
          .map((option) => `${option.type}:${formatColumns(option.columns)}`)
          .join(" OR ")})`,
      );

      if (!applyIndexes) {
        continue;
      }

      const creatableOption = group.options.find((option) =>
        option.columns.every((column) => columnKeys.has(column)),
      );

      if (!creatableOption) {
        push(
          "WARN",
          `${spec.id}: cannot auto-create "${group.label}" because required columns are missing`,
        );
        continue;
      }

      try {
        await tablesDb.createIndex({
          databaseId,
          tableId: spec.id,
          key: group.key,
          type: creatableOption.type,
          columns: creatableOption.columns,
          ...(creatableOption.orders ? { orders: creatableOption.orders } : {}),
        });
        push(
          "PASS",
          `${spec.id}: created index ${group.key} (${creatableOption.type} ${formatColumns(creatableOption.columns)})`,
        );
      } catch (error) {
        push(
          "FAIL",
          `${spec.id}: failed to create index ${group.key}: ${error.message}`,
        );
      }
    }
  }

  console.log("");
  for (const line of report) {
    console.log(`${line.level}: ${line.message}`);
  }

  console.log("");
  console.log(
    `Summary => FAIL: ${failures}, WARN: ${warnings}, PASS/INFO: ${report.length - failures - warnings}`,
  );

  if (failures > 0 || (strict && warnings > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`FAIL: unexpected audit crash: ${error.message}`);
  process.exit(1);
});

