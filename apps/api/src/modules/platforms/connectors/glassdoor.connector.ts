import { BaseConnector, JobSearchParams, ScrapedJob, ApplyParams, ApplyResult, PlatformCredentials } from '../base.connector';
import type { Browser, BrowserContext, Page } from 'playwright';

export class GlassdoorConnector extends BaseConnector {
  readonly platformName = 'glassdoor';
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(account: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright') as typeof import('playwright');
    this.browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== 'false', args: ['--no-sandbox'] });
    this.context = await this.browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (account.cookieData) { try { await this.context.addCookies(JSON.parse(account.cookieData)); } catch {} }
    this.page = await this.context.newPage();
  }

  async login(credentials: PlatformCredentials): Promise<boolean> { return false; }
  async isSessionValid(): Promise<boolean> { return false; }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    if (!this.page) return [];
    const role = encodeURIComponent(params.roles[0] || '');
    const location = encodeURIComponent(params.locations[0] || '');
    await this.page.goto(`https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${role}&locT=N&locKeyword=${location}&jobType=&fromAge=-1&minSalary=0&includeNoSalaryJobs=true&radius=25&cityId=-1&minRating=0.0&industryId=-1&sgocId=-1&seniorityType=all&companyId=-1&employerSizes=0&applicationType=0&remoteWorkType=0`, { waitUntil: 'networkidle' });
    await this.humanDelay(2000, 4000);

    const cards = await this.page.$$('[data-test="jobListing"]');
    const jobs: ScrapedJob[] = [];
    for (const card of cards.slice(0, params.limit || 15)) {
      try {
        const data = await card.evaluate((el) => ({
          externalId: el.getAttribute('data-id') || '',
          externalUrl: (el.querySelector('a[href*="/job-listing/"]') as HTMLAnchorElement)?.href || '',
          title: el.querySelector('[data-test="job-title"]')?.textContent?.trim() || '',
          company: el.querySelector('[data-test="employer-name"]')?.textContent?.trim() || '',
          location: el.querySelector('[data-test="emp-location"]')?.textContent?.trim() || '',
        }));
        if (data.title) jobs.push(this.normalizeJobData({ ...data, description: '', skills: [], technologies: [], keywords: [] }));
      } catch {}
    }
    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> { return null; }
  async applyToJob(params: ApplyParams): Promise<ApplyResult> {
    return { success: false, steps: [], screenshots: [], error: 'Glassdoor redirects to company ATS' };
  }
  async cleanup(): Promise<void> {
    await this.page?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
  }
}
