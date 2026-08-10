import React from "react";
import LegalLayout from "@/components/legal/LegalLayout";

const sections = [
  ["Our commitment", "ReportAL 360 is designed for schools and districts handling sensitive education information. We use safeguards intended to protect personal information and limit access to those with a legitimate educational or administrative need."],
  ["Information we handle", "The service may process account details, staff and student records, school and class information, attendance, assessments, schedules, messages, and files that authorised users choose to add."],
  ["How information is used", "Information is used to provide the service, generate requested reports and insights, manage accounts, support school operations, maintain security, and meet applicable legal obligations. We do not sell personal information."],
  ["Access controls", "Access is managed by account roles and school or district scope. Administrators are responsible for assigning appropriate access and for promptly removing access when it is no longer needed. Multi-factor authentication and single sign-on may be available where configured."],
  ["Security", "We use technical and organisational measures designed to protect information, including encrypted connections, access controls, session controls, audit records for sensitive activity, and server-side protection for service credentials."],
  ["Sharing and retention", "Information is shared only as needed to operate the service, comply with legal obligations, protect rights and safety, or where instructed by the school or district. Records are retained for the period required to provide the service and meet applicable obligations."],
  ["Your responsibilities", "Schools and districts remain responsible for ensuring that their use of the service, collection of information, and user permissions comply with applicable privacy, education, and records-management requirements, including FERPA where applicable."],
  ["Questions", "For privacy questions or requests relating to your organisation’s information, please contact your school or district administrator or the Blueridge Group through the contact details provided with your service agreement."],
];

export default function Privacy() {
  return <LegalLayout title="Privacy Notice" updated="10 August 2026">{sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-heading font-semibold text-foreground">{heading}</h2><p className="mt-3">{text}</p></section>)}</LegalLayout>;
}