export const INTAKE_PACKET_VERSION = "2026-06-08";

export const CONSENTS = {
  benefits: {
    title: "Assignment of Benefits and Authorization to Release Information",
    text: `I authorize Genfinity O&P LLC to bill my insurance, Medicare, Medicaid, workers compensation carrier, attorney, or other responsible payer for covered services, orthoses, prostheses, durable medical equipment, supplies, evaluations, fittings, and related care. I assign payment of benefits directly to Genfinity O&P LLC to the extent permitted by law and my insurance plan.

I authorize Genfinity O&P LLC to release medical, billing, prescription, and documentation information necessary to verify benefits, obtain authorization, submit claims, appeal denials, coordinate care, and collect payment. I understand I am responsible for deductibles, copayments, coinsurance, non-covered services, denied claims not payable by insurance, and charges not paid by any responsible payer unless prohibited by law or payer contract.`,
  },
  care: {
    title: "Consent for Care and Financial Responsibility",
    text: `I consent to evaluation, measurement, casting/scanning, fitting, delivery, adjustment, education, and follow-up care by Genfinity O&P LLC. I understand that outcomes vary and that device use requires compliance with wearing schedules, skin checks, follow-up visits, and provider instructions.

I understand that custom devices may be fabricated specifically for me and may not be returnable once fabrication has started, except as required by law or payer policy. I agree to notify Genfinity O&P LLC immediately of discomfort, skin irritation, wounds, swelling changes, device breakage, or changes in medical status.

Insurance verification is not a guarantee of payment. I understand that I may be responsible for deductibles, copayments, coinsurance, non-covered items, denied claims, missed appointment fees if applicable, and balances not paid by insurance or another responsible payer unless prohibited by law or contract. Payment arrangements must be made before delivery when required.

For Medicare and other payers, coverage may require a valid prescription, qualifying diagnosis, medical necessity documentation, proof of delivery, and payer-specific coverage criteria. Items may be denied if documentation does not meet payer requirements. Genfinity O&P LLC may request clinical notes and additional documentation from treating providers.`,
  },
  privacy: {
    title: "Privacy, Communication, and Clinical Documentation",
    text: `I acknowledge that I have been offered or provided Genfinity O&P LLC's Notice of Privacy Practices, which explains how my protected health information may be used and disclosed and how I may access this information.

I authorize clinically necessary photographs, measurements, scans, casts, impressions, and documentation for treatment, fabrication, medical records, payer documentation, quality assurance, and required claim support. This does not authorize public marketing use without a separate written consent.`,
  },
} as const;

export type ConsentKey = keyof typeof CONSENTS;
