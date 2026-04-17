import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "Contact",
  description: "Get in touch with ClearPrice.",
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us" subtitle="We want to hear from you.">
      <h2>General Questions</h2>
      <p>
        For general questions, feedback, or partnership inquiries, email{" "}
        <a href="mailto:hello@clearpricehealth.org">hello@clearpricehealth.org</a>.
      </p>

      <h2>Data Corrections</h2>
      <p>
        Found a wrong price, broken URL, missing hospital, or incorrect address? Email{" "}
        <a href="mailto:corrections@clearpricehealth.org">corrections@clearpricehealth.org</a> with:
      </p>
      <ul>
        <li>The hospital name (and state)</li>
        <li>A link to the affected page on ClearPrice</li>
        <li>A brief description of what looks wrong</li>
        <li>A source for the correct information if you have one</li>
      </ul>

      <h2>Privacy and Data Rights</h2>
      <p>
        To exercise your access, correction, deletion, or export rights, email{" "}
        <a href="mailto:privacy@clearpricehealth.org">privacy@clearpricehealth.org</a>. We typically
        respond within 30 days.
      </p>

      <h2>Legal / DMCA</h2>
      <p>
        Legal notices and takedown requests: <a href="mailto:legal@clearpricehealth.org">legal@clearpricehealth.org</a>.
      </p>

      <h2>Security</h2>
      <p>
        Responsible disclosure of security vulnerabilities is appreciated. Email{" "}
        <a href="mailto:security@clearpricehealth.org">security@clearpricehealth.org</a>. We do not currently
        offer bug bounties, but we do credit researchers who report valid issues.
      </p>

      <h2>Press</h2>
      <p>
        Media inquiries: <a href="mailto:press@clearpricehealth.org">press@clearpricehealth.org</a>.
      </p>

      <h2>Not Medical Help</h2>
      <div className="callout">
        <p style={{ margin: 0 }}>
          If you are experiencing a medical emergency, <strong>do not</strong> contact us. Call 911 or go to
          the nearest emergency room. ClearPrice does not provide medical services.
        </p>
      </div>
    </LegalLayout>
  );
}
