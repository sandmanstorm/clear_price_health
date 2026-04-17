import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "About ClearPrice",
  description: "ClearPrice makes hospital pricing data searchable and understandable, empowering patients with information before they receive care.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About ClearPrice" subtitle="Healthcare pricing, made transparent.">
      <h2>Our Mission</h2>
      <p>
        ClearPrice exists so that patients never have to guess what a procedure will cost. Since January 2021,
        U.S. federal law (45 CFR Part 180) has required every hospital in the country to publish a
        machine-readable file of its standard charges. In practice those files are often 500-megabyte JSON dumps
        buried on a footer link — technically compliant, but useless to an ordinary person.
      </p>
      <p>
        We take those files, parse them, clean them, index them, and put a simple search box in front of them.
        That's it. No paywall. No account required to view prices.
      </p>

      <h2>What You Can Do Here</h2>
      <ul>
        <li><strong>Search any procedure</strong> by name or CPT code and see what hospitals charge for it</li>
        <li><strong>Compare hospitals</strong> side by side on the same procedure</li>
        <li><strong>View an entire hospital's charge list</strong> with filters and payer breakdowns</li>
        <li><strong>Ask questions in plain English</strong> with our AI assistant (when enabled)</li>
      </ul>

      <h2>Where the Data Comes From</h2>
      <p>
        Every price on this site traces back to an authoritative source:
      </p>
      <ul>
        <li>The <strong>CMS Hospital General Information</strong> dataset (for the directory of ~5,400 U.S. hospitals)</li>
        <li>Each hospital's <strong>CMS-mandated machine-readable file</strong> (for the actual charges)</li>
        <li>Public aggregator repositories (for historical URL mappings)</li>
      </ul>
      <p>
        Our ingestion pipeline runs nightly, re-parsing each hospital's published file and updating the database.
        When a hospital updates its file, we pick up the change within 24 hours.
      </p>

      <h2>What We Are Not</h2>
      <p>
        ClearPrice is an information tool, not a healthcare provider, not a broker, not an insurer. We do not:
      </p>
      <ul>
        <li>Give medical advice, diagnose conditions, or recommend treatments</li>
        <li>Recommend one hospital over another</li>
        <li>Sell your data or run targeted advertising</li>
        <li>Have a financial relationship with any hospital we list</li>
      </ul>

      <h2>Important Caveats About the Data</h2>
      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Published charges are not what you will pay.</strong> Your actual out-of-pocket cost depends on
          your insurance plan, your deductible, your plan year, any coinsurance, your out-of-pocket maximum,
          whether your provider is in-network, and what specific services are ultimately billed. Always contact
          your insurer and the hospital's billing department for a personalized estimate before committing to care.
        </p>
      </div>

      <h2>Contact</h2>
      <p>
        Questions, corrections, or feedback? Email us at{" "}
        <a href="mailto:hello@clearpricehealth.org">hello@clearpricehealth.org</a> or see our{" "}
        <a href="/contact">contact page</a>.
      </p>
    </LegalLayout>
  );
}
