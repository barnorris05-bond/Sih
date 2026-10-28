"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import {
  REGIONS,
  STATES_BY_REGION,
  evaluateCompliance,
  requiredFacultyFor,
  type Program,
} from "@aicte/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, FieldError, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { RuleCheckList } from "@/components/forms/rule-check-list";
import { useToast } from "@/components/providers/toast-provider";
import { applicationFormSchema, type ApplicationFormValues } from "@/lib/validation";
import { toFormData } from "@/lib/form-defaults";
import { api, ApiError } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

const STEPS = [
  {
    key: "institution",
    label: "Institution",
    title: "Institution & campus",
    description: "Location, campus type and the land parcel declared for the academic year.",
    fields: ["institutionName", "state", "region", "city", "campusType", "landArea"] as const,
  },
  {
    key: "programmes",
    label: "Programmes",
    title: "Academic programmes",
    description: "Sanctioned intake per programme. Accredited programmes trigger the stricter 1:15 ratio.",
    fields: ["programs"] as const,
  },
  {
    key: "resources",
    label: "Resources",
    title: "Faculty & infrastructure",
    description: "Declare full-time faculty, doctoral strength, instructional area and library resources.",
    fields: [
      "facultyCount",
      "professorsCount",
      "associateProfessorsCount",
      "assistantProfessorsCount",
      "phdFacultyCount",
      "builtUpArea",
      "libraryVolumes",
      "labInvestmentLakhs",
    ] as const,
  },
  {
    key: "review",
    label: "Review",
    title: "Evidence & verification",
    description: "Confirm supporting documents and inspect the rule verdict before submission.",
    fields: ["documents"] as const,
  },
] as const;

const DEGREES: Program["degree"][] = ["B.Tech", "M.Tech", "MBA", "MCA", "B.Arch", "Diploma"];

interface ApplicationWizardProps {
  initialValues: ApplicationFormValues;
  applicationId?: string;
  openDeficiencyId?: string;
  institutionName: string;
}

export function ApplicationWizard({
  initialValues,
  applicationId: initialApplicationId,
  openDeficiencyId,
  institutionName,
}: ApplicationWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [applicationId, setApplicationId] = useState<string | undefined>(initialApplicationId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  const { fields: programFields, append, remove } = useFieldArray({
    control: form.control,
    name: "programs",
  });

  const values = useWatch({ control: form.control }) as ApplicationFormValues;
  const evaluation = useMemo(() => evaluateCompliance(values), [values]);
  const programIntake = (values.programs ?? []).reduce(
    (sum, program) => sum + (Number(program?.intake) || 0),
    0,
  );
  const documents = values.documents ?? initialValues.documents;
  const errors = form.formState.errors;

  useEffect(() => {
    if (programIntake > 0 && programIntake !== form.getValues("totalStudentIntake")) {
      form.setValue("totalStudentIntake", programIntake, { shouldValidate: false });
    }
  }, [programIntake, form]);

  const selectedState = values.state;
  useEffect(() => {
    const match = Object.entries(STATES_BY_REGION).find(([, states]) =>
      states.includes(selectedState),
    );
    if (match && match[0] !== form.getValues("region")) {
      form.setValue("region", match[0], { shouldValidate: false });
    }
  }, [selectedState, form]);

  function goTo(nextStep: number) {
    setDirection(nextStep > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
  }

  const currentStep = STEPS[step] ?? STEPS[0]!;

  async function nextStep() {
    const current = STEPS[step] ?? STEPS[0]!;
    const valid = await form.trigger([...current.fields] as never);
    if (!valid) {
      toast({
        title: "Some fields need attention",
        description: "Fix the highlighted values before moving on.",
        variant: "warning",
      });
      return;
    }
    goTo(step + 1);
  }

  function autofillStatutoryMinimums() {
    let intake = form.getValues("totalStudentIntake");
    if (!intake || intake < 1) intake = programIntake || 360;

    if (form.getValues("programs").length === 0) {
      append({
        id: `prog-${Date.now()}`,
        name: "Computer Science & Engineering",
        degree: "B.Tech",
        intake,
        accredited: false,
      });
    }

    const faculty = Math.ceil(intake / 20);
    const professors = Math.ceil(faculty / 9);
    const associate = Math.ceil((faculty * 2) / 9);
    form.setValue("totalStudentIntake", intake, { shouldValidate: true });
    form.setValue("facultyCount", faculty, { shouldValidate: true });
    form.setValue("professorsCount", professors, { shouldValidate: true });
    form.setValue("associateProfessorsCount", associate, { shouldValidate: true });
    form.setValue("assistantProfessorsCount", faculty - professors - associate, {
      shouldValidate: true,
    });
    form.setValue("phdFacultyCount", Math.ceil(faculty * 0.5), { shouldValidate: true });
    form.setValue("builtUpArea", Math.ceil(intake * 2.5) + 400, { shouldValidate: true });
    form.setValue("landArea", Math.max(form.getValues("landArea"), 9000), {
      shouldValidate: true,
    });
    form.setValue("libraryVolumes", intake * 13, { shouldValidate: true });
    form.setValue("labInvestmentLakhs", Math.max(form.getValues("labInvestmentLakhs"), 120), {
      shouldValidate: true,
    });
    toast({
      title: "Statutory minimums applied",
      description: "Faculty, cadre, area and library resources recalculated for your intake.",
      variant: "success",
    });
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const payload = toFormData(form.getValues());
      payload.programs = payload.programs.filter((program) => program.name.trim().length > 1);
      const { application } = await api.saveDraft(payload, applicationId);
      setApplicationId(application.id);
      toast({
        title: "Draft saved",
        description: `Compliance index ${application.complianceScore}% stored against your institution.`,
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not save draft",
        description: error instanceof ApiError ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const submit = form.handleSubmit(
    async (formValues) => {
      setSubmitting(true);
      try {
        const { application } = await api.submit(toFormData(formValues), applicationId);
        setApplicationId(application.id);
        if (application.currentState === "DEFICIENCY_NOTIFIED") {
          toast({
            title: "Deficiency notice issued",
            description: `${application.deficiencies.filter((d) => !d.isResolved).length} rule gap(s) detected. Remediate to continue.`,
            variant: "warning",
          });
          router.push("/institution/deficiencies");
        } else {
          toast({
            title: "Application submitted",
            description: "All automated checks cleared. The scrutiny desk has been notified.",
            variant: "success",
          });
          router.push("/institution");
        }
        router.refresh();
      } catch (error) {
        toast({
          title: "Submission blocked",
          description: error instanceof ApiError ? error.message : "Unexpected error.",
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    () => {
      const count = Object.keys(form.formState.errors).length;
      toast({
        title: "Application is incomplete",
        description: `${count} field group(s) still need attention before submission.`,
        variant: "warning",
      });
      if (form.formState.errors.programs) {
        goTo(1);
      } else if (
        form.formState.errors.facultyCount ||
        form.formState.errors.builtUpArea ||
        form.formState.errors.libraryVolumes
      ) {
        goTo(2);
      }
    },
  );

  const band =
    evaluation.score >= 90
      ? { label: "Approval ready", variant: "success" as const }
      : evaluation.score >= 65
        ? { label: "Needs remediation", variant: "warning" as const }
        : { label: "Critical gaps", variant: "danger" as const };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {openDeficiencyId && !initialApplicationId ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
            <p className="text-[11px] text-amber-100">
              An open show-cause notice already exists. Resubmit corrected metrics from the
              remediation desk instead of filing a new application.
            </p>
            <Link href="/institution/deficiencies">
              <Button size="sm" variant="secondary">
                Open desk
              </Button>
            </Link>
          </div>
        ) : null}

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/80">
                  Step {step + 1} of {STEPS.length}
                </p>
                <CardTitle className="mt-1 text-lg">{currentStep.title}</CardTitle>
                <CardDescription className="mt-1 max-w-xl">{currentStep.description}</CardDescription>
              </div>
              <Badge variant={band.variant} dot>
                {band.label}
              </Badge>
            </div>

            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {STEPS.map((item, index) => {
                const complete = index < step;
                const current = index === step;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => (index <= step ? goTo(index) : undefined)}
                    className={cn(
                      "group relative rounded-lg border px-2 py-1.5 text-left transition-all",
                      current
                        ? "border-violet-400/40 bg-violet-500/10"
                        : complete
                          ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                          : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em]",
                        current
                          ? "text-violet-100 light:text-violet-700"
                          : complete
                            ? "text-emerald-300 light:text-emerald-700"
                            : "text-muted-foreground/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-3.5 w-3.5 place-items-center rounded-full text-[8px]",
                          current
                            ? "bg-violet-400/30"
                            : complete
                              ? "bg-emerald-400/25"
                              : "bg-white/10",
                        )}
                      >
                        {complete ? <Check className="h-2 w-2" /> : index + 1}
                      </span>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            <motion.div
              key={currentStep.key}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-[380px]"
            >
                {step === 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Institution name" error={errors.institutionName?.message} className="sm:col-span-2">
                      <Input {...form.register("institutionName")} placeholder={institutionName} />
                    </Field>

                    <Field label="State / UT" error={errors.state?.message}>
                      <Select {...form.register("state")}>
                        <option value="">Select a state</option>
                        {REGIONS.map((region) => (
                          <optgroup key={region} label={region}>
                            {(STATES_BY_REGION[region] ?? []).map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Region" error={errors.region?.message}>
                      <Input {...form.register("region")} readOnly className="opacity-80" />
                    </Field>

                    <Field label="City" error={errors.city?.message}>
                      <Input {...form.register("city")} placeholder="City" />
                    </Field>

                    <Field label="Campus type" error={errors.campusType?.message}>
                      <Select {...form.register("campusType")}>
                        <option value="PERMANENT">Permanent campus</option>
                        <option value="TEMPORARY">Temporary campus</option>
                      </Select>
                    </Field>

                    <Field
                      label="Campus land area (sq.m)"
                      error={errors.landArea?.message}
                      hint="Handbook requires 8,000 sq.m of contiguous land."
                      className="sm:col-span-2"
                    >
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        {...form.register("landArea", { valueAsNumber: true })}
                      />
                    </Field>

                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:col-span-2">
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Why this matters.</span> The
                        geographic region routes your file to the correct Regional Officer, and the
                        land parcel is verified against the registered deed during the EVC visit.
                      </p>
                    </div>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">Sanctioned programmes</p>
                        <p className="text-[10px] text-muted-foreground">
                          Total intake {formatNumber(programIntake)} students
                          {evaluation.checks[0] ? ` · ${requiredFacultyFor(values)} faculty required` : null}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          append({
                            id: `prog-${Date.now()}`,
                            name: "",
                            degree: "B.Tech",
                            intake: 60,
                            accredited: false,
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add programme
                      </Button>
                    </div>

                    {programFields.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                        <GraduationCap className="mx-auto h-6 w-6 text-muted-foreground" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Add at least one programme to calculate your student-faculty ratio.
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {programFields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 sm:grid-cols-[1.6fr_0.7fr_0.5fr_auto_auto] sm:items-end"
                        >
                          <Field
                            label={`Programme ${index + 1}`}
                            error={errors.programs?.[index]?.name?.message}
                          >
                            <Input
                              {...form.register(`programs.${index}.name`)}
                              placeholder="Computer Science & Engineering"
                            />
                          </Field>
                          <Field label="Degree" error={errors.programs?.[index]?.degree?.message}>
                            <Select {...form.register(`programs.${index}.degree`)}>
                              {DEGREES.map((degree) => (
                                <option key={degree} value={degree}>
                                  {degree}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Intake" error={errors.programs?.[index]?.intake?.message}>
                            <Input
                              type="number"
                              min={1}
                              {...form.register(`programs.${index}.intake`, {
                                valueAsNumber: true,
                              })}
                            />
                          </Field>
                          <label className="flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[10px] text-muted-foreground">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-violet-500"
                              {...form.register(`programs.${index}.accredited`)}
                            />
                            NBA
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            aria-label="Remove programme"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-300 light:text-rose-700" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[0.05] px-3 py-2.5">
                      <p className="text-[10px] text-violet-100/80">
                        Accreditated programmes use the 1:15 faculty ratio, raising the required
                        faculty count.
                      </p>
                      <span className="text-[10px] font-medium text-violet-100 light:text-violet-700">
                        Required faculty {requiredFacultyFor(values)}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Total sanctioned intake" error={errors.totalStudentIntake?.message}>
                        <Input
                          type="number"
                          readOnly
                          className="opacity-80"
                          {...form.register("totalStudentIntake", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field label="Declared intake note">
                        <Textarea
                          placeholder="Optional note for the scrutiny desk (not evaluated)."
                          className="h-11 min-h-11 py-2"
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] text-muted-foreground">
                        Intake {formatNumber(values.totalStudentIntake || 0)} · ratio target{" "}
                        {form.getValues("programs").some((program) => program.accredited) ? "1:15" : "1:20"}
                      </p>
                      <Button type="button" size="sm" variant="secondary" onClick={autofillStatutoryMinimums}>
                        <Wand2 className="h-3.5 w-3.5" /> Apply statutory minimums
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field
                        label="Full-time faculty"
                        error={errors.facultyCount?.message}
                        hint={`Required: ${requiredFacultyFor(values)}`}
                      >
                        <Input
                          type="number"
                          min={0}
                          {...form.register("facultyCount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field label="Professors" error={errors.professorsCount?.message}>
                        <Input
                          type="number"
                          min={0}
                          {...form.register("professorsCount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        label="Associate professors"
                        error={errors.associateProfessorsCount?.message}
                      >
                        <Input
                          type="number"
                          min={0}
                          {...form.register("associateProfessorsCount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        label="Assistant professors"
                        error={errors.assistantProfessorsCount?.message}
                      >
                        <Input
                          type="number"
                          min={0}
                          {...form.register("assistantProfessorsCount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        label="Ph.D. faculty"
                        error={errors.phdFacultyCount?.message}
                        hint="Minimum 40% of full-time faculty."
                      >
                        <Input
                          type="number"
                          min={0}
                          {...form.register("phdFacultyCount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field label="Laboratory investment (₹ lakhs)" error={errors.labInvestmentLakhs?.message}>
                        <Input
                          type="number"
                          min={0}
                          {...form.register("labInvestmentLakhs", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        label="Built-up instructional area (sq.m)"
                        error={errors.builtUpArea?.message}
                        hint="Minimum 2.5 sq.m per student."
                      >
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          {...form.register("builtUpArea", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        label="Library volumes"
                        error={errors.libraryVolumes?.message}
                        hint="Minimum 12 volumes per student."
                      >
                        <Input
                          type="number"
                          min={0}
                          {...form.register("libraryVolumes", { valueAsNumber: true })}
                        />
                      </Field>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" /> Live faculty ratio
                        </p>
                        <p className="mt-1 font-display text-lg font-semibold text-foreground">
                          {values.facultyCount > 0
                            ? `1 : ${(
                                (values.totalStudentIntake || 0) / values.facultyCount
                              ).toFixed(1)}`
                            : "—"}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {evaluation.checks.find((check) => check.code === "APH_2026_SFR")?.passed
                            ? "Within statutory limits"
                            : "Below statutory requirement"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <SummaryTile icon={Building2} label="Institution" value={values.institutionName || "—"} />
                      <SummaryTile icon={GraduationCap} label="Sanctioned intake" value={formatNumber(values.totalStudentIntake || 0)} />
                      <SummaryTile icon={Users} label="Faculty declared" value={formatNumber(values.facultyCount || 0)} />
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <FolderOpen className="h-3.5 w-3.5 text-violet-200 light:text-violet-700" /> Supporting evidence
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Tick the documents included with this filing. The scrutiny desk verifies them
                        against your declarations.
                      </p>
                      <div className="mt-3 space-y-2">
                        {documents.map((document, index) => (
                          <label
                            key={document.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 transition-colors hover:border-violet-400/25"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 shrink-0 accent-violet-500"
                                checked={Boolean(document.verified)}
                                onChange={(event) =>
                                  form.setValue(`documents.${index}.verified`, event.target.checked, {
                                    shouldDirty: true,
                                  })
                                }
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-[11px] font-medium text-foreground">
                                  {document.name}
                                </span>
                                <span className="block truncate text-[9px] text-muted-foreground">
                                  {document.fileName} · {(document.sizeKb / 1024).toFixed(1)} MB
                                </span>
                              </span>
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
                              {document.category}
                            </span>
                          </label>
                        ))}
                      </div>
                      <FieldError message={errors.documents?.message} />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground">Rule verdict</p>
                      <RuleCheckList checks={evaluation.checks} showRemediation />
                    </div>
                  </div>
                ) : null}
            </motion.div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goTo(step - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={saveDraft} loading={saving}>
                  <Save className="h-3.5 w-3.5" /> Save draft
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={submit} loading={submitting} variant="success">
                    <Send className="h-3.5 w-3.5" /> Submit application
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
        <Card className="border-violet-400/15">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-200 light:text-violet-700" /> Live rule engine
            </CardTitle>
            <CardDescription>
              Recomputed on every keystroke against handbook {evaluation.totalRules} constraints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-center">
              <ComplianceGauge
                score={evaluation.score}
                showRules={{ passed: evaluation.passedRules, total: evaluation.totalRules }}
              />
            </div>
            <Badge variant={band.variant} dot className="w-full justify-center py-1">
              {band.label}
            </Badge>
            <RuleCheckList checks={evaluation.checks} compact />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-5">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-start"
              onClick={autofillStatutoryMinimums}
            >
              <Wand2 className="h-4 w-4 text-violet-200 light:text-violet-700" /> Apply statutory minimums
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={saveDraft}
              loading={saving}
            >
              <FileCheck2 className="h-4 w-4" /> Save progress as draft
            </Button>
            <p className="px-1 pt-1 text-[9px] leading-relaxed text-muted-foreground">
              Drafts persist against {institutionName}. Submission runs a final server-side
              validation and raises a show-cause notice automatically for any unmet rule.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error ? (
        <FieldError message={error} />
      ) : hint ? (
        <p className="mt-1.5 text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
