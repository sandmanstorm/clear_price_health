import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";

export const metadata = {
  title: "How to Use ClearPrice",
  description: "A plain-English guide to searching, comparing, and understanding hospital prices on ClearPrice.",
};

export default function GuidePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-surface">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#00478d] to-[#005eb8] px-8 py-16">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block px-3 py-1 bg-white/10 text-white font-label text-[10px] uppercase tracking-widest font-bold mb-4 rounded-sm">
              USER GUIDE
            </span>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white">
              How to Use ClearPrice
            </h1>
            <p className="text-blue-100/90 mt-4 text-lg max-w-2xl">
              A plain-English guide to finding hospital prices, comparing them, and understanding what the numbers actually mean.
            </p>
          </div>
        </section>

        {/* TOC */}
        <section className="max-w-5xl mx-auto px-8 py-8">
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
            <h2 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant mb-3">
              On this page
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <a href="#quick-start" className="text-primary hover:underline">1. Quick Start — Find a price in 30 seconds</a>
              <a href="#prices" className="text-primary hover:underline">2. The four prices you'll see (and which matters)</a>
              <a href="#codes" className="text-primary hover:underline">3. Medical codes decoded (CPT, DRG, HCPCS)</a>
              <a href="#search" className="text-primary hover:underline">4. Using Search</a>
              <a href="#compare" className="text-primary hover:underline">5. Using Compare</a>
              <a href="#hospital-page" className="text-primary hover:underline">6. Reading a hospital's page</a>
              <a href="#ai" className="text-primary hover:underline">7. Using the AI assistant</a>
              <a href="#estimate" className="text-primary hover:underline">8. Getting a real cost estimate</a>
              <a href="#faq" className="text-primary hover:underline">9. FAQ</a>
            </div>
          </div>
        </section>

        <style>{`
          .guide-section { max-width: 64rem; margin: 0 auto; padding: 2rem 2rem 0; }
          .guide-section h2 { font-family: Manrope, sans-serif; font-weight: 800; font-size: 2rem; color: #00478d; margin-top: 2rem; margin-bottom: 0.75rem; }
          .guide-section h3 { font-family: Manrope, sans-serif; font-weight: 700; font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #191c1d; }
          .guide-section p { line-height: 1.75; color: #424752; margin-bottom: 1rem; }
          .guide-section ul { list-style: disc; margin-left: 1.5rem; color: #424752; }
          .guide-section li { margin-bottom: 0.5rem; line-height: 1.6; }
          .guide-section strong { color: #191c1d; font-weight: 700; }
          .guide-section .tip { background: #cae2fe; border-left: 4px solid #00478d; padding: 1rem 1.25rem; margin: 1.25rem 0; border-radius: 0.25rem; color: #191c1d; }
          .guide-section .warn { background: #ffdad6; border-left: 4px solid #ba1a1a; padding: 1rem 1.25rem; margin: 1.25rem 0; border-radius: 0.25rem; color: #191c1d; }
          .guide-section .step { display: flex; gap: 1rem; padding: 1rem; margin-bottom: 0.75rem; background: #fff; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .guide-section .step-num { flex: 0 0 2rem; width: 2rem; height: 2rem; border-radius: 9999px; background: #00478d; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: Manrope, sans-serif; }
          .guide-section .step-body { flex: 1; }
          .guide-section .step-body p { margin: 0; color: #424752; }
          .guide-section .price-card { background: #fff; border: 1px solid #c2c6d4; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1rem; }
          .guide-section .price-card h4 { font-family: Manrope, sans-serif; font-weight: 700; font-size: 1.1rem; color: #00478d; margin-bottom: 0.25rem; }
          .guide-section .price-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #727783; font-weight: 700; margin-bottom: 0.25rem; }
          .guide-section .price-example { font-family: monospace; color: #424752; font-size: 0.9rem; }
          .guide-section .faq-item { padding: 1rem 0; border-bottom: 1px solid #c2c6d4; }
          .guide-section .faq-item:last-child { border-bottom: 0; }
          .guide-section .faq-q { font-family: Manrope, sans-serif; font-weight: 700; color: #191c1d; margin-bottom: 0.5rem; }
          .guide-section code { background: #e7e8e9; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-size: 0.9em; }
        `}</style>

        <article className="guide-section pb-16">

          {/* 1. Quick Start */}
          <h2 id="quick-start">1. Quick Start — Find a price in 30 seconds</h2>
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-body">
              <p><strong>Type the procedure you're looking for</strong> in the search bar on the home page. For example: "MRI brain", "knee replacement", or a CPT code like "70553".</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-body">
              <p><strong>Browse the results.</strong> Each result shows the hospital, the city/state, and the four prices (see next section for what they mean).</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-body">
              <p><strong>Click a hospital</strong> to see all of its prices, filter by procedure category, and see what each insurance payer has negotiated.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-body">
              <p><strong>Use Compare</strong> to put 2–5 hospitals side-by-side on the same procedure and see the potential savings.</p>
            </div>
          </div>

          {/* 2. Prices */}
          <h2 id="prices">2. The four prices you'll see</h2>
          <p>
            Every hospital publishes four different prices for the same procedure. Understanding the difference
            between them is the single most important thing you can learn here.
          </p>

          <div className="price-card">
            <div className="price-label">Gross Charge</div>
            <h4>Gross Charge — The "rack rate"</h4>
            <p>
              This is the hospital's list price — what they would theoretically bill an uninsured patient paying
              by mail. <strong>Almost nobody actually pays this amount.</strong> It's essentially a starting number
              from which insurers negotiate down.
            </p>
            <p className="price-example">Example: $4,200 for a basic MRI</p>
          </div>

          <div className="price-card">
            <div className="price-label">Cash Price (a.k.a. Discounted Self-Pay)</div>
            <h4>Cash Price — What you'd pay without insurance, upfront</h4>
            <p>
              If you're uninsured and can pay at time of service, many hospitals offer this discounted rate. Ask
              for it explicitly — it's often 50–70% below the gross charge. In most states hospitals must give
              uninsured patients a "Good Faith Estimate" under the No Surprises Act.
            </p>
            <p className="price-example">Example: $2,100 for that same MRI (50% off gross)</p>
          </div>

          <div className="price-card">
            <div className="price-label">Minimum / Maximum Negotiated</div>
            <h4>Min & Max Negotiated — The floor and ceiling of insured pricing</h4>
            <p>
              These are the <strong>lowest</strong> and <strong>highest</strong> rates the hospital has negotiated
              with <em>any</em> insurer. The difference between min and max is often 3× or more for the same
              procedure — showing how much pricing varies by plan.
            </p>
            <p className="price-example">Example: Min $1,800 / Max $3,900 — a 2.2× spread</p>
          </div>

          <div className="price-card">
            <div className="price-label">Payer-Specific Rate</div>
            <h4>Per-Payer Rate — The contracted rate for a named insurance plan</h4>
            <p>
              The most useful number <em>if</em> your specific plan is listed. Each row shows the payer name
              (Aetna, BCBS, UnitedHealth, etc.) and the exact dollar amount that hospital has contracted for that
              procedure with that plan.
            </p>
            <p className="price-example">Example: "Aetna PPO: $2,800"</p>
          </div>

          <div className="tip">
            <strong>Which should you look at?</strong> In order of usefulness:
            <ul style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              <li>If you're insured → <strong>your specific payer's rate</strong></li>
              <li>If your payer isn't listed → somewhere between <strong>min and max negotiated</strong></li>
              <li>If you're uninsured → the <strong>cash price</strong></li>
              <li>Ignore gross charge for planning — it's almost never the real price</li>
            </ul>
          </div>

          {/* 3. Codes */}
          <h2 id="codes">3. Medical codes decoded</h2>
          <p>You'll see different codes attached to procedures. Here's what they mean:</p>

          <h3>CPT (Current Procedural Terminology)</h3>
          <p>
            Five-digit codes for medical procedures and services. Created by the American Medical Association.
            Example: <code>70553</code> = MRI of the brain with contrast. When in doubt, a CPT code is the most
            precise way to match the same procedure across hospitals.
          </p>

          <h3>HCPCS (Healthcare Common Procedure Coding System)</h3>
          <p>
            Codes for supplies, drugs, and services that CPT doesn't cover (ambulance, durable medical equipment,
            etc.). Often start with a letter: <code>J3301</code>, <code>A0428</code>.
          </p>

          <h3>DRG (Diagnosis-Related Group)</h3>
          <p>
            A code Medicare uses to group inpatient stays into single payable bundles. Instead of paying line-by-line,
            Medicare pays a flat rate per DRG. Example: DRG 470 = major joint replacement of lower extremity.
            Useful if you're comparing inpatient stays.
          </p>

          <h3>Inpatient vs Outpatient (the "Setting")</h3>
          <p>
            The same procedure can cost very different amounts depending on where it happens:
          </p>
          <ul>
            <li><strong>Inpatient</strong> — you're admitted and stay overnight (or longer)</li>
            <li><strong>Outpatient</strong> — you go home the same day</li>
            <li><strong>ASC</strong> — Ambulatory Surgical Center, usually cheaper than hospital outpatient</li>
          </ul>
          <p>
            Always check that the price you're comparing is for the same setting. An outpatient knee scope and an
            inpatient knee replacement are not the same product.
          </p>

          {/* 4. Search */}
          <h2 id="search">4. Using Search</h2>
          <p>The search bar accepts several types of input:</p>
          <ul>
            <li><strong>Plain English</strong>: "MRI brain", "knee replacement", "colonoscopy"</li>
            <li><strong>CPT code</strong>: "70553", "27447" — exact match</li>
            <li><strong>Hospital name</strong>: "Providence Alaska" — jumps to that hospital's page</li>
          </ul>
          <p>
            Search uses PostgreSQL full-text indexing plus fuzzy matching, so typos usually still find what you mean.
            Results are ranked by relevance, then by cash price (cheapest first).
          </p>
          <div className="tip">
            <strong>Power tip:</strong> If you have a specific CPT code from your doctor's order, search for that
            code directly. It's the most precise cross-hospital comparison you can make.
          </div>

          {/* 5. Compare */}
          <h2 id="compare">5. Using Compare</h2>
          <p>
            The <Link href="/compare" className="text-primary underline">Compare page</Link> lets you put 2–5
            hospitals side-by-side on the same procedure.
          </p>
          <div className="step"><div className="step-num">1</div><div className="step-body"><p>Type the procedure you want to compare in the top box.</p></div></div>
          <div className="step"><div className="step-num">2</div><div className="step-body"><p>Check the boxes next to 2–5 hospitals.</p></div></div>
          <div className="step"><div className="step-num">3</div><div className="step-body"><p>Click <strong>Compare Prices</strong>. You'll see a table with all four price tiers for each hospital and a "Potential Savings" callout showing the cheapest option and the spread.</p></div></div>
          <div className="tip">
            If you have an Anthropic API key configured, you can click <strong>Explain this comparison</strong> and
            the AI will write a plain-English summary of the differences.
          </div>

          {/* 6. Hospital detail */}
          <h2 id="hospital-page">6. Reading a hospital's page</h2>
          <p>Each hospital page shows four sections from top to bottom:</p>
          <h3>Header stats</h3>
          <ul>
            <li><strong>Procedures</strong> — how many unique procedures are in our copy of this hospital's data</li>
            <li><strong>Charges</strong> — total number of charge rows (a procedure can appear multiple times with different settings/payers)</li>
            <li><strong>Payers</strong> — how many distinct insurance plans have published rates for this hospital</li>
            <li><strong>Last Updated</strong> — when we last successfully re-parsed this hospital's file</li>
          </ul>
          <h3>Procedure search box</h3>
          <p>Filter the procedure list by keyword or CPT code. Press Enter to apply.</p>
          <h3>Procedure table</h3>
          <p>
            Every row is one procedure. Columns: description, CPT code, and the four prices. The cash price is
            highlighted in primary color because it's typically the most actionable for uninsured planning.
          </p>

          {/* 7. AI */}
          <h2 id="ai">7. Using the AI assistant</h2>
          <p>
            The AI assistant (when an Anthropic key is configured) lets you ask questions in plain English like:
          </p>
          <ul>
            <li>"How much does an MRI cost at Providence hospitals in California?"</li>
            <li>"What's the difference between the cash price and gross charge for a colonoscopy?"</li>
            <li>"Which hospital is cheapest for knee replacement?"</li>
          </ul>
          <p>
            Behind the scenes, the AI searches the database, pulls top matches, and writes a response using
            actual pricing numbers. Every response includes a disclaimer.
          </p>
          <div className="warn">
            <strong>AI responses can be wrong.</strong> They may miscount, misattribute a price to the wrong
            hospital, or misread a setting (inpatient vs outpatient). Always verify against the hospital detail
            page or the source MRF before making a decision.
          </div>

          {/* 8. Estimate */}
          <h2 id="estimate">8. Getting a real cost estimate</h2>
          <p>
            ClearPrice shows what the hospital <em>publishes</em>. Your actual out-of-pocket cost depends on many
            things we don't know. Here's the full workflow for a reliable personal estimate:
          </p>
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-body">
              <p><strong>Find the procedure here first.</strong> Get the CPT code and see the price range across hospitals.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-body">
              <p><strong>Call your insurance company.</strong> Ask: "For CPT code [X] at [hospital name], what will my out-of-pocket cost be given my plan and where I am in my deductible?"</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-body">
              <p><strong>Call the hospital's billing office.</strong> Ask for a Good Faith Estimate. Under the No Surprises Act, you're entitled to one if you're uninsured, and many hospitals will provide one for insured patients on request too.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-body">
              <p><strong>Compare the estimate to what ClearPrice shows.</strong> If the estimate is wildly higher than the published negotiated rate, ask why. You have leverage.</p>
            </div>
          </div>

          {/* 9. FAQ */}
          <h2 id="faq">9. Frequently Asked Questions</h2>

          <div className="faq-item">
            <p className="faq-q">Why do different hospitals charge so differently for the same procedure?</p>
            <p>
              Pricing reflects each hospital's overhead, its negotiating leverage with insurers, whether it's a
              teaching or rural hospital, and sometimes not much more. A 3× price spread for the exact same CPT
              code is common.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">Why is my actual bill higher than what ClearPrice shows?</p>
            <p>
              Your bill can include procedures and line items the original published price doesn't cover —
              anesthesia, pathology, radiology reads, facility fees, supplies, follow-up visits, etc. The MRF
              price is usually for a single specific procedure code, not an entire episode of care.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">How up-to-date is this data?</p>
            <p>
              We re-ingest every hospital's file nightly at 2am Pacific. But we're only as fresh as what the
              hospital has published. Some hospitals update monthly, some quarterly, some haven't updated since
              2021. Each hospital page shows its "Last Updated" date.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">Why isn't my hospital listed?</p>
            <p>
              We've imported the full CMS directory of ~5,400 U.S. hospitals, but not all of them have a working,
              parseable MRF URL in our database yet. Many hospitals publish CSV or Excel files that our parser
              doesn't yet read. Email <a href="mailto:corrections@clearpricehealth.org" className="text-primary underline">corrections@clearpricehealth.org</a> with
              the hospital name and we'll try to add it.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">I'm a researcher / journalist. Can I use this data?</p>
            <p>
              The underlying CMS machine-readable files are public record. Our parsed, indexed version is free
              for personal use. For bulk data access or commercial use, please email{" "}
              <a href="mailto:hello@clearpricehealth.org" className="text-primary underline">hello@clearpricehealth.org</a>.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">Does ClearPrice negotiate or help with medical bills?</p>
            <p>
              No. ClearPrice is an information tool only. We don't negotiate bills, appeal insurance denials, or
              provide financial assistance. For help with specific bills, look into patient advocacy services or
              your state's Consumer Assistance Program.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">Is my personal data safe?</p>
            <p>
              We collect the minimum we need (email + hashed password if you register) and never sell it. See
              our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> for specifics.
            </p>
          </div>

          <div className="faq-item">
            <p className="faq-q">I found an error. Can I report it?</p>
            <p>
              Yes — please! Email{" "}
              <a href="mailto:corrections@clearpricehealth.org" className="text-primary underline">corrections@clearpricehealth.org</a>{" "}
              with the hospital, the procedure, and what looks wrong. We investigate and correct verified issues.
            </p>
          </div>

          {/* CTA */}
          <div style={{ marginTop: "3rem", padding: "2rem", background: "#00478d", borderRadius: "0.5rem", color: "white", textAlign: "center" }}>
            <h2 style={{ color: "white", marginTop: 0 }}>Ready to search?</h2>
            <p style={{ color: "#bfd4f5" }}>Find the price of any procedure at any hospital in our database.</p>
            <Link href="/search" style={{ display: "inline-block", background: "white", color: "#00478d", padding: "0.75rem 2rem", borderRadius: "0.25rem", fontWeight: 700, marginTop: "1rem" }}>
              Start Searching
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
