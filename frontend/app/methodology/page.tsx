import { LegalLayout } from "@/components/LegalLayout";

export const metadata = {
  title: "Data Methodology",
  description: "Where ClearPrice's data comes from and how we process it.",
};

export default function MethodologyPage() {
  return (
    <LegalLayout title="Data Methodology" subtitle="How we collect, clean, and present hospital pricing data" lastUpdated="April 17, 2026">
      <h2>The Short Version</h2>
      <p>
        Every price on ClearPrice traces back to a machine-readable file published by the hospital itself,
        as required by federal law. We do not generate, estimate, or modify prices. We parse, index, and
        display what the hospital has already made public.
      </p>

      <h2>Data Sources</h2>
      <h3>Hospital Directory</h3>
      <p>
        Our master list of U.S. hospitals comes from the <strong>CMS Hospital General Information</strong>{" "}
        dataset (<a href="https://data.cms.gov/provider-data/dataset/xubh-q36u" target="_blank" rel="noreferrer">data.cms.gov/provider-data/dataset/xubh-q36u</a>),
        which contains roughly 5,400 acute-care and critical-access hospitals. For each hospital we store:
        name, CMS Certification Number (CCN), street address, city, state, and ZIP.
      </p>

      <h3>Pricing Files</h3>
      <p>
        Under <a href="https://www.ecfr.gov/current/title-45/part-180" target="_blank" rel="noreferrer">45 CFR Part 180</a>,
        every hospital must publish:
      </p>
      <ul>
        <li>A comprehensive machine-readable file of all items and services with standard charges</li>
        <li>A consumer-friendly list of at least 300 shoppable services</li>
      </ul>
      <p>
        We locate each hospital's file via three mechanisms, in order of preference:
      </p>
      <ul>
        <li><strong>Direct health system scrapers</strong>: For major systems (Providence, etc.) we parse the system's transparency landing page</li>
        <li><strong>Community URL datasets</strong>: We cross-reference the public Dolthub hospital-price-transparency repository</li>
        <li><strong>Manual curation</strong>: Missing URLs can be added via our admin interface</li>
      </ul>

      <h2>Ingestion Pipeline</h2>
      <p>Each hospital goes through the same deterministic pipeline:</p>
      <ol style={{ listStyle: "decimal", marginLeft: "1.5rem" }}>
        <li><strong>URL validation</strong>: We send a HEAD request to the hospital's file URL to confirm it is reachable.</li>
        <li><strong>Change detection</strong>: We compare the <code>Last-Modified</code> HTTP header to our stored value. If unchanged, we skip the hospital.</li>
        <li><strong>Streaming parse</strong>: We stream the file (which can be 50 MB to 800 MB) through an incremental JSON parser, never loading it fully into memory.</li>
        <li><strong>Schema mapping</strong>: We map each record to our normalized schema (procedure description, CPT/HCPCS/DRG code, gross charge, cash price, min/max negotiated, per-payer rates).</li>
        <li><strong>Upsert</strong>: We insert new procedures and upsert charges keyed on <code>(hospital, procedure, setting)</code>.</li>
        <li><strong>Logging</strong>: Every run is recorded with row count, duration, and any error.</li>
      </ol>

      <h2>Update Frequency</h2>
      <p>
        Our scheduler re-runs the full pipeline nightly at 2:00 AM Pacific. A hospital's data on ClearPrice
        is therefore at most ~24 hours behind whatever the hospital most recently published.
      </p>
      <p>
        Hospitals vary widely in how often they update: some republish monthly, others quarterly, and some have
        not updated since the initial 2021 deadline. We display the <code>last_fetched</code> date on every
        hospital page so you can judge freshness.
      </p>

      <h2>What We Store Per Charge</h2>
      <ul>
        <li><strong>Gross charge</strong>: The "rack rate" — what the hospital would bill if you had no insurance and paid nothing upfront</li>
        <li><strong>Cash/discounted price</strong>: The self-pay rate, typically much lower than gross</li>
        <li><strong>Minimum negotiated rate</strong>: The lowest rate any insurer has negotiated</li>
        <li><strong>Maximum negotiated rate</strong>: The highest rate any insurer has negotiated</li>
        <li><strong>Per-payer negotiated rates</strong>: Specific rates for each named insurance plan, where published</li>
        <li><strong>Setting</strong>: inpatient, outpatient, or other context where provided</li>
      </ul>

      <h2>Format Handling</h2>
      <p>
        Hospitals publish in a variety of formats. Our parser currently supports:
      </p>
      <ul>
        <li>✅ <strong>JSON</strong> (CMS 2024 standard) — fully supported</li>
        <li>⏳ <strong>CSV</strong>, <strong>XLSX</strong>, <strong>ZIP</strong> — planned</li>
        <li>❌ <strong>HTML landing pages</strong> — not parseable (no structured data)</li>
      </ul>

      <h2>Search</h2>
      <p>
        We index every procedure description with a PostgreSQL <code>tsvector</code> for full-text search and a
        <code>pg_trgm</code> index for fuzzy autocomplete. Results are ranked by <code>ts_rank</code> and
        secondarily by cash price.
      </p>

      <h2>AI Summaries and Q&A</h2>
      <p>
        When you ask the AI assistant a question, we:
      </p>
      <ol style={{ listStyle: "decimal", marginLeft: "1.5rem" }}>
        <li>Run a similarity search against matching procedures (top 5)</li>
        <li>Pull the top 10 charges across hospitals for each match</li>
        <li>Send the question plus this structured context to Claude</li>
        <li>Return Claude's plain-English response with a standard disclaimer</li>
      </ol>
      <p>
        The AI sees only the numerical pricing context — it does not see your identity, browsing history, or
        any medical information. AI responses may contain errors; always verify with the source.
      </p>

      <h2>Accuracy Caveats</h2>
      <p>Be aware of the following:</p>
      <ul>
        <li>Hospitals sometimes publish incorrect or malformed data. Our parser reports errors to the hospital's <code>ingest_log</code>.</li>
        <li>Many hospitals bury charges inside "billing codes" rather than CPT/HCPCS, making cross-hospital comparison harder.</li>
        <li>A payer's "negotiated rate" in the file may not reflect bundled discounts, value-based contracts, or site-of-service adjustments.</li>
        <li>The "gross charge" is rarely what anyone actually pays.</li>
      </ul>

      <h2>Corrections</h2>
      <p>
        If you spot an error — wrong price, outdated URL, missing hospital, broken link — email us at{" "}
        <a href="mailto:corrections@clearpricehealth.org">corrections@clearpricehealth.org</a> with a link
        to the hospital and the specific issue. We investigate and correct verified issues promptly.
      </p>

      <h2>Open Data</h2>
      <p>
        The underlying CMS machine-readable files are public record. Nothing in our data is proprietary — it
        all came from the hospitals themselves. Our value-add is parsing, indexing, and presentation.
      </p>
    </LegalLayout>
  );
}
