/**
 * src/features/settings/components/import-export-section.tsx
 *
 * Import / Export section on the settings page.
 *
 * Export: Three buttons (Contacts, Tasks, Quotes) that trigger CSV downloads
 * via the /api/export/* route handlers.
 *
 * Import: Multi-step CSV contact import.
 *   1. Select file → PapaParse parses headers + rows client-side
 *   2. Map CSV columns to contact fields
 *   3. Preview first 3 rows, then submit to importContacts server action
 *   4. Display created / skipped / error summary
 */

"use client";

import { useState, useRef, useTransition } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, Upload, X, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { importContacts, type ImportContactRow, type ImportResult } from "@/server/actions/import";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const IMPORT_FIELDS: { key: keyof ImportContactRow; label: string; required?: boolean }[] = [
  { key: "firstName",     label: "First Name",    required: true },
  { key: "lastName",      label: "Last Name" },
  { key: "businessName",  label: "Business Name" },
  { key: "email",         label: "Email" },
  { key: "phone",         label: "Phone" },
  { key: "altPhone",      label: "Alt Phone" },
  { key: "city",          label: "City" },
  { key: "state",         label: "State" },
  { key: "zip",           label: "Zip / Postal Code" },
  { key: "source",        label: "Source" },
  { key: "stage",         label: "Stage" },
  { key: "notes",         label: "Notes" },
  { key: "nextFollowUpAt", label: "Next Follow-Up Date" },
];

const NONE = "__none__";

// ---------------------------------------------------------------------------
// Export section
// ---------------------------------------------------------------------------

function ExportSection() {
  const exports = [
    { label: "Contacts",     href: "/api/export/contacts" },
    { label: "Tasks",        href: "/api/export/tasks" },
    { label: "Quotes",       href: "/api/export/quotes" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Export data</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Download your data as a CSV file that you can open in Excel or Google Sheets.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {exports.map(({ label, href }) => (
          <a key={href} href={href} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              {label}
            </Button>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import section — step machine
// ---------------------------------------------------------------------------

type Step = "idle" | "mapping" | "importing" | "done";

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

function ImportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<keyof ImportContactRow, string>>({} as Record<keyof ImportContactRow, string>);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Step 1: parse file ────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        const headers = result.meta.fields ?? [];
        const rows = result.data as Record<string, string>[];

        if (headers.length === 0) {
          toast.error("The CSV file appears to be empty or has no headers.");
          return;
        }

        // Auto-detect mappings by fuzzy-matching header names
        const autoMapping: Record<string, string> = {};
        for (const field of IMPORT_FIELDS) {
          const match = headers.find((h) =>
            h.toLowerCase().replace(/[\s_-]/g, "").includes(field.key.toLowerCase().replace(/[\s_-]/g, ""))
          );
          autoMapping[field.key] = match ?? NONE;
        }

        setParsed({ headers, rows });
        setMapping(autoMapping as Record<keyof ImportContactRow, string>);
        setStep("mapping");
      },
      error(err) {
        toast.error(`Failed to parse CSV: ${err.message}`);
      },
    });

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  // ── Step 2: submit import ─────────────────────────────────────────────────
  function handleImport() {
    if (!parsed) return;

    // Build ImportContactRow[] from parsed rows + mapping
    const rows: ImportContactRow[] = parsed.rows.map((row) => {
      const contact: ImportContactRow = {};
      for (const field of IMPORT_FIELDS) {
        const csvCol = mapping[field.key];
        if (csvCol && csvCol !== NONE) {
          (contact as Record<string, string>)[field.key] = row[csvCol] ?? "";
        }
      }
      return contact;
    });

    startTransition(async () => {
      const res = await importContacts(rows);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResult(res.data);
      setStep("done");
    });
  }

  function handleReset() {
    setParsed(null);
    setMapping({} as Record<keyof ImportContactRow, string>);
    setResult(null);
    setStep("idle");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Import contacts</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload a CSV file to bulk-import contacts. Maximum 1,000 rows per import.
        </p>
      </div>

      {/* ── Idle ──────────────────────────────────────────────────── */}
      {step === "idle" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Choose CSV file…
          </Button>
        </>
      )}

      {/* ── Mapping ──────────────────────────────────────────────── */}
      {step === "mapping" && parsed && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Map columns &mdash;{" "}
              <span className="text-muted-foreground font-normal">
                {parsed.rows.length} row{parsed.rows.length !== 1 ? "s" : ""} detected
              </span>
            </p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mapping grid */}
          <div className="grid gap-2 sm:grid-cols-2">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <label className="text-xs w-36 flex-shrink-0 text-muted-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <select
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={mapping[field.key] ?? NONE}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                >
                  <option value={NONE}>— skip —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview — first 3 rows */}
          {parsed.rows.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Preview (first 3 rows):</p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="text-xs w-full min-w-max">
                  <thead className="bg-muted/50">
                    <tr>
                      {IMPORT_FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                        <th key={f.key} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className={cn(i % 2 === 1 && "bg-muted/20")}>
                        {IMPORT_FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                          <td key={f.key} className="px-2 py-1 truncate max-w-[120px]">
                            {row[mapping[f.key]] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1"
              onClick={handleImport}
              disabled={isPending}
            >
              {isPending ? "Importing…" : (
                <>
                  Import {parsed.rows.length} contacts
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium">Import complete</p>
          </div>
          <ul className="text-sm space-y-1">
            <li className="text-green-700">✓ {result.created} contact{result.created !== 1 ? "s" : ""} created</li>
            {result.skipped > 0 && (
              <li className="text-muted-foreground">⊘ {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped</li>
            )}
          </ul>
          {result.errors.length > 0 && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-2 space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Errors (first 10 shown)
              </div>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err}</p>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            Import another file
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportExportSection
// ---------------------------------------------------------------------------

export function ImportExportSection() {
  return (
    <div className="space-y-6 max-w-xl">
      <ExportSection />
      <Separator />
      <ImportSection />
    </div>
  );
}
