import { z } from "zod";

const text = (max = 300) => z.string().trim().max(max).default("");
const requiredText = (label: string, max = 300) =>
  z.string().trim().min(1, `${label} is required`).max(max);
const phone = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.replace(/\D/g, "").length >= 10 &&
      value.replace(/\D/g, "").length <= 15,
    "Enter a valid phone number",
  );
const optionalPhone = z
  .string()
  .trim()
  .refine(
    (value) =>
      !value ||
      (value.replace(/\D/g, "").length >= 10 &&
        value.replace(/\D/g, "").length <= 15),
    "Enter a valid phone number",
  )
  .default("");
const optionList = z.array(z.string().trim().max(80)).default([]);

function validNpi(value: string) {
  if (!value) return true;
  if (!/^\d{10}$/.test(value)) return false;
  const prefixed = `80840${value.slice(0, 9)}`;
  const sum = [...prefixed].reduce((total, digit, index) => {
    let number = Number(digit) * (index % 2 === 0 ? 1 : 2);
    if (number > 9) number -= 9;
    return total + number;
  }, 0);
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}

const today = new Date();
today.setHours(23, 59, 59, 999);
const oldestDob = new Date();
oldestDob.setFullYear(oldestDob.getFullYear() - 120);

const intakeObject = z.object({
  demographics: z.object({
    legalName: requiredText("Legal name", 160),
    preferredName: text(100),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine((value) => {
        const date = new Date(`${value}T12:00:00`);
        return (
          !Number.isNaN(date.getTime()) && date <= today && date >= oldestDob
        );
      }, "Enter a valid date of birth"),
    sexAtBirth: z.enum(
      ["female", "male", "intersex", "other", "prefer-not-to-answer"],
      { message: "Select an option" },
    ),
    mobilePhone: phone,
    homePhone: optionalPhone,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .max(254),
    streetAddress: requiredText("Street address", 200),
    city: requiredText("City", 100),
    state: requiredText("State", 2).regex(/^[A-Z]{2}$/, "Choose a state"),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code"),
    primaryLanguage: requiredText("Primary language", 80),
    interpreterNeeded: z.boolean().default(false),
    maritalStatus: z.enum([
      "single",
      "married",
      "partnered",
      "divorced",
      "widowed",
      "other",
      "prefer-not-to-answer",
    ]),
  }),
  contacts: z.object({
    emergencyName: text(160),
    emergencyRelationship: text(100),
    emergencyPhone: optionalPhone,
    responsibleName: text(160),
    responsibleRelationship: text(100),
    responsiblePhone: optionalPhone,
    referringProvider: text(160),
    providerPhone: optionalPhone,
    providerNpi: z
      .string()
      .trim()
      .refine(validNpi, "Enter a valid 10-digit NPI")
      .default(""),
    diagnosis: text(500),
    prescriptionDate: text(20),
    bodySides: optionList,
    contactPreferences: optionList,
    preferredCareContact: text(300),
  }),
  insurance: z
    .object({
      coverageType: z.enum([
        "primary",
        "workers-comp",
        "personal-injury",
        "self-pay",
        "unsure",
      ]),
      company: text(160),
      memberId: text(100),
      groupNumber: text(100),
      policyHolderName: text(160),
      policyHolderDob: text(20),
      relationship: text(100),
      claimsAddress: text(260),
      phoneOnCard: optionalPhone,
      secondaryCarrier: text(160),
      claimNumber: text(100),
      adjuster: text(160),
      adjusterPhone: optionalPhone,
      employerAttorney: text(200),
      injuryDate: text(20),
    })
    .superRefine((value, ctx) => {
      if (value.coverageType === "primary") {
        if (!value.company)
          ctx.addIssue({
            code: "custom",
            path: ["company"],
            message: "Insurance company is required",
          });
        if (!value.memberId)
          ctx.addIssue({
            code: "custom",
            path: ["memberId"],
            message: "Member ID is required",
          });
      }
      if (["workers-comp", "personal-injury"].includes(value.coverageType)) {
        if (!value.secondaryCarrier)
          ctx.addIssue({
            code: "custom",
            path: ["secondaryCarrier"],
            message: "Carrier is required",
          });
        if (!value.claimNumber)
          ctx.addIssue({
            code: "custom",
            path: ["claimNumber"],
            message: "Claim number is required",
          });
      }
    }),
  medical: z.object({
    currentProblem: requiredText("Current problem", 3000),
    symptomsDate: text(20),
    painLevel: z.number().int().min(0).max(10),
    heightFeet: z.number().int().min(1).max(8).nullable().default(null),
    heightInches: z.number().int().min(0).max(11).nullable().default(null),
    weight: z.number().min(1).max(1200).nullable().default(null),
    history: optionList,
    historyOther: text(300),
    medications: text(2000),
    allergies: text(2000),
  }),
  function: z.object({
    statuses: optionList,
    goals: requiredText("Goals for care", 2000),
    skinIssues: optionList,
    skinOther: text(300),
  }),
  privacy: z.object({
    nppChoice: z.enum(["received", "declined-copy", "request-email"]),
    communicationMethods: optionList,
    doNotLeaveVoicemail: z.boolean().default(false),
    authorizedPeople: z
      .array(
        z.object({
          name: text(160),
          relationship: text(100),
          phone: optionalPhone,
        }),
      )
      .max(5)
      .default([]),
  }),
  signature: z.object({
    benefitsAccepted: z
      .boolean()
      .refine(Boolean, "Accept the assignment of benefits"),
    careAccepted: z
      .boolean()
      .refine(Boolean, "Accept the care and financial policy"),
    privacyAccepted: z
      .boolean()
      .refine(Boolean, "Accept the privacy acknowledgment"),
    printedName: requiredText("Printed name", 160),
    relationship: requiredText("Relationship", 100),
    signatureDataUrl: z
      .string()
      .startsWith("data:image/png;base64,")
      .max(700_000),
    signatureMode: z.enum(["drawn", "typed-accessible"]),
  }),
});

export const intakeSchema = intakeObject.superRefine((value, ctx) => {
  const emergencyStarted =
    value.contacts.emergencyName || value.contacts.emergencyPhone;
  if (emergencyStarted && !value.contacts.emergencyName)
    ctx.addIssue({
      code: "custom",
      path: ["contacts", "emergencyName"],
      message: "Emergency contact name is required",
    });
  if (emergencyStarted && !value.contacts.emergencyPhone)
    ctx.addIssue({
      code: "custom",
      path: ["contacts", "emergencyPhone"],
      message: "Emergency contact phone is required",
    });
});

export type IntakeData = z.infer<typeof intakeSchema>;

export const defaultIntakeData: IntakeData = {
  demographics: {
    legalName: "",
    preferredName: "",
    dateOfBirth: "",
    sexAtBirth: "prefer-not-to-answer",
    mobilePhone: "",
    homePhone: "",
    email: "",
    streetAddress: "",
    city: "",
    state: "CA",
    zip: "",
    primaryLanguage: "English",
    interpreterNeeded: false,
    maritalStatus: "prefer-not-to-answer",
  },
  contacts: {
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    responsibleName: "",
    responsibleRelationship: "",
    responsiblePhone: "",
    referringProvider: "",
    providerPhone: "",
    providerNpi: "",
    diagnosis: "",
    prescriptionDate: "",
    bodySides: [],
    contactPreferences: [],
    preferredCareContact: "",
  },
  insurance: {
    coverageType: "primary",
    company: "",
    memberId: "",
    groupNumber: "",
    policyHolderName: "",
    policyHolderDob: "",
    relationship: "",
    claimsAddress: "",
    phoneOnCard: "",
    secondaryCarrier: "",
    claimNumber: "",
    adjuster: "",
    adjusterPhone: "",
    employerAttorney: "",
    injuryDate: "",
  },
  medical: {
    currentProblem: "",
    symptomsDate: "",
    painLevel: 0,
    heightFeet: null,
    heightInches: null,
    weight: null,
    history: [],
    historyOther: "",
    medications: "",
    allergies: "",
  },
  function: { statuses: [], goals: "", skinIssues: [], skinOther: "" },
  privacy: {
    nppChoice: "received",
    communicationMethods: [],
    doNotLeaveVoicemail: false,
    authorizedPeople: [],
  },
  signature: {
    benefitsAccepted: false,
    careAccepted: false,
    privacyAccepted: false,
    printedName: "",
    relationship: "Self",
    signatureDataUrl: "",
    signatureMode: "drawn",
  },
};

export const stepSchemas = [
  z.object({ demographics: intakeObject.shape.demographics }),
  z.object({ contacts: intakeObject.shape.contacts }),
  z.object({ insurance: intakeObject.shape.insurance }),
  z.object({ medical: intakeObject.shape.medical }),
  z.object({ function: intakeObject.shape.function }),
  z.object({ privacy: intakeObject.shape.privacy }),
  intakeSchema,
];
