import React from "react";
import LegalLayout from "@/components/legal/LegalLayout";

const sections = [
  ["Acceptance", "These Terms govern access to and use of ReportAL 360. By accessing the service, you confirm that you are authorised to act for your school, district, or organisation and agree to these Terms and any applicable service agreement."],
  ["Authorised use", "Use the service only for lawful educational and administrative purposes. You must keep account credentials confidential, use strong passwords and available authentication controls, and notify your administrator promptly of suspected unauthorised access."],
  ["Organisation administration", "Each school or district is responsible for its users, permissions, data entered into the service, and compliance with applicable laws and policies. Administrators must ensure that users only receive access necessary for their role."],
  ["Data and content", "You retain responsibility for information submitted to the service. You confirm that you have the authority to provide that information and to instruct its processing for the purposes of delivering the service."],
  ["Service information", "Reports, analytics, estimates, and recommendations are decision-support tools. They should be reviewed by appropriately qualified staff and must not be the sole basis for decisions about students, personnel, funding, or compliance."],
  ["Availability and changes", "We aim to maintain a reliable service but do not guarantee uninterrupted or error-free availability. Features, data sources, and these Terms may be updated from time to time. Material changes will be communicated through the service or your organisation’s agreed contact channel."],
  ["Intellectual property", "ReportAL 360, its software, design, and related materials are protected by intellectual-property rights. Except for the limited right to use the service under these Terms and any service agreement, no rights are transferred to you."],
  ["Suspension and termination", "Access may be suspended or ended where necessary to protect the service, address a security risk, comply with law, or where use breaches these Terms or the applicable service agreement."],
  ["Contact", "For questions about these Terms, please contact the Blueridge Group through the contact details provided with your service agreement."],
];

export default function Terms() {
  return <LegalLayout title="Terms of Use" updated="10 August 2026">{sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-heading font-semibold text-foreground">{heading}</h2><p className="mt-3">{text}</p></section>)}</LegalLayout>;
}