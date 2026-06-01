export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: May 2026</p>

        <section className="space-y-8 text-sm leading-7 text-foreground/80">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the AI Job Application Automation Platform ("Service"), you agree to be
              bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Use of Service</h2>
            <p>
              You may use the Service for lawful job-search automation purposes only. You are responsible
              for maintaining the confidentiality of your credentials and all activity under your account.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. AI Features</h2>
            <p>
              The Service uses artificial intelligence to assist with job matching, resume parsing, and
              application drafting. AI-generated content is provided for guidance only and may not be
              accurate. Always review AI output before submitting applications.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Subscriptions & Billing</h2>
            <p>
              Paid plans are billed monthly or annually. Cancellation takes effect at the end of the
              current billing period. Refunds are not provided for partial periods.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Limitation of Liability</h2>
            <p>
              The Service is provided "as is." We make no warranties regarding job outcomes. Our liability
              is limited to the amount you paid in the 30 days preceding any claim.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Contact</h2>
            <p>
              Questions? Email us at <a href="mailto:support@aijobplatform.com" className="text-primary underline">support@aijobplatform.com</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
