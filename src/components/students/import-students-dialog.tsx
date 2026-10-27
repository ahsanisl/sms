"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileUp, Loader2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { downloadCsv } from "@/lib/csv-export";
import { STUDENT_CSV_HEADERS, normalizeAdmissionNo, studentCsvRow } from "@/lib/student-csv";
import { MAX_IMPORT_ROWS, prepareRows, type PreparedRow } from "@/lib/student-import";
import { importStudentsAction, type ImportRowResult } from "@/app/(app)/students/actions";
import type { Campus, ClassSection, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ImportStudentsDialog({
  open,
  onOpenChange,
  classes,
  campuses,
  existingStudents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassSection[];
  campuses: Campus[];
  /** Students already on file, for the duplicate pre-check (the server re-checks across the caller's full scope). */
  existingStudents: { name: string; admissionNo: string }[];
}) {
  const router = useLoadingRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreparedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [results, setResults] = useState<Map<number, ImportRowResult> | null>(null);
  const [importing, setImporting] = useState(false);

  const validRows = rows.filter((r) => r.input);
  const imported = results ? [...results.values()].filter((r) => r.success).length : 0;

  function reset() {
    setFileName(null);
    setRows([]);
    setFileError(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    reset();
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setFileError("Please choose a .csv file (in Excel: File → Save As → CSV UTF-8).");
      return;
    }
    const existingByAdmissionNo = new Map(existingStudents.filter((s) => normalizeAdmissionNo(s.admissionNo)).map((s) => [normalizeAdmissionNo(s.admissionNo), s.name]));
    const prepared = prepareRows(await file.text(), classes, campuses, existingByAdmissionNo);
    setRows(prepared.rows);
    setFileError(prepared.error ?? null);
  }

  function downloadTemplate() {
    const sample = classes.find((c) => c.status === "active");
    const campus = campuses.find((c) => c.id === sample?.campusId);
    // Built through the same row function as Export, so the example always lines up with the headers.
    const example: Student = {
      id: "",
      name: "Ali Hassan",
      rollNumber: "12",
      admissionNo: "ADM-2026-001",
      classId: sample?.id ?? "",
      campusId: sample?.campusId ?? "",
      gender: "male",
      dob: "2018-04-15",
      bloodGroup: "B+",
      bFormNumber: "35202-1234567-1",
      nationality: "Pakistani",
      religion: "",
      previousSchool: "",
      medicalNotes: "Allergic to peanuts",
      parentName: "Hassan Ali",
      parentRelation: "Father",
      parentPhone: "0300-1234567",
      parentEmail: "parent@example.com",
      secondaryGuardianName: "Ayesha Hassan",
      secondaryGuardianRelation: "Mother",
      secondaryGuardianPhone: "0301-7654321",
      secondaryGuardianEmail: "",
      emergencyContactName: "Bilal Ali",
      emergencyContactRelation: "Uncle",
      emergencyContactPhone: "0302-1112223",
      address: "House 1, Street 2",
      admissionDate: new Date().toISOString().slice(0, 10),
      status: "active",
    };
    downloadCsv("student-import-template", [...STUDENT_CSV_HEADERS], [studentCsvRow(example, sample ? `${sample.grade}-${sample.section}` : "1-A", campus?.name ?? "")]);
  }

  async function handleImport() {
    setImporting(true);
    const response = await importStudentsAction(validRows.map((r) => r.input));
    setImporting(false);
    if (!response.success) {
      toast.error(response.error ?? "Import failed.");
      return;
    }
    // Results come back indexed by position in validRows — key them by CSV line for the preview table.
    setResults(new Map(response.results.map((r) => [validRows[r.index].line, r])));
    const ok = response.results.filter((r) => r.success).length;
    const failed = response.results.length - ok;
    if (ok) toast.success(`Imported ${ok} student${ok === 1 ? "" : "s"}.`);
    if (failed) toast.error(`${failed} row${failed === 1 ? "" : "s"} couldn't be imported — see the details.`);
    if (ok) router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importing) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[48rem]">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV with one student per row — start from the template, or from a file made with Export on this page. Required columns: Name, Class, Gender, Date of Birth, Parent Name, Parent Phone. Rows whose Admission No. already exists are skipped, so re-importing an export won&apos;t create duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label
              className={cn(
                "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-outline-variant p-4 transition-colors hover:border-secondary/60 hover:bg-secondary-fixed/20",
                "focus-within:ring-2 focus-within:ring-secondary",
              )}
            >
              <FileUp className="h-6 w-6 shrink-0 text-secondary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-body-md font-semibold text-on-surface">{fileName ?? "Choose a CSV file"}</span>
                <span className="block text-label-md text-on-surface-variant">{fileName ? "Choose another file to replace it" : `Up to ${MAX_IMPORT_ROWS} students per file`}</span>
              </span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} disabled={importing} />
            </label>
            <Button type="button" variant="secondary" onClick={downloadTemplate} className="sm:self-center">
              <Download /> Template
            </Button>
          </div>

          {fileError && (
            <p role="alert" className="rounded-lg bg-error-container/60 px-4 py-3 text-body-md text-on-error-container">
              {fileError}
            </p>
          )}

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-label-md text-on-surface-variant">
                <StatusBadge label={`${validRows.length} ready`} tone="success" />
                {rows.length - validRows.length > 0 && <StatusBadge label={`${rows.length - validRows.length} with problems (will be skipped)`} tone="error" />}
                {results && <StatusBadge label={`${imported} imported`} tone="info" />}
              </div>
              <div className="max-h-[40vh] overflow-auto rounded-lg border border-outline-variant/60">
                <table className="w-full border-collapse text-left text-body-md">
                  <thead className="sticky top-0 bg-surface-container-low">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-label-md font-semibold text-on-surface-variant">Row</th>
                      <th scope="col" className="px-3 py-2 text-label-md font-semibold text-on-surface-variant">Student</th>
                      <th scope="col" className="px-3 py-2 text-label-md font-semibold text-on-surface-variant">Class</th>
                      <th scope="col" className="px-3 py-2 text-label-md font-semibold text-on-surface-variant">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {rows.map((row) => {
                      const result = results?.get(row.line);
                      const problem = row.problem ?? (result && !result.success ? result.error : undefined);
                      return (
                        <tr key={row.line} className={problem ? "bg-error-container/20" : undefined}>
                          <td className="px-3 py-2 tabular-nums text-on-surface-variant">{row.line}</td>
                          <td className="px-3 py-2 font-medium text-on-surface">{row.name}</td>
                          <td className="px-3 py-2 text-on-surface-variant">{row.classLabel}</td>
                          <td className="px-3 py-2">
                            {problem ? (
                              <span className="flex items-start gap-1.5 text-error">
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                {problem}
                              </span>
                            ) : result?.success ? (
                              <span className="flex items-center gap-1.5 text-success">
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> Imported
                              </span>
                            ) : (
                              <span className="text-on-surface-variant">Ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={importing}
          >
            {results ? "Done" : "Cancel"}
          </Button>
          {!results && (
            <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
              {importing && <Loader2 className="motion-safe:animate-spin" />}
              {importing ? "Importing…" : `Import ${validRows.length} student${validRows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
