"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CONSENTS } from "../../intake/consents";
import {
  defaultIntakeData,
  intakeSchema,
  stepSchemas,
  type IntakeData,
} from "../../intake/schema";

const steps = [
  "About you",
  "Care contacts",
  "Insurance",
  "Health history",
  "Daily function",
  "Permissions",
  "Review & sign",
];
const states = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];
const historyOptions = [
  "Diabetes",
  "Neuropathy",
  "Poor circulation/PVD",
  "History of ulcer",
  "Amputation",
  "Stroke",
  "Spinal condition",
  "Fracture",
  "Arthritis",
  "Osteoporosis",
  "Fall risk",
  "Skin breakdown",
  "Wound",
  "Swelling/edema",
  "Cancer",
  "Heart condition",
  "Kidney disease",
];
const functionOptions = [
  "Independent ambulation",
  "Uses cane",
  "Uses walker",
  "Uses wheelchair",
  "Needs assistance",
  "Homebound",
  "Works outside home",
  "Student",
];
const skinOptions = [
  "No current skin issues",
  "Redness",
  "Open wound",
  "Callus",
  "Blister",
  "Swelling",
  "Numbness",
  "Burning pain",
];
const checklist = [
  "Photo ID",
  "Insurance card(s)",
  "Prescription or referral",
  "Authorization, if available",
  "Relevant medical records",
];

type Path = string;
type ErrorMap = Record<string, string>;

function getAtPath(object: unknown, path: string) {
  return path
    .split(".")
    .reduce((value: any, key) => value?.[key], object as any);
}

function mergeIntakeData(saved: unknown): IntakeData {
  const merge = (base: any, value: any): any => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value ?? base;
    const result = { ...base };
    Object.entries(value).forEach(([key, child]) => {
      result[key] = merge(base?.[key], child);
    });
    return result;
  };
  return merge(defaultIntakeData, saved) as IntakeData;
}

function setAtPath(data: IntakeData, path: Path, value: unknown): IntakeData {
  const clone = structuredClone(data) as any;
  const keys = path.split(".");
  let cursor = clone;
  keys.slice(0, -1).forEach((key) => (cursor = cursor[key]));
  cursor[keys.at(-1)!] = value;
  return clone;
}

function Field({
  label,
  path,
  data,
  update,
  error,
  type = "text",
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  path: Path;
  data: IntakeData;
  update: (path: Path, value: unknown) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = path.replaceAll(".", "-");
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-brand-ink">
      {label}
      {required && <span className="ml-1 text-brand-red">*</span>}
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={(getAtPath(data, path) as string | number | null) ?? ""}
        onChange={(event) =>
          update(
            path,
            type === "number"
              ? event.target.value
                ? Number(event.target.value)
                : null
              : event.target.value,
          )
        }
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3.5 font-normal outline-none transition focus:ring-4 focus:ring-brand-red/10 ${error ? "border-brand-red" : "border-slate-200 focus:border-brand-red"}`}
      />
      {error && (
        <span
          id={`${id}-error`}
          className="mt-1.5 block text-xs text-brand-red"
        >
          {error}
        </span>
      )}
    </label>
  );
}

function TextArea({
  label,
  path,
  data,
  update,
  error,
  required,
  placeholder,
  rows = 4,
}: {
  label: string;
  path: Path;
  data: IntakeData;
  update: (path: Path, value: unknown) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const id = path.replaceAll(".", "-");
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-brand-ink">
      {label}
      {required && <span className="ml-1 text-brand-red">*</span>}
      <textarea
        id={id}
        rows={rows}
        value={(getAtPath(data, path) as string) || ""}
        onChange={(event) => update(path, event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`mt-2 w-full resize-y rounded-xl border bg-white px-4 py-3.5 font-normal outline-none transition focus:ring-4 focus:ring-brand-red/10 ${error ? "border-brand-red" : "border-slate-200 focus:border-brand-red"}`}
      />
      {error && (
        <span className="mt-1.5 block text-xs text-brand-red">{error}</span>
      )}
    </label>
  );
}

function SelectField({
  label,
  path,
  data,
  update,
  options,
  error,
  required,
}: {
  label: string;
  path: Path;
  data: IntakeData;
  update: (path: Path, value: unknown) => void;
  options: Array<[string, string]>;
  error?: string;
  required?: boolean;
}) {
  const id = path.replaceAll(".", "-");
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-brand-ink">
      {label}
      {required && <span className="ml-1 text-brand-red">*</span>}
      <select
        id={id}
        value={(getAtPath(data, path) as string) || ""}
        onChange={(event) => update(path, event.target.value)}
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3.5 font-normal outline-none ${error ? "border-brand-red" : "border-slate-200 focus:border-brand-red"}`}
      >
        {options.map(([value, name]) => (
          <option value={value} key={value}>
            {name}
          </option>
        ))}
      </select>
      {error && (
        <span className="mt-1.5 block text-xs text-brand-red">{error}</span>
      )}
    </label>
  );
}

function ChoiceGroup({
  label,
  path,
  data,
  update,
  options,
  error,
}: {
  label: string;
  path: Path;
  data: IntakeData;
  update: (path: Path, value: unknown) => void;
  options: Array<[string, string]>;
  error?: string;
}) {
  const value = getAtPath(data, path) as string;
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-brand-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map(([key, name]) => (
          <button
            type="button"
            key={key}
            aria-pressed={value === key}
            onClick={() => update(path, key)}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${value === key ? "border-brand-red bg-brand-red text-white shadow-md shadow-brand-red/15" : "border-slate-200 bg-white text-slate-600 hover:border-brand-red/40 hover:text-brand-red"}`}
          >
            {name}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </fieldset>
  );
}

function MultiChoice({
  label,
  path,
  data,
  update,
  options,
}: {
  label: string;
  path: Path;
  data: IntakeData;
  update: (path: Path, value: unknown) => void;
  options: string[];
}) {
  const selected = (getAtPath(data, path) as string[]) || [];
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-brand-ink">{label}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              aria-pressed={active}
              onClick={() =>
                update(
                  path,
                  active
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                )
              }
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition ${active ? "border-brand-red bg-red-50 text-brand-red" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? "border-brand-red bg-brand-red text-white" : "border-slate-300"}`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StepShell({
  eyebrow,
  title,
  copy,
  children,
}: {
  key?: React.Key;
  eyebrow: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-red">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">{copy}</p>
      <div className="mt-8 space-y-7">{children}</div>
    </section>
  );
}

const LOCAL_DRAFT_KEY = "genfinity_patient_intake_draft_v1";
const LOCAL_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;

type LocalDraft = {
  version: 1;
  data: IntakeData;
  currentStep: number;
  savedAt: number;
  expiresAt: number;
};

function readLocalDraft(): LocalDraft | null {
  try {
    const stored = window.localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!stored) return null;
    const draft = JSON.parse(stored) as Partial<LocalDraft>;
    if (
      draft.version !== 1 ||
      !draft.data ||
      typeof draft.data !== "object" ||
      !Number.isInteger(draft.currentStep) ||
      typeof draft.savedAt !== "number" ||
      typeof draft.expiresAt !== "number"
    ) {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      return null;
    }
    if (draft.expiresAt <= Date.now()) {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      return null;
    }
    return draft as LocalDraft;
  } catch {
    return null;
  }
}

function writeLocalDraft(data: IntakeData, currentStep: number) {
  const savedAt = Date.now();
  const draft: LocalDraft = {
    version: 1,
    data,
    currentStep,
    savedAt,
    expiresAt: savedAt + LOCAL_DRAFT_TTL,
  };
  window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
}

function clearLocalDraft() {
  try {
    window.localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch {
    // Storage may be unavailable in restricted browser modes.
  }
}

export function PatientIntakeForm() {
  const [data, setData] = useState<IntakeData>(defaultIntakeData);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [loaded, setLoaded] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [website, setWebsite] = useState("");
  const headingRef = useRef<HTMLDivElement>(null);
  const submissionKey = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `submission_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  );
  const submittedRef = useRef(false);

  useEffect(() => {
    const localDraft = readLocalDraft();
    if (localDraft) {
      // Restore the browser draft once during initial hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(localDraft.data);
      setStep(
        Math.max(0, Math.min(steps.length - 1, localDraft.currentStep)),
      );
      setLoaded(true);
    }
    fetch("/api/intake/draft", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        setConfigured(result.configured !== false);
        const serverSavedAt = result.updatedAt
          ? new Date(result.updatedAt).getTime()
          : 0;
        const useServerDraft =
          result.hasDraft === true &&
          (!localDraft || serverSavedAt > localDraft.savedAt);
        const restoredData = useServerDraft ? result.data : localDraft?.data;
        const restoredStep = useServerDraft
          ? result.currentStep
          : localDraft?.currentStep;
        if (restoredData) setData(mergeIntakeData(restoredData));
        if (Number.isInteger(restoredStep)) {
          setStep(
            Math.max(0, Math.min(steps.length - 1, Number(restoredStep))),
          );
        }
      })
      .catch(() => {
        setConfigured(false);
        if (localDraft) {
          setData(localDraft.data);
          setStep(
            Math.max(
              0,
              Math.min(steps.length - 1, localDraft.currentStep),
            ),
          );
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || reference) return;
    const persist = () => {
      if (submittedRef.current) return;
      try {
        writeLocalDraft(data, step);
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    };
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      persist();
    }, 250);
    window.addEventListener("pagehide", persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [data, loaded, reference, step]);

  useEffect(() => {
    if (!loaded || !configured || reference) return;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      fetch("/api/intake/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, currentStep: step }),
      })
        .then((response) => response.json())
        .then((result) => setSaveState(result.saved ? "saved" : "idle"))
        .catch(() => setSaveState("idle"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [configured, data, loaded, reference, step]);

  const progress = Math.round(((step + 1) / steps.length) * 100);
  const update = (path: Path, value: unknown) => {
    setData((current) => setAtPath(current, path, value));
    setErrors((current) => {
      const next = { ...current };
      delete next[path];
      return next;
    });
  };

  function validateCurrent() {
    const result = stepSchemas[step].safeParse(data);
    if (result.success) return true;
    const nextErrors: ErrorMap = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!nextErrors[path]) nextErrors[path] = issue.message;
    });
    setErrors(nextErrors);
    window.setTimeout(
      () =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      50,
    );
    return false;
  }

  function next() {
    if (!validateCurrent()) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus();
  }

  async function submit() {
    if (!validateCurrent()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/intake/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey.current,
        },
        body: JSON.stringify({
          ...data,
          website,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to submit intake");
      submittedRef.current = true;
      clearLocalDraft();
      setReference(result.reference);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : "Unable to submit intake",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded)
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-brand-red/20 border-t-brand-red"
          aria-label="Loading intake"
        />
      </div>
    );
  if (reference)
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-xl sm:p-14">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brand-red" />
        <p className="mt-6 text-sm font-bold uppercase tracking-[.2em] text-brand-red">
          Intake received
        </p>
        <h1 className="mt-3 text-3xl font-bold text-brand-ink">
          Thank you. Your next step is clearer.
        </h1>
        <p className="mt-4 text-slate-600">
          Keep this private reference number. Our team will review your intake
          and contact you about scheduling or needed records.
        </p>
        <div className="mx-auto mt-7 w-fit rounded-2xl bg-slate-50 px-6 py-4 font-mono text-xl font-bold tracking-wide text-brand-ink">
          {reference}
        </div>
        <a
          href="tel:8885526188"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3.5 font-bold text-white"
        >
          <Phone className="h-4 w-4" /> (888) 552-6188
        </a>
      </div>
    );

  const content = [
    <StepShell
      key="demographics"
      eyebrow="Step 1 of 7"
      title="Tell us about you."
      copy="Use your legal information so we can coordinate prescriptions, coverage, and care accurately."
    >
      <label className="absolute -left-[10000px]" aria-hidden="true">
        Leave this field empty
        <input
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Patient legal name"
          path="demographics.legalName"
          data={data}
          update={update}
          error={errors["demographics.legalName"]}
          required
        />
        <Field
          label="Preferred name"
          path="demographics.preferredName"
          data={data}
          update={update}
        />
        <Field
          label="Date of birth"
          path="demographics.dateOfBirth"
          data={data}
          update={update}
          error={errors["demographics.dateOfBirth"]}
          type="date"
          required
        />
      </div>
      <ChoiceGroup
        label="Sex at birth"
        path="demographics.sexAtBirth"
        data={data}
        update={update}
        error={errors["demographics.sexAtBirth"]}
        options={[
          ["female", "Female"],
          ["male", "Male"],
          ["intersex", "Intersex"],
          ["other", "Other"],
          ["prefer-not-to-answer", "Prefer not to answer"],
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Mobile phone"
          path="demographics.mobilePhone"
          data={data}
          update={update}
          error={errors["demographics.mobilePhone"]}
          type="tel"
          required
        />
        <Field
          label="Home phone"
          path="demographics.homePhone"
          data={data}
          update={update}
          error={errors["demographics.homePhone"]}
          type="tel"
        />
        <Field
          label="Email"
          path="demographics.email"
          data={data}
          update={update}
          error={errors["demographics.email"]}
          type="email"
          required
        />
        <Field
          label="Primary language"
          path="demographics.primaryLanguage"
          data={data}
          update={update}
          error={errors["demographics.primaryLanguage"]}
          required
        />
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-brand-ink">
        <input
          type="checkbox"
          checked={data.demographics.interpreterNeeded}
          onChange={(event) =>
            update("demographics.interpreterNeeded", event.target.checked)
          }
          className="h-5 w-5 accent-brand-red"
        />{" "}
        I need an interpreter
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Street address"
          path="demographics.streetAddress"
          data={data}
          update={update}
          error={errors["demographics.streetAddress"]}
          required
        />
        <Field
          label="City"
          path="demographics.city"
          data={data}
          update={update}
          error={errors["demographics.city"]}
          required
        />
        <SelectField
          label="State"
          path="demographics.state"
          data={data}
          update={update}
          options={states.map((state) => [state, state])}
          error={errors["demographics.state"]}
          required
        />
        <Field
          label="ZIP code"
          path="demographics.zip"
          data={data}
          update={update}
          error={errors["demographics.zip"]}
          required
          inputMode="numeric"
        />
      </div>
      <ChoiceGroup
        label="Marital status"
        path="demographics.maritalStatus"
        data={data}
        update={update}
        options={[
          ["single", "Single"],
          ["married", "Married"],
          ["partnered", "Partnered"],
          ["divorced", "Divorced"],
          ["widowed", "Widowed"],
          ["other", "Other"],
          ["prefer-not-to-answer", "Prefer not to answer"],
        ]}
      />
    </StepShell>,
    <StepShell
      key="contacts"
      eyebrow="Step 2 of 7"
      title="Who helps coordinate your care?"
      copy="Add what you know. Provider and emergency details can be completed later if they are not available today."
    >
      <div>
        <h3 className="text-lg font-bold text-brand-ink">Emergency contact</h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            label="Name"
            path="contacts.emergencyName"
            data={data}
            update={update}
            error={errors["contacts.emergencyName"]}
          />
          <Field
            label="Relationship"
            path="contacts.emergencyRelationship"
            data={data}
            update={update}
          />
          <Field
            label="Phone"
            path="contacts.emergencyPhone"
            data={data}
            update={update}
            error={errors["contacts.emergencyPhone"]}
            type="tel"
          />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-7">
        <h3 className="text-lg font-bold text-brand-ink">
          Responsible party, if different
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            label="Name"
            path="contacts.responsibleName"
            data={data}
            update={update}
          />
          <Field
            label="Relationship"
            path="contacts.responsibleRelationship"
            data={data}
            update={update}
          />
          <Field
            label="Phone"
            path="contacts.responsiblePhone"
            data={data}
            update={update}
            error={errors["contacts.responsiblePhone"]}
            type="tel"
          />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-7">
        <h3 className="text-lg font-bold text-brand-ink">
          Referring or treating provider
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            label="Provider name"
            path="contacts.referringProvider"
            data={data}
            update={update}
          />
          <Field
            label="Provider phone"
            path="contacts.providerPhone"
            data={data}
            update={update}
            error={errors["contacts.providerPhone"]}
            type="tel"
          />
          <Field
            label="Provider NPI"
            path="contacts.providerNpi"
            data={data}
            update={update}
            error={errors["contacts.providerNpi"]}
            inputMode="numeric"
          />
          <Field
            label="Prescription date"
            path="contacts.prescriptionDate"
            data={data}
            update={update}
            type="date"
          />
        </div>
        <div className="mt-5">
          <TextArea
            label="Diagnosis or reason for visit"
            path="contacts.diagnosis"
            data={data}
            update={update}
            rows={3}
          />
        </div>
      </div>
      <MultiChoice
        label="Body part or side"
        path="contacts.bodySides"
        data={data}
        update={update}
        options={["Right", "Left", "Bilateral", "Spine", "Other"]}
      />
      <MultiChoice
        label="How may we contact you?"
        path="contacts.contactPreferences"
        data={data}
        update={update}
        options={["Phone call", "Text message", "Email", "Secure portal"]}
      />
      <TextArea
        label="Preferred pharmacy, DME supplier, or case manager"
        path="contacts.preferredCareContact"
        data={data}
        update={update}
        rows={2}
      />
    </StepShell>,
    <StepShell
      key="insurance"
      eyebrow="Step 3 of 7"
      title="How will care be covered?"
      copy="Choose the closest option. Coverage verification is not a guarantee of payment, but accurate details help us explain the next step."
    >
      <ChoiceGroup
        label="Coverage type"
        path="insurance.coverageType"
        data={data}
        update={update}
        options={[
          ["primary", "Health insurance"],
          ["workers-comp", "Workers compensation"],
          ["personal-injury", "Personal injury"],
          ["self-pay", "Self-pay"],
          ["unsure", "I am unsure"],
        ]}
      />
      {data.insurance.coverageType === "primary" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Insurance company"
            path="insurance.company"
            data={data}
            update={update}
            error={errors["insurance.company"]}
            required
          />
          <Field
            label="Member ID"
            path="insurance.memberId"
            data={data}
            update={update}
            error={errors["insurance.memberId"]}
            required
          />
          <Field
            label="Group number"
            path="insurance.groupNumber"
            data={data}
            update={update}
          />
          <Field
            label="Policy holder name"
            path="insurance.policyHolderName"
            data={data}
            update={update}
          />
          <Field
            label="Policy holder date of birth"
            path="insurance.policyHolderDob"
            data={data}
            update={update}
            type="date"
          />
          <Field
            label="Relationship to patient"
            path="insurance.relationship"
            data={data}
            update={update}
          />
          <Field
            label="Phone on card"
            path="insurance.phoneOnCard"
            data={data}
            update={update}
            error={errors["insurance.phoneOnCard"]}
            type="tel"
          />
          <Field
            label="Claims address"
            path="insurance.claimsAddress"
            data={data}
            update={update}
          />
        </div>
      )}
      {["workers-comp", "personal-injury"].includes(
        data.insurance.coverageType,
      ) && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Carrier"
            path="insurance.secondaryCarrier"
            data={data}
            update={update}
            error={errors["insurance.secondaryCarrier"]}
            required
          />
          <Field
            label="Claim number"
            path="insurance.claimNumber"
            data={data}
            update={update}
            error={errors["insurance.claimNumber"]}
            required
          />
          <Field
            label="Adjuster or case manager"
            path="insurance.adjuster"
            data={data}
            update={update}
          />
          <Field
            label="Adjuster phone"
            path="insurance.adjusterPhone"
            data={data}
            update={update}
            error={errors["insurance.adjusterPhone"]}
            type="tel"
          />
          <Field
            label="Employer or attorney"
            path="insurance.employerAttorney"
            data={data}
            update={update}
          />
          <Field
            label="Date of injury or accident"
            path="insurance.injuryDate"
            data={data}
            update={update}
            type="date"
          />
        </div>
      )}
      <div className="rounded-2xl bg-slate-50 p-5">
        <h3 className="font-bold text-brand-ink">Bring to your first visit</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div
              className="flex items-center gap-2 text-sm text-slate-600"
              key={item}
            >
              <CheckCircle2 className="h-4 w-4 text-brand-red" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </StepShell>,
    <StepShell
      key="medical"
      eyebrow="Step 4 of 7"
      title="What has changed?"
      copy="A plain-language description is enough. Tell us what hurts, what happened, and how it affects your movement."
    >
      <TextArea
        label="Describe the problem, injury, surgery, or condition"
        path="medical.currentProblem"
        data={data}
        update={update}
        error={errors["medical.currentProblem"]}
        required
        placeholder="For example: my brace no longer fits, heel pain after standing, or a new prosthetic evaluation."
        rows={6}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Symptoms began / surgery date"
          path="medical.symptomsDate"
          data={data}
          update={update}
          type="date"
        />
        <Field
          label="Height (feet)"
          path="medical.heightFeet"
          data={data}
          update={update}
          type="number"
        />
        <Field
          label="Height (inches)"
          path="medical.heightInches"
          data={data}
          update={update}
          type="number"
        />
        <Field
          label="Weight (lb)"
          path="medical.weight"
          data={data}
          update={update}
          type="number"
        />
      </div>
      <label className="block text-sm font-semibold text-brand-ink">
        Pain level:{" "}
        <span className="text-brand-red">{data.medical.painLevel}/10</span>
        <input
          type="range"
          min="0"
          max="10"
          value={data.medical.painLevel}
          onChange={(event) =>
            update("medical.painLevel", Number(event.target.value))
          }
          className="mt-4 w-full accent-brand-red"
        />
        <span className="mt-1 flex justify-between text-xs font-normal text-slate-500">
          <span>No pain</span>
          <span>Severe pain</span>
        </span>
      </label>
      <MultiChoice
        label="Relevant medical history"
        path="medical.history"
        data={data}
        update={update}
        options={historyOptions}
      />
      <Field
        label="Other relevant history"
        path="medical.historyOther"
        data={data}
        update={update}
      />
      <TextArea
        label="Current medications"
        path="medical.medications"
        data={data}
        update={update}
        rows={3}
      />
      <TextArea
        label="Allergies, including latex, adhesives, or materials"
        path="medical.allergies"
        data={data}
        update={update}
        rows={3}
      />
    </StepShell>,
    <StepShell
      key="function"
      eyebrow="Step 5 of 7"
      title="What do you want to do more comfortably?"
      copy="Your daily life—not a generic device—guides the care plan."
    >
      <MultiChoice
        label="Current functional status"
        path="function.statuses"
        data={data}
        update={update}
        options={functionOptions}
      />
      <TextArea
        label="Goals for the device or treatment"
        path="function.goals"
        data={data}
        update={update}
        error={errors["function.goals"]}
        required
        placeholder="Walking farther, returning to work, reducing pain, feeling steadier…"
        rows={5}
      />
      <MultiChoice
        label="Current skin or safety concerns"
        path="function.skinIssues"
        data={data}
        update={update}
        options={skinOptions}
      />
      <Field
        label="Other skin or safety concern"
        path="function.skinOther"
        data={data}
        update={update}
      />
      {data.function.skinIssues.includes("Open wound") && (
        <div className="rounded-2xl border border-brand-red/20 bg-red-50 p-5 text-sm leading-relaxed text-brand-ink">
          <strong>Please contact the clinic promptly.</strong> An open wound may
          need timely clinical guidance before device use. Call (888) 552-6188.
          Call 911 for an emergency.
        </div>
      )}
    </StepShell>,
    <StepShell
      key="privacy"
      eyebrow="Step 6 of 7"
      title="Choose how we communicate."
      copy="Review the permissions that help us coordinate appointments, benefits, billing, device status, and care."
    >
      <div className="rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-brand-ink">
          Notice of Privacy Practices
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Review Genfinity O&P’s Notice of Privacy Practices before choosing an
          acknowledgment.
        </p>
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex font-bold text-brand-red hover:underline"
        >
          Open privacy notice ↗
        </a>
      </div>
      <ChoiceGroup
        label="Privacy notice acknowledgment"
        path="privacy.nppChoice"
        data={data}
        update={update}
        options={[
          ["received", "I received a copy"],
          ["declined-copy", "I was offered a copy and declined"],
          ["request-email", "Email me a copy"],
        ]}
      />
      <MultiChoice
        label="Permission to communicate"
        path="privacy.communicationMethods"
        data={data}
        update={update}
        options={["Phone / voicemail", "Text message", "Email", "Mail"]}
      />
      <label className="flex items-center gap-3 text-sm font-semibold text-brand-ink">
        <input
          type="checkbox"
          checked={data.privacy.doNotLeaveVoicemail}
          onChange={(event) =>
            update("privacy.doNotLeaveVoicemail", event.target.checked)
          }
          className="h-5 w-5 accent-brand-red"
        />{" "}
        Do not leave voicemail
      </label>
      <div>
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-bold text-brand-ink">
            People authorized to receive care or billing information
          </h3>
          {data.privacy.authorizedPeople.length < 5 && (
            <button
              type="button"
              onClick={() =>
                update("privacy.authorizedPeople", [
                  ...data.privacy.authorizedPeople,
                  { name: "", relationship: "", phone: "" },
                ])
              }
              className="shrink-0 text-sm font-bold text-brand-red"
            >
              + Add person
            </button>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {data.privacy.authorizedPeople.map((person, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"
            >
              <label className="text-xs font-bold text-slate-600">
                Name
                <input
                  value={person.name}
                  onChange={(event) => {
                    const people = [...data.privacy.authorizedPeople];
                    people[index] = { ...person, name: event.target.value };
                    update("privacy.authorizedPeople", people);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Relationship
                <input
                  value={person.relationship}
                  onChange={(event) => {
                    const people = [...data.privacy.authorizedPeople];
                    people[index] = {
                      ...person,
                      relationship: event.target.value,
                    };
                    update("privacy.authorizedPeople", people);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Phone
                <input
                  value={person.phone}
                  onChange={(event) => {
                    const people = [...data.privacy.authorizedPeople];
                    people[index] = { ...person, phone: event.target.value };
                    update("privacy.authorizedPeople", people);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      <details className="rounded-2xl border border-slate-200 p-5">
        <summary className="cursor-pointer font-bold text-brand-ink">
          Photograph, measurement, and documentation consent
        </summary>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {CONSENTS.privacy.text.split("\n\n").at(-1)}
        </p>
      </details>
    </StepShell>,
    <StepShell
      key="review"
      eyebrow="Final step"
      title="Review, accept, and sign."
      copy="Review your answers and acknowledge the required care, financial, and privacy notices before submitting."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Patient
          </p>
          <p className="mt-2 font-bold text-brand-ink">
            {data.demographics.legalName || "Not provided"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {data.demographics.dateOfBirth || "DOB missing"} ·{" "}
            {data.demographics.mobilePhone || "Phone missing"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Care request
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
            {data.medical.currentProblem || "Not provided"}
          </p>
        </div>
      </div>
      {Object.entries(CONSENTS).map(([key, consent]) => {
        const path = `signature.${key}Accepted` as Path;
        const checked = getAtPath(data, path) as boolean;
        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 p-5 sm:p-6"
          >
            <details>
              <summary className="cursor-pointer font-bold text-brand-ink">
                {consent.title}
              </summary>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {consent.text}
              </p>
            </details>
            <label className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-5 text-sm font-semibold text-brand-ink">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => update(path, event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-red"
              />{" "}
              I have read and agree to this{" "}
              {key === "privacy" ? "acknowledgment" : "consent"}.
            </label>
            {errors[path] && (
              <p className="mt-2 text-xs text-brand-red">{errors[path]}</p>
            )}
          </div>
        );
      })}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Printed legal name"
          path="signature.printedName"
          data={data}
          update={update}
          error={errors["signature.printedName"]}
          required
        />
        <Field
          label="Relationship to patient"
          path="signature.relationship"
          data={data}
          update={update}
          error={errors["signature.relationship"]}
          required
        />
      </div>
      {errors.submit && (
        <div
          role="alert"
          className="rounded-2xl border border-brand-red/20 bg-red-50 p-4 text-sm font-semibold text-brand-red"
        >
          {errors.submit}
        </div>
      )}
    </StepShell>,
  ][step];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <span className="inline-flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-brand-red" />
          New patient registration · Step {step + 1} of {steps.length}
        </span>
        <span className="inline-flex items-center gap-2">
          <Save className="h-3.5 w-3.5" />
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Progress saved on this device"
              : configured
                ? "Ready"
                : "Local draft ready"}
        </span>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-brand-ink">
              {steps[step]}
            </span>
            <span className="text-sm font-bold text-brand-red">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-brand-red"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <div className="mt-4 hidden grid-cols-7 gap-2 lg:grid">
            {steps.map((name, index) => (
              <button
                type="button"
                key={name}
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className={`text-left text-[11px] font-semibold ${index === step ? "text-brand-red" : index < step ? "text-brand-ink" : "text-slate-400"}`}
              >
                {index < step ? "✓ " : ""}
                {name}
              </button>
            ))}
          </div>
        </div>
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.24 }}
              className="p-5 sm:p-8 lg:p-12"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <button
            type="button"
            disabled={step === 0 || submitting}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="inline-flex items-center gap-2 rounded-full px-4 py-3 font-bold text-slate-600 disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 font-bold text-white shadow-md shadow-brand-red/20"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 font-bold text-white shadow-md shadow-brand-red/20 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit intake"}
              <FileCheck2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="h-3.5 w-3.5" />
          Encrypted in transit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          No advertising use
        </span>
        <a href="tel:8885526188" className="font-semibold text-brand-red">
          Need help? (888) 552-6188
        </a>
      </div>
    </div>
  );
}
