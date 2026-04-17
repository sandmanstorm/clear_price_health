import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of ClearPrice.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="April 17, 2026">
      <p>
        These Terms of Service ("Terms") govern your use of ClearPrice (the "Service"). By using the Service,
        you agree to these Terms. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Nature of the Service</h2>
      <p>
        ClearPrice aggregates and presents hospital pricing information that is already public under federal
        law. The Service is informational only. <strong>It does not provide medical, legal, tax, or financial advice.</strong>
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Service. If you create an account, you agree to provide
        accurate information and to keep your credentials secure. You are responsible for all activity under
        your account.
      </p>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service in any unlawful manner or for any unlawful purpose</li>
        <li>Scrape, harvest, or bulk-download data via automated means that circumvent our rate limits</li>
        <li>Attempt to gain unauthorized access to any part of the Service</li>
        <li>Interfere with, disrupt, or overload the Service</li>
        <li>Upload or transmit malware, viruses, or harmful code</li>
        <li>Use the Service to harass, defame, or harm any person or organization</li>
        <li>Impersonate another person or misrepresent your affiliation</li>
        <li>Reverse-engineer, decompile, or otherwise attempt to derive the source code</li>
      </ul>
      <p>
        For legitimate research or commercial redistribution of the underlying data, please contact us for
        licensing options.
      </p>

      <h2>4. Accuracy of Pricing Information</h2>
      <div className="callout">
        <p style={{ margin: 0 }}>
          The prices displayed on ClearPrice are <strong>standard charges</strong> sourced from each hospital's
          own machine-readable file. They may be out of date, incorrectly formatted by the hospital, or superseded
          by updates we have not yet re-ingested. They are <strong>not</strong> a quote, a commitment, or a
          binding price. Your actual out-of-pocket cost depends on many factors including your insurance plan,
          deductible, benefits, and the specific services ultimately billed. <strong>Always confirm pricing
          directly with the hospital and your insurer before receiving care.</strong>
        </p>
      </div>

      <h2>5. AI Features</h2>
      <p>
        ClearPrice offers an AI assistant powered by Anthropic's Claude model. AI-generated responses may
        contain errors, omissions, or misinterpretations of the underlying data. AI responses are not medical
        advice, not financial advice, and not legal advice. Use them as a starting point for your own research,
        not as a final answer.
      </p>

      <h2>6. Medical Disclaimer</h2>
      <p>
        <strong>ClearPrice is not a medical provider, not a healthcare professional, and not a substitute for
        professional medical advice.</strong> Never delay seeking care because of information you read on this
        Service. In an emergency, call 911 or your local emergency number. For medical questions, consult a
        qualified healthcare provider. For insurance questions, consult your insurer. For legal questions,
        consult a licensed attorney. See our full <a href="/disclaimer">Medical Disclaimer</a>.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        The pricing data published by hospitals is public record under 45 CFR Part 180 and is not owned by
        ClearPrice. Our code, design, logos, copy, and compilations of the data are owned by ClearPrice or
        our licensors. You may view and use the Service for personal, non-commercial purposes. You may not
        copy, scrape, or redistribute the Service or its content without permission.
      </p>

      <h2>8. User-Generated Content</h2>
      <p>
        If you submit feedback, corrections, or other content to us, you grant ClearPrice a non-exclusive,
        royalty-free, perpetual license to use that content to operate and improve the Service.
      </p>

      <h2>9. Third-Party Services and Links</h2>
      <p>
        Links on the Service may point to third-party websites (hospital websites, CMS, insurers, etc.). We
        are not responsible for the content, privacy practices, or availability of those sites.
      </p>

      <h2>10. Termination</h2>
      <p>
        We may suspend or terminate your account at any time for violation of these Terms or for any lawful
        reason. You may delete your account at any time.
      </p>

      <h2>11. Disclaimer of Warranties</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED OPERATION. We make no guarantee that the pricing data is
        accurate, complete, current, or suitable for any particular purpose.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLEARPRICE AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
        HEALTHCARE OUTCOMES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT
        EXCEED ONE HUNDRED U.S. DOLLARS ($100) OR THE AMOUNT YOU HAVE PAID US IN THE PAST TWELVE MONTHS
        (WHICHEVER IS GREATER).
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You agree to indemnify and hold ClearPrice harmless from any claims, damages, or expenses arising
        from your violation of these Terms or misuse of the Service.
      </p>

      <h2>14. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the United States, without regard to conflict of laws
        principles. Any dispute shall be resolved in the federal or state courts located in the jurisdiction
        of ClearPrice's principal place of business.
      </p>

      <h2>15. Changes to the Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced on this page with an
        updated "last updated" date. Continued use after changes constitutes acceptance.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:legal@clearpricehealth.org">legal@clearpricehealth.org</a>.
      </p>
    </LegalLayout>
  );
}
