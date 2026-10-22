import type { ApplicationDocument, ApplicationFormData } from "@aicte/shared";
import type { ApplicationFormValues } from "@/lib/validation";

export const DEFAULT_DOCUMENTS: ApplicationDocument[] = [
  {
    id: "doc-land",
    name: "Registered Land Deed",
    category: "LAND",
    fileName: "land-deed.pdf",
    sizeKb: 1480,
    verified: false,
  },
  {
    id: "doc-faculty",
    name: "Faculty Appointment Register",
    category: "FACULTY",
    fileName: "faculty-register-2026.pdf",
    sizeKb: 640,
    verified: false,
  },
  {
    id: "doc-affiliation",
    name: "University Affiliation Letter",
    category: "AFFILIATION",
    fileName: "affiliation-letter.pdf",
    sizeKb: 320,
    verified: false,
  },
  {
    id: "doc-finance",
    name: "Audited Financial Statement",
    category: "FINANCE",
    fileName: "financials-fy26.pdf",
    sizeKb: 1120,
    verified: false,
  },
  {
    id: "doc-infra",
    name: "Infrastructure Evidence",
    category: "INFRASTRUCTURE",
    fileName: "campus-evidence.zip",
    sizeKb: 4600,
    verified: false,
  },
];

export function toFormValues(form: ApplicationFormData | null): ApplicationFormValues {
  if (!form) {
    return {
      institutionName: "",
      state: "",
      region: "",
      city: "",
      campusType: "PERMANENT",
      totalStudentIntake: 0,
      facultyCount: 0,
      professorsCount: 0,
      associateProfessorsCount: 0,
      assistantProfessorsCount: 0,
      phdFacultyCount: 0,
      builtUpArea: 0,
      landArea: 0,
      libraryVolumes: 0,
      labInvestmentLakhs: 0,
      programs: [],
      documents: DEFAULT_DOCUMENTS,
    };
  }
  return {
    ...form,
    programs: form.programs.length > 0 ? form.programs : [],
    documents: form.documents.length > 0 ? form.documents : DEFAULT_DOCUMENTS,
  };
}

export function toFormData(values: ApplicationFormValues): ApplicationFormData {
  return {
    institutionName: values.institutionName,
    state: values.state,
    region: values.region,
    city: values.city,
    campusType: values.campusType,
    totalStudentIntake: Math.round(values.totalStudentIntake),
    facultyCount: Math.round(values.facultyCount),
    professorsCount: Math.round(values.professorsCount),
    associateProfessorsCount: Math.round(values.associateProfessorsCount),
    assistantProfessorsCount: Math.round(values.assistantProfessorsCount),
    phdFacultyCount: Math.round(values.phdFacultyCount),
    builtUpArea: Math.round(values.builtUpArea),
    landArea: Math.round(values.landArea),
    libraryVolumes: Math.round(values.libraryVolumes),
    labInvestmentLakhs: Math.round(values.labInvestmentLakhs),
    programs: values.programs,
    documents: values.documents,
  };
}
