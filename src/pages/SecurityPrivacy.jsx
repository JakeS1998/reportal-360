import React from "react";
import LegalLayout from "@/components/legal/LegalLayout";

const sections = [
  ["Protecting school information", "ReportAL 360 is designed for schools and districts handling sensitive staff and student information. We use layered safeguards intended to keep data private, secure, and available to authorised users."],
  ["Data access and isolation", "Access is managed by user role and school or district scope. Staff should only be able to view the records and tools needed for their responsibilities, helping to keep information separated between organisations and teams."],
  ["Secure authentication", "The service supports account-based access, multi-factor authentication, and single sign-on where configured. Session controls help protect accounts during use, while administrators can manage access as staff roles change."],
  ["Encryption and infrastructure safeguards", "Information is protected by encrypted connections between your browser and the service. Service credentials and sensitive operations are handled on protected server-side systems rather than exposed in the browser."],
  ["Monitoring and accountability", "Sensitive activity such as viewing student records, changing information, and exporting reports can be recorded in audit logs. These records help schools investigate activity, demonstrate accountability, and support internal oversight."],
  ["Privacy by design", "We apply access controls and minimise exposure of sensitive information in daily workflows. Schools and districts maintain control over their users, permissions, and the information they choose to store in the service."],
  ["Your role in security", "Security is a shared responsibility. Administrators should review access regularly, remove departing staff promptly, and ensure users follow local policies. Users should protect their credentials and report suspected unauthorised activity without delay."],
  ["Education privacy", "The service is designed to support schools in managing education information responsibly. Each school or district remains responsible for ensuring its use complies with applicable laws, policies, and student privacy obligations, including FERPA where applicable."],
  ["Questions or concerns", "For security or privacy questions, please contact your school or district administrator or the Blueridge Group through the contact details provided with your service agreement."],
];

export default function SecurityPrivacy() {
  return <LegalLayout title="Security & Data Privacy" updated="10 August 2026">{sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-heading font-semibold text-foreground">{heading}</h2><p className="mt-3">{text}</p></section>)}</LegalLayout>;
}