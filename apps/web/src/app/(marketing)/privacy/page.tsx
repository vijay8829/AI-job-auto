export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: May 2026</p>

        <section className="space-y-8 text-sm leading-7 text-foreground/80">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Data We Collect</h2>
            <p>
              We collect your email address, name, resume content, job preferences, and application
              history. We also collect platform credentials you choose to connect (stored encrypted).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. How We Use Your Data</h2>
            <p>
              Your data is used solely to provide the Service: matching jobs, generating cover letters,
              tracking applications, and improving AI models. We do not sell your data to third parties.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Data Storage & Security</h2>
            <p>
              Data is stored in encrypted PostgreSQL databases. Platform credentials are encrypted at
              rest using AES-256. We use TLS 1.3 for all data in transit.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Third-Party Services</h2>
            <p>
              We use OpenAI for AI features, Stripe for payments, and SendGrid for email. Each has its
              own privacy policy. We share only the minimum data required for these integrations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Your Rights</h2>
            <p>
              You may request a copy of your data, correction of inaccurate data, or deletion of your
              account and all associated data at any time via Settings → Account.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Contact</h2>
            <p>
              Privacy questions: <a href="mailto:privacy@aijobplatform.com" className="text-primary underline">privacy@aijobplatform.com</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
