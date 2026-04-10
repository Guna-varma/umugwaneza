import * as XLSX from "xlsx";

type WorkbookPrimitive = string | number | boolean | null | undefined;

export type ReportWorkbookFilter = {
  label: string;
  value: WorkbookPrimitive;
};

export type ReportWorkbookMetric = {
  label: string;
  value: WorkbookPrimitive;
  hint?: WorkbookPrimitive;
};

export type ReportWorkbookColumn = {
  key: string;
  label: string;
};

export type ReportWorkbookSection = {
  title: string;
  columns: ReportWorkbookColumn[];
  rows: Record<string, WorkbookPrimitive>[];
  emptyMessage?: string;
};

export type ReportWorkbookConfig = {
  fileName: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  filters?: ReportWorkbookFilter[];
  metrics?: ReportWorkbookMetric[];
  sections: ReportWorkbookSection[];
};

function normalizeCell(value: WorkbookPrimitive): string | number | boolean {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return value;
}

function estimateWidth(value: WorkbookPrimitive): number {
  if (value === null || value === undefined) return 10;
  if (typeof value === "number") return Math.max(12, String(Math.round(value)).length + 4);
  if (typeof value === "boolean") return 10;
  return Math.min(40, Math.max(10, String(value).length + 2));
}

export function exportReportWorkbook({
  fileName,
  sheetName,
  title,
  subtitle,
  filters = [],
  metrics = [],
  sections,
}: ReportWorkbookConfig) {
  const allColumnCounts = [
    1,
    filters.length > 0 ? 2 : 0,
    metrics.length > 0 ? 3 : 0,
    ...sections.map((section) => section.columns.length),
  ];
  const mergeWidth = Math.max(1, ...allColumnCounts) - 1;

  const rows: (string | number | boolean)[][] = [];
  const merges: XLSX.Range[] = [];
  const maxWidths: number[] = Array.from({ length: mergeWidth + 1 }, () => 10);

  const pushRow = (values: WorkbookPrimitive[]) => {
    const normalized = values.map(normalizeCell);
    normalized.forEach((value, index) => {
      maxWidths[index] = Math.max(maxWidths[index] ?? 10, estimateWidth(value));
    });
    rows.push(normalized);
  };

  const pushMergedTitle = (value: string) => {
    const rowIndex = rows.length;
    pushRow([value]);
    merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: mergeWidth } });
  };

  pushMergedTitle(title);
  if (subtitle) {
    pushMergedTitle(subtitle);
  }

  if (filters.length > 0) {
    pushRow([]);
    pushMergedTitle("Report Filters");
    pushRow(["Filter", "Value"]);
    for (const filter of filters) {
      pushRow([filter.label, filter.value]);
    }
  }

  if (metrics.length > 0) {
    pushRow([]);
    pushMergedTitle("Executive Summary");
    pushRow(["Metric", "Value", "Notes"]);
    for (const metric of metrics) {
      pushRow([metric.label, metric.value, metric.hint ?? ""]);
    }
  }

  for (const section of sections) {
    pushRow([]);
    pushMergedTitle(section.title);
    pushRow(section.columns.map((column) => column.label));
    if (section.rows.length === 0) {
      pushRow([section.emptyMessage ?? "No rows available"]);
      continue;
    }
    for (const row of section.rows) {
      pushRow(section.columns.map((column) => row[column.key]));
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = maxWidths.map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
