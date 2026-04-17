import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy",
  description: "How ClearPrice collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="How we handle your information" lastUpdated="April 17, 2026">
      <p>
        This policy explains what information ClearPrice collects, why, how long we keep it, and what rights you
        have over it. We designed the site to collect as little as possible.
      </p>

      <h2>Information We Collect</h2>

      <h3>Information You Provide</h3>
      <ul>
        <li><strong>Account information</strong>: If you create an account, we store your email address, a one-way bcrypt hash of your password, your chosen display name, and your verification status.</li>
        <li><strong>AI chat queries</strong>: If you use the AI assistant, we store the question you typed and the AI's response, linked to your session. This helps us improve quality and investigate errors.</li>
        <li><strong>Email preferences</strong>: If you subscribe to weekly hospital update digests, we store your email address and ZIP code (optional) until you unsubscribe.</li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <ul>
        <li><strong>Authentication tokens</strong>: When you log in, we issue JWT access tokens (30 minutes) and refresh tokens (7 days) stored in your browser's local storage.</li>
        <li><strong>Session records</strong>: We log your login user-agent and IP address to help detect suspicious activity. These are deleted when you log out or when the refresh token expires.</li>
        <li><strong>Analytics</strong>: We may run a self-hosted Umami analytics instance that records page views, referrers, and browser/country metadata — never anything personally identifying. No third-party tracking scripts.</li>
      </ul>

      <h3>Information We Do Not Collect</h3>
      <ul>
        <li>We do not collect medical records, health history, or treatment information</li>
        <li>We do not collect financial information, insurance details, or payment data (we do not process payments)</li>
        <li>We do not collect Social Security numbers or other government identifiers</li>
        <li>We do not use third-party advertising, retargeting, or behavioral tracking cookies</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To authenticate you and keep your account secure</li>
        <li>To send you password reset and email verification messages</li>
        <li>To send the weekly digest (only if you opt in)</li>
        <li>To improve search relevance and diagnose technical problems</li>
        <li>To respond to your support requests</li>
      </ul>

      <h2>How We Share Your Information</h2>
      <p>We do not sell, rent, or trade your personal information. We share data only in these limited cases:</p>
      <ul>
        <li><strong>Claude AI (Anthropic)</strong>: If you use the AI assistant, your question and relevant pricing data are sent to Anthropic's API to generate a response. Anthropic does not train on API submissions by default.</li>
        <li><strong>Email provider</strong>: Transactional emails (password reset, verification) pass through our SMTP provider.</li>
        <li><strong>Legal compliance</strong>: We will disclose information if required by valid legal process (subpoena, court order, applicable law).</li>
      </ul>

      <h2>Data Security</h2>
      <ul>
        <li>All traffic is served over HTTPS</li>
        <li>Passwords are hashed with bcrypt (never stored in plaintext)</li>
        <li>Sensitive server-side settings (API keys, SMTP credentials) are encrypted at rest using pgcrypto AES</li>
        <li>Database access is restricted to the application, not exposed to the internet</li>
        <li>We use fail2ban and rate limiting to block brute-force attacks</li>
      </ul>

      <h2>Data Retention</h2>
      <ul>
        <li>Account data: kept for the lifetime of your account. Delete your account to remove it.</li>
        <li>Session records: 7 days (auto-expired)</li>
        <li>AI conversation logs: 12 months</li>
        <li>Analytics data: 13 months</li>
        <li>Server access logs: 30 days</li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        Regardless of where you live, you have the right to:
      </p>
      <ul>
        <li><strong>Access</strong> the personal information we hold about you</li>
        <li><strong>Correct</strong> inaccurate information</li>
        <li><strong>Delete</strong> your account and associated data</li>
        <li><strong>Export</strong> your data in a portable format</li>
        <li><strong>Opt out</strong> of non-transactional emails at any time</li>
      </ul>
      <p>
        If you are a California resident, the CCPA gives you additional rights. If you are in the EU/UK, the GDPR
        gives you additional rights. To exercise any of these, email{" "}
        <a href="mailto:privacy@clearpricehealth.org">privacy@clearpricehealth.org</a>.
      </p>

      <h2>Children's Privacy</h2>
      <p>
        ClearPrice is not directed at children under 13. We do not knowingly collect information from children.
        If you believe we have collected information from a child, please contact us and we will delete it.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we will notify account holders
        by email. The "last updated" date at the top reflects the most recent revision.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Email{" "}
        <a href="mailto:privacy@clearpricehealth.org">privacy@clearpricehealth.org</a>.
      </p>
    </LegalLayout>
  );
}
