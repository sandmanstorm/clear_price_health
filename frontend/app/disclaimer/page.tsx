import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "Medical & Financial Disclaimer",
  description: "Important disclaimers regarding ClearPrice content.",
};

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Medical & Financial Disclaimer" lastUpdated="April 17, 2026">
      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>In an emergency, call 911 or your local emergency number.</strong> Do not use this Service to
          decide whether to seek emergency care.
        </p>
      </div>

      <h2>No Medical Advice</h2>
      <p>
        ClearPrice is an information tool for healthcare pricing transparency. <strong>Nothing on this site
        is medical advice.</strong> Information about procedures, diagnoses, or conditions is provided solely
        to help you understand pricing context and is not a substitute for professional medical advice,
        diagnosis, or treatment.
      </p>
      <p>
        Always seek the advice of a qualified healthcare provider with any questions you have regarding a
        medical condition or treatment decision. Never disregard professional medical advice or delay in
        seeking it because of something you have read on this Service.
      </p>

      <h2>No Financial or Legal Advice</h2>
      <p>
        Pricing information on ClearPrice is provided for general informational purposes. It does not constitute
        financial, tax, accounting, insurance, or legal advice. For specific guidance, consult a licensed
        professional:
      </p>
      <ul>
        <li>For insurance coverage questions, contact your health plan directly</li>
        <li>For billing disputes, contact the hospital's billing office</li>
        <li>For legal questions about medical bills or surprise-billing protections, consult a licensed attorney</li>
        <li>For financial planning, consult a licensed financial advisor</li>
      </ul>

      <h2>Prices Are Not Quotes</h2>
      <p>
        The prices displayed are <strong>standard charges</strong> published by hospitals under federal
        transparency rules. They are not:
      </p>
      <ul>
        <li>A quote or binding offer</li>
        <li>A guarantee of what you will pay</li>
        <li>A prediction of your out-of-pocket cost</li>
        <li>A substitute for a Good Faith Estimate (which hospitals must provide for uninsured and self-pay patients under the No Surprises Act)</li>
      </ul>
      <p>
        Your actual cost depends on your insurance plan, deductible, coinsurance, out-of-pocket maximum, plan
        year, network status, medical necessity determinations, and what specific services are ultimately
        billed. Contact the hospital and your insurer for personalized estimates.
      </p>

      <h2>Data Accuracy</h2>
      <p>
        While we strive to reflect the most recent data each hospital has published, we cannot guarantee
        accuracy, completeness, or timeliness. Hospitals sometimes publish errors, change URLs, change file
        formats, or fail to update their files. If you are making a consequential decision, verify pricing
        directly with the hospital.
      </p>

      <h2>Your Rights Under Federal Law</h2>
      <p>
        You have the right to:
      </p>
      <ul>
        <li><strong>A Good Faith Estimate</strong> before scheduled care if you are uninsured or self-pay (No Surprises Act)</li>
        <li><strong>Protection from surprise billing</strong> in most emergency situations and from out-of-network providers at in-network facilities (No Surprises Act)</li>
        <li><strong>An itemized bill</strong> from the hospital upon request</li>
        <li><strong>To dispute a medical bill</strong> that exceeds the Good Faith Estimate by $400 or more</li>
      </ul>
      <p>
        Learn more at <a href="https://www.cms.gov/nosurprises" target="_blank" rel="noreferrer">cms.gov/nosurprises</a>.
      </p>

      <h2>AI-Generated Content</h2>
      <p>
        The AI assistant generates responses using a large language model. AI-generated content can be
        inaccurate, incomplete, or misleading. Treat all AI output as a starting point for your own research,
        not a final answer, and verify any important claim against the underlying data or a qualified
        professional.
      </p>

      <h2>Third-Party Links</h2>
      <p>
        ClearPrice links to hospital websites, CMS resources, and other third-party sites. We do not endorse,
        control, or assume responsibility for the content or practices of those sites.
      </p>
    </LegalLayout>
  );
}
