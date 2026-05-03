import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Shield, Scale, Database, FileText, Lock, Globe, Users, Clock, Cookie, Baby, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const GdprPrivacySheet = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:text-foreground hover:shadow-md transition-all"
        aria-label="Privacy & GDPR"
      >
        <Shield className="h-3.5 w-3.5 text-primary" />
        <span>Privacy</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-8">
          <SheetHeader className="text-left mb-6">
            <SheetTitle className="text-xl font-bold">Privacy Policy</SheetTitle>
            <SheetDescription>
              How Athena Metrics protects your personal data — fully compliant with the EU General Data Protection Regulation (GDPR)
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Your Privacy Matters */}
            <Section icon={<Shield className="h-5 w-5 text-primary" />} title="Your Privacy Matters">
              <p>
                At Athena Metrics ("we", "us", "our"), we take the privacy and security of your personal information extremely seriously. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the{" "}
                <strong>EU General Data Protection Regulation (GDPR — Regulation (EU) 2016/679)</strong>, the{" "}
                <strong>ePrivacy Directive (2002/58/EC)</strong>, and other applicable European data protection legislation.
              </p>
              <p>This policy applies to all users of the Athena Metrics application ("the App"), including the web application and any associated mobile applications.</p>
              <p>
                <strong>Data Controller:</strong> Athena Metrics<br />
                <strong>Contact:</strong> <strong>+39 375 593 4963</strong>
              </p>
            </Section>

            {/* Legal Basis */}
            <Section icon={<Scale className="h-5 w-5 text-primary" />} title="Legal Basis for Processing (Art. 6 & Art. 9 GDPR)">
              <p>We process your personal data based on the following legal grounds:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Consent (Art. 6(1)(a) & Art. 9(2)(a))</strong> — You provide explicit consent when creating an account and entering study/health data. You may withdraw consent at any time without affecting the lawfulness of prior processing.</li>
                <li><strong>Contract Performance (Art. 6(1)(b))</strong> — Processing necessary to provide the study tracking and analysis services you requested.</li>
                <li><strong>Legitimate Interest (Art. 6(1)(f))</strong> — For security, fraud prevention, and service improvement. We ensure this does not override your rights.</li>
                <li><strong>Special Category Data (Art. 9)</strong> — Health-related data (Apple HealthKit metrics, wellbeing check-ins) is processed under your explicit consent. You can withdraw this at any time.</li>
              </ul>
            </Section>

            {/* Data We Collect */}
            <Section icon={<Database className="h-5 w-5 text-primary" />} title="Data We Collect (Art. 13 & 14 GDPR)">
              <p>We collect and process the following categories of personal data:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Identity Data</strong> — email address, username, university, matricola number</li>
                <li><strong>Study Data</strong> — study logs, topic mastery, weekly goals, daily scores, persona quiz answers, study schedules</li>
                <li><strong>Wellbeing Data</strong> — daily check-in responses (rest, stress, motivation levels), night factors</li>
                <li><strong>Health Data (optional)</strong> — Apple HealthKit data including heart rate, sleep, and activity metrics</li>
                <li><strong>AI-Generated Insights</strong> — personalized study plans, habit analysis, cognitive readiness scores</li>
                <li><strong>Feedback Data</strong> — your feedback on recommendations and insights</li>
                <li><strong>Technical Data</strong> — browser type, device information, IP address (for security purposes only)</li>
              </ul>
              <p className="mt-3"><strong>We do NOT collect:</strong> location data, financial information, social media data, or any data from minors under 16 years of age without parental consent.</p>
            </Section>

            {/* Purpose */}
            <Section icon={<FileText className="h-5 w-5 text-primary" />} title="Purpose of Data Processing">
              <p>Your personal data is processed exclusively for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Service Delivery</strong> — to provide study tracking, cognitive readiness scores, and AI-powered analysis</li>
                <li><strong>Personalization</strong> — to generate personalized study plans and recommendations based on your study profile</li>
                <li><strong>University Integration</strong> — to share aggregate academic metrics with your university (if applicable)</li>
                <li><strong>Study Libraries</strong> — to enable collaborative study features within private libraries you join</li>
                <li><strong>Security</strong> — to protect your account from unauthorized access and detect fraud</li>
                <li><strong>Service Improvement</strong> — anonymized, aggregated analytics to improve scoring accuracy (no individual identification)</li>
              </ul>
              <p className="mt-3"><strong>We will NEVER:</strong> sell your personal data, use it for advertising, share it with third-party marketers, or process it for automated decision-making that produces legal effects (Art. 22 GDPR).</p>
            </Section>

            {/* Data Security */}
            <Section icon={<Lock className="h-5 w-5 text-primary" />} title="Data Security Measures (Art. 32 GDPR)">
              <p>We implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Encryption in Transit</strong> — all data transmitted over TLS 1.3 (HTTPS)</li>
                <li><strong>Encryption at Rest</strong> — database encrypted using AES-256</li>
                <li><strong>Row-Level Security (RLS)</strong> — strict database-level access controls ensure users can only access their own data</li>
                <li><strong>Authentication</strong> — email verification required, password hashing with bcrypt, session management with secure tokens</li>
                <li><strong>Access Controls</strong> — staff access is role-based and logged; all administrative actions are recorded in an audit log</li>
                <li><strong>Regular Security Reviews</strong> — periodic assessment of security controls and vulnerability scanning</li>
              </ul>
            </Section>

            {/* Data Sharing */}
            <Section icon={<Users className="h-5 w-5 text-primary" />} title="Data Sharing & Third Parties (Art. 28 GDPR)">
              <p>We share your data only with the following categories of processors, all of whom are GDPR-compliant:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Cloud Infrastructure</strong> — our database and backend services are hosted on EU-based servers with GDPR-compliant providers</li>
                <li><strong>AI Processing</strong> — study analysis uses AI models; only anonymized data (not personal identifiers) is sent for analysis</li>
                <li><strong>University Administrators</strong> — aggregated study metrics shared only if your university uses Athena Metrics</li>
              </ul>
            </Section>

            {/* Your Rights */}
            <Section icon={<Globe className="h-5 w-5 text-primary" />} title="Your Rights Under GDPR (Art. 15–22)">
              <p>As a data subject, you have the following rights. We will respond to all requests within <strong>30 days</strong> as required by law:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Right of Access (Art. 15)</strong> — request a copy of all personal data we hold about you. You can also export your data directly from{" "}
                  <Link to="/account" className="text-primary hover:underline" onClick={() => setOpen(false)}>Account Settings → Export Data</Link>.</li>
                <li><strong>Right to Rectification (Art. 16)</strong> — correct any inaccurate personal data via your profile settings or by contacting us.</li>
                <li><strong>Right to Erasure / "Right to be Forgotten" (Art. 17)</strong> — request deletion of your account and all associated data. We will erase all data within 30 days.</li>
                <li><strong>Right to Restriction (Art. 18)</strong> — request that we restrict processing of your data while a complaint is being resolved.</li>
                <li><strong>Right to Data Portability (Art. 20)</strong> — receive your data in a structured, commonly used, machine-readable format (JSON export available in the App).</li>
                <li><strong>Right to Object (Art. 21)</strong> — object to processing based on legitimate interest. We will cease processing unless we have compelling legitimate grounds.</li>
                <li><strong>Right to Withdraw Consent (Art. 7(3))</strong> — withdraw consent at any time without affecting the lawfulness of prior processing.</li>
                <li><strong>Right to Lodge a Complaint (Art. 77)</strong> — you have the right to file a complaint with your national Data Protection Authority (DPA). A list of EU DPAs is available at{" "}
                  <a href="https://edpb.europa.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">edpb.europa.eu</a>.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at <strong>+39 375 593 4963</strong>. We may request identity verification before processing your request.
              </p>
            </Section>

            {/* Data Retention */}
            <Section icon={<Clock className="h-5 w-5 text-primary" />} title="Data Retention (Art. 5(1)(e) GDPR)">
              <p>We retain your data only for as long as necessary to fulfill the purposes outlined in this policy:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Data</strong> — retained while your account is active. Deleted within 30 days of account deletion request.</li>
                <li><strong>Study Logs & Scores</strong> — retained while your account is active for historical reporting.</li>
                <li><strong>Wellbeing Check-ins</strong> — retained while your account is active. Individual entries can be deleted at any time.</li>
                <li><strong>Feedback Data</strong> — retained for 12 months for service improvement, then automatically purged.</li>
                <li><strong>Technical Logs</strong> — server access logs retained for 90 days for security purposes only.</li>
              </ul>
            </Section>

            {/* Cookies */}
            <Section icon={<Cookie className="h-5 w-5 text-primary" />} title="Cookies & Tracking (ePrivacy Directive)">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Essential Cookies Only</strong> — we use only strictly necessary cookies for authentication and session management</li>
                <li><strong>No Tracking Cookies</strong> — we do not use advertising, analytics, or third-party tracking cookies</li>
                <li><strong>No Third-Party Trackers</strong> — we do not embed social media trackers, Google Analytics, or similar tools</li>
                <li><strong>Local Storage</strong> — used only for authentication tokens and app preferences</li>
              </ul>
            </Section>

            {/* Children */}
            <Section icon={<Baby className="h-5 w-5 text-primary" />} title="Children's Privacy (Art. 8 GDPR)">
              <p>Athena Metrics is not intended for use by children under the age of 16. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child under 16 without parental consent, we will delete it immediately.</p>
            </Section>

            {/* Data Breach */}
            <Section icon={<AlertTriangle className="h-5 w-5 text-primary" />} title="Data Breach Notification (Art. 33–34 GDPR)">
              <p>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Notify the relevant <strong>Data Protection Authority within 72 hours</strong> of becoming aware of the breach (Art. 33)</li>
                <li>Notify <strong>affected users without undue delay</strong> if the breach is likely to result in a high risk (Art. 34)</li>
                <li>Document the breach, its effects, and remedial actions taken</li>
              </ul>
            </Section>

            {/* Contact */}
            <Section icon={<Mail className="h-5 w-5 text-primary" />} title="Contact & Data Protection Officer">
              <p>For any privacy concerns, data access requests, or to exercise your GDPR rights, contact us at <strong>+39 375 593 4963</strong>.</p>
              <p className="mt-3 text-xs text-muted-foreground">Last updated: April 7, 2026</p>
            </Section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-start gap-3 mb-3">
      {icon}
      <h2 className="font-semibold text-foreground text-base">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
      {children}
    </div>
  </div>
);

export default GdprPrivacySheet;
