import { parseCsv } from "@/lib/csv-export";
import { normalizeAdmissionNo } from "@/lib/student-csv";
import type { Campus, ClassSection } from "@/lib/types";

/** Accepted header spellings (lower-cased, punctuation stripped) for each student field. */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "student name", "full name", "student"],
  rollNumber: ["roll no", "roll number", "roll"],
  admissionNo: ["admission no", "admission number", "adm no"],
  classLabel: ["class", "grade", "class section"],
  campusName: ["campus", "campus name", "branch"],
  gender: ["gender", "sex"],
  dob: ["date of birth", "dob", "birth date"],
  bloodGroup: ["blood group", "blood"],
  parentName: ["parent name", "guardian name", "parent", "guardian", "father name"],
  parentPhone: ["parent phone", "phone", "contact", "guardian phone", "mobile"],
  parentEmail: ["parent email", "email", "guardian email"],
  address: ["address"],
  admissionDate: ["admission date", "date of admission"],
  bFormNumber: ["b form no", "b form number", "b form", "bform", "cnic", "cnic no", "b form cnic no", "b form cnic number"],
  nationality: ["nationality"],
  religion: ["religion"],
  previousSchool: ["previous school", "last school"],
  medicalNotes: ["medical notes", "medical conditions", "medical conditions allergies", "allergies", "medical"],
  parentRelation: ["parent relation", "parent relationship", "relation", "relationship"],
  secondaryGuardianName: ["second guardian name", "secondary guardian name", "mother name"],
  secondaryGuardianRelation: ["second guardian relation", "secondary guardian relation"],
  secondaryGuardianPhone: ["second guardian phone", "secondary guardian phone", "mother phone"],
  secondaryGuardianEmail: ["second guardian email", "secondary guardian email"],
  emergencyContactName: ["emergency contact name", "emergency contact"],
  emergencyContactRelation: ["emergency contact relation", "emergency relation"],
  emergencyContactPhone: ["emergency contact phone", "emergency phone"],
};

/** Optional text fields copied straight from their column (blank when the column is absent). */
const OPTIONAL_TEXT_FIELDS = [
  "bFormNumber",
  "nationality",
  "religion",
  "previousSchool",
  "medicalNotes",
  "parentRelation",
  "secondaryGuardianName",
  "secondaryGuardianRelation",
  "secondaryGuardianPhone",
  "secondaryGuardianEmail",
  "emergencyContactName",
  "emergencyContactRelation",
  "emergencyContactPhone",
] as const;

export const MAX_IMPORT_ROWS = 500;

export interface PreparedRow {
  line: number;
  name: string;
  classLabel: string;
  input: Record<string, string> | null;
  problem?: string;
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeClass(label: string) {
  return label.toLowerCase().replace(/^(grade|class)\s*/, "").replace(/\s+/g, "").replace(/[–—]/g, "-");
}

/** Accepts YYYY-MM-DD, or DD/MM/YYYY and DD-MM-YYYY (the common local formats). Returns "" for blank, null for unreadable. */
function toIsoDate(value: string): string | null {
  const v = value.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/**
 * Parses an uploaded CSV and validates each row against the school's own
 * classes and campuses, entirely client-side — the preview the Import dialog
 * shows before anything is sent. The server (importStudentsAction) re-validates
 * every row through createStudent regardless.
 */
export function prepareRows(text: string, classes: ClassSection[], campuses: Campus[], existingByAdmissionNo: Map<string, string>): { rows: PreparedRow[]; error?: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: "The file has no data rows. Download the template to see the expected format." };
  const headers = table[0].map(normalizeHeader);
  const column: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((h) => aliases.includes(h));
    if (index >= 0) column[field] = index;
  }
  const missing = ["name", "classLabel", "gender", "dob", "parentName", "parentPhone"].filter((f) => column[f] === undefined);
  if (missing.length) {
    const labels: Record<string, string> = { name: "Name", classLabel: "Class", gender: "Gender", dob: "Date of Birth", parentName: "Parent Name", parentPhone: "Parent Phone" };
    return { rows: [], error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.map((m) => labels[m]).join(", ")}.` };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) return { rows: [], error: `Import at most ${MAX_IMPORT_ROWS} students at a time (this file has ${table.length - 1}).` };

  const activeClasses = classes.filter((c) => c.status === "active");
  // Admission No. → who already has it: existing students first, then earlier rows of this file as they're read.
  const takenBy = new Map(existingByAdmissionNo);
  const get = (cells: string[], field: string) => (column[field] === undefined ? "" : (cells[column[field]] ?? "").trim());

  const rows = table.slice(1).map((cells, i): PreparedRow => {
    const line = i + 2;
    const name = get(cells, "name");
    const classLabel = get(cells, "classLabel");
    const campusName = get(cells, "campusName");
    const fail = (problem: string): PreparedRow => ({ line, name: name || "—", classLabel: classLabel || "—", input: null, problem });

    if (!name) return fail("Name is required.");
    let candidates = activeClasses.filter((c) => normalizeClass(`${c.grade}-${c.section}`) === normalizeClass(classLabel));
    if (campusName) {
      const campus = campuses.find((c) => c.name.toLowerCase() === campusName.toLowerCase() || c.name.toLowerCase().replace(/ campus$/, "") === campusName.toLowerCase());
      if (!campus) return fail(`Unknown campus "${campusName}".`);
      candidates = candidates.filter((c) => c.campusId === campus.id);
    }
    if (candidates.length === 0) return fail(`No active class "${classLabel}"${campusName ? ` at ${campusName}` : ""}.`);
    if (candidates.length > 1) return fail(`Class "${classLabel}" exists at several campuses — add a Campus column.`);

    const genderRaw = get(cells, "gender").toLowerCase();
    const gender = ["m", "male", "boy"].includes(genderRaw) ? "male" : ["f", "female", "girl"].includes(genderRaw) ? "female" : null;
    if (!gender) return fail(`Gender must be Male or Female (got "${get(cells, "gender")}").`);
    const dob = toIsoDate(get(cells, "dob"));
    if (!dob) return fail("Date of Birth is missing or unreadable — use YYYY-MM-DD.");
    const admissionDate = toIsoDate(get(cells, "admissionDate"));
    if (admissionDate === null) return fail("Admission Date is unreadable — use YYYY-MM-DD.");

    const input: Record<string, string> = {
      name,
      rollNumber: get(cells, "rollNumber"),
      admissionNo: get(cells, "admissionNo"),
      classId: candidates[0].id,
      campusId: candidates[0].campusId,
      gender,
      dob,
      bloodGroup: get(cells, "bloodGroup"),
      parentName: get(cells, "parentName"),
      parentPhone: get(cells, "parentPhone"),
      parentEmail: get(cells, "parentEmail"),
      address: get(cells, "address"),
    };
    for (const key of OPTIONAL_TEXT_FIELDS) input[key] = get(cells, key);
    if (admissionDate) input.admissionDate = admissionDate;
    if (input.bFormNumber && !/^\d{13}$/.test(input.bFormNumber.replace(/[\s-]/g, ""))) return fail(`B-Form / CNIC "${input.bFormNumber}" must have 13 digits.`);
    if (input.secondaryGuardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.secondaryGuardianEmail)) return fail("Second Guardian Email isn't a valid email address.");
    if (!input.parentName) return fail("Parent Name is required.");
    if (!input.parentPhone) return fail("Parent Phone is required.");
    const admissionKey = normalizeAdmissionNo(input.admissionNo);
    if (admissionKey) {
      const owner = takenBy.get(admissionKey);
      if (owner) return fail(`Admission No. ${input.admissionNo} already belongs to ${owner} — will be skipped.`);
      takenBy.set(admissionKey, `${name} (row ${line})`);
    }
    return { line, name, classLabel, input };
  });
  return { rows };
}
