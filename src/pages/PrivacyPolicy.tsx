import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background px-4 py-8">
    <div className="mx-auto max-w-3xl">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </Link>

      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: April 2, 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Data Controller</h2>
          <p className="text-muted-foreground">CoFactor ("we", "us", "our") is the data controller for the personal data processed through this application. For questions, contact us at <strong>privacy@cofactorstudent.com</strong>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
          <p className="text-muted-foreground">We collect the following categories of personal data:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Account data:</strong> name, email address, university, matricola number, academic year</li>
            <li><strong>Study data:</strong> study logs, topic mastery, weekly goals, daily scores, persona quiz answers</li>
            <li><strong>Health data (optional):</strong> Apple HealthKit data including heart rate, sleep, and activity metrics — only with your explicit consent</li>
            <li><strong>Usage data:</strong> feedback, session interactions, and leaderboard participation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Legal Basis for Processing</h2>
          <p className="text-muted-foreground">We process your data based on:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> for health data and optional analytics</li>
            <li><strong>Contract performance (Art. 6(1)(b)):</strong> to provide the study tracking service</li>
            <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> for service improvement and security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. How We Use Your Data</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Provide personalized study insights and recommendations</li>
            <li>Calculate cognitive readiness and burnout risk scores</li>
            <li>Generate AI-powered study plans and habit analysis</li>
            <li>Display leaderboards within private study libraries</li>
            <li>Allow university administrators to view aggregate academic metrics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Data Sharing</h2>
          <p className="text-muted-foreground">We do not sell your personal data. Data may be shared with:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Your university administrators:</strong> aggregated study metrics (if your university uses CoFactor)</li>
            <li><strong>Study library members:</strong> username and study statistics within libraries you join</li>
            <li><strong>AI service providers:</strong> anonymized study data for generating insights (processed in the EU/EEA)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
          <p className="text-muted-foreground">We retain your personal data for as long as your account is active. Upon account deletion, all data is permanently erased within 30 days. Aggregated, anonymized data may be retained for research purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Your Rights (GDPR Articles 15–22)</h2>
          <p className="text-muted-foreground">You have the right to:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Access</strong> your personal data (Art. 15) — use the "Export My Data" feature</li>
            <li><strong>Rectification</strong> of inaccurate data (Art. 16)</li>
            <li><strong>Erasure</strong> ("right to be forgotten") (Art. 17) — use the "Delete Account" feature</li>
            <li><strong>Restriction</strong> of processing (Art. 18)</li>
            <li><strong>Data portability</strong> (Art. 20) — export your data in JSON format</li>
            <li><strong>Object</strong> to processing (Art. 21)</li>
            <li><strong>Withdraw consent</strong> at any time without affecting lawfulness of prior processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Cookies</h2>
          <p className="text-muted-foreground">We use only essential cookies required for authentication and session management. No tracking or advertising cookies are used. You can manage cookie preferences via the cookie banner.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. International Transfers</h2>
          <p className="text-muted-foreground">Your data is stored in the EU. If data is transferred outside the EU/EEA, we ensure adequate safeguards are in place (e.g., Standard Contractual Clauses).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">10. Data Security</h2>
          <p className="text-muted-foreground">We implement technical and organizational measures including encryption at rest and in transit, row-level security, and regular security audits.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">11. Supervisory Authority</h2>
          <p className="text-muted-foreground">You have the right to lodge a complaint with your local data protection authority. In Italy, this is the Garante per la protezione dei dati personali.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
          <p className="text-muted-foreground">We may update this policy. Material changes will be communicated via email or in-app notification. Continued use after notification constitutes acceptance.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
