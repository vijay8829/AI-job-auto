import { BaseConnector, JobSearchParams, ScrapedJob, ApplyParams, ApplyResult, PlatformCredentials } from '../base.connector';
import axios from 'axios';
import type { Browser, BrowserContext, Page } from 'playwright';

export class GreenhouseConnector extends BaseConnector {
  readonly platformName = 'greenhouse';
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(account: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright') as typeof import('playwright');
    this.browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== 'false', args: ['--no-sandbox'] });
    this.context = await this.browser.newContext({ viewport: { width: 1440, height: 900 } });
    this.page = await this.context.newPage();
  }

  async login(credentials: PlatformCredentials): Promise<boolean> { return true; }
  async isSessionValid(): Promise<boolean> { return true; }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    // Greenhouse has a public job board API per company
    const jobs: ScrapedJob[] = [];
    // Example: use job aggregation via public boards
    const companies = ['airbnb', 'stripe', 'figma', 'notion']; // configurable
    for (const company of companies.slice(0, 3)) {
      try {
        const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`);
        const items = res.data?.jobs || [];
        for (const item of items.slice(0, 5)) {
          if (!params.roles.some((r) => item.title?.toLowerCase().includes(r.toLowerCase()))) continue;
          jobs.push(this.normalizeJobData({
            externalId: String(item.id),
            externalUrl: item.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${item.id}`,
            title: item.title,
            company: company,
            location: item.location?.name || '',
            description: item.content || '',
            skills: [],
            technologies: [],
            keywords: [],
          }));
        }
      } catch {}
    }
    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> { return null; }

  async applyToJob(params: ApplyParams): Promise<ApplyResult> {
    if (!this.page) return { success: false, steps: [], screenshots: [], error: 'Not initialized' };
    const steps: ApplyResult['steps'] = [];
    const screenshots: string[] = [];
    try {
      await this.page.goto(params.jobUrl, { waitUntil: 'networkidle' });
      await this.humanDelay(1500, 2500);

      // Fill Greenhouse form fields
      const fields = [
        { selector: 'input[name="first_name"]', value: params.userProfile.firstName as string },
        { selector: 'input[name="last_name"]', value: params.userProfile.lastName as string },
        { selector: 'input[name="email"]', value: params.userProfile.email as string },
        { selector: 'input[name="phone"]', value: params.userProfile.phone as string },
        { selector: 'textarea[name="cover_letter"]', value: params.coverLetter || '' },
      ];

      for (const field of fields) {
        const el = await this.page.$(field.selector);
        if (el && field.value) {
          await el.fill(field.value);
          await this.humanDelay(200, 500);
        }
      }

      const resumeInput = await this.page.$('input[type="file"][name*="resume"]');
      if (resumeInput && params.resumeFilePath) {
        await resumeInput.setInputFiles(params.resumeFilePath);
        await this.humanDelay(1000, 2000);
        steps.push({ name: 'Upload Resume', status: 'completed', timestamp: new Date() });
      }

      const screenshot = await this.page.screenshot({ encoding: 'base64' });
      screenshots.push(`data:image/png;base64,${screenshot}`);
      steps.push({ name: 'Form Filled - Ready for Review', status: 'completed', timestamp: new Date() });

      return { success: true, steps, screenshots, applicationId: 'pending-review' };
    } catch (err) {
      return { success: false, steps, screenshots, error: err.message };
    }
  }

  async cleanup(): Promise<void> {
    await this.page?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
  }
}
