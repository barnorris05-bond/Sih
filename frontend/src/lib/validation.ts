import { z } from "zod";

export const programSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Programme name is required"),
  degree: z.enum(["B.Tech", "M.Tech", "MBA", "MCA", "B.Arch", "Diploma"]),
  intake: z
    .number({ invalid_type_error: "Enter the sanctioned intake" })
    .int("Use a whole number")
    .min(1, "Intake must be at least 1")
    .max(5000, "Intake looks unrealistic"),
  accredited: z.boolean(),
});

export const documentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  category: z.enum(["LAND", "FINANCE", "FACULTY", "INFRASTRUCTURE", "AFFILIATION"]),
  fileName: z.string().min(2),
  sizeKb: z.number().int().min(1),
  verified: z.boolean(),
});

const numeric = (message: string) =>
  z.number({ invalid_type_error: message }).min(0, message);

export const applicationFormSchema = z.object({
  institutionName: z.string().min(3, "Institution name is required"),
  state: z.string().min(2, "Select a state"),
  region: z.string().min(2, "Region is required"),
  city: z.string().min(2, "City is required"),
  campusType: z.enum(["PERMANENT", "TEMPORARY"]),
  totalStudentIntake: numeric("Enter the total sanctioned intake").int().min(1, "Enter the total sanctioned intake"),
  facultyCount: numeric("Enter the full-time faculty count").int().min(1, "Add at least one faculty member"),
  professorsCount: numeric("Enter the professor count").int(),
  associateProfessorsCount: numeric("Enter the associate professor count").int(),
  assistantProfessorsCount: numeric("Enter the assistant professor count").int(),
  phdFacultyCount: numeric("Enter the doctoral faculty count").int(),
  builtUpArea: numeric("Enter the built-up area").min(1, "Enter the built-up area"),
  landArea: numeric("Enter the campus land area").min(1, "Enter the campus land area"),
  libraryVolumes: numeric("Enter the library volume count").int(),
  labInvestmentLakhs: numeric("Enter the laboratory investment"),
  programs: z.array(programSchema).min(1, "Add at least one academic programme"),
  documents: z.array(documentSchema).min(1, "Attach at least one supporting document"),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

/** Drafts may be incomplete; only submission requires the full payload. */
export const draftFormSchema = applicationFormSchema
  .extend({
    programs: z.array(programSchema).optional(),
    documents: z.array(documentSchema).optional(),
  })
  .partial();

export const transitionSchema = z.object({
  target: z.enum([
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "RULE_VALIDATION_FAILED",
    "DEFICIENCY_NOTIFIED",
    "EVC_INSPECTION",
    "APPROVED",
    "REJECTED",
  ]),
  notes: z.string().max(600).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
