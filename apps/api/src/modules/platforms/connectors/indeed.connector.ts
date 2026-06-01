import type { Browser, BrowserContext, Page } from 'playwright';
import {
  BaseConnector, JobSearchParams, ScrapedJob,
  ApplyParams, ApplyResult, PlatformCredentials,
} from '../base.connector';

export class IndeedConnector extends BaseConnector {
  readonly platformName = 'indeed';
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(account: { encryptedCredentials?: string | null; cookieData?: string | null }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright') as typeof import('playwright');
    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });
    if (account.cookieData) {
      try { await this.context.addCookies(JSON.parse(account.cookieData)); } catch {}
    }
    this.page = await this.context.newPage();
  }

  async login(credentials: PlatformCredentials): Promise<boolean> {
    if (!this.page) return false;
    await this.page.goto('https://secure.indeed.com/account/login', { waitUntil: 'networkidle' });
    await this.humanDelay(1000, 2000);
    await this.page.fill('input[name="__email"]', credentials.username as string);
    await this.humanDelay(400, 800);
    await this.page.click('button[type="submit"]');
    await this.humanDelay(1000, 2000);
    await this.page.fill('input[name="__password"]', credentials.password as string);
    await this.humanDelay(400, 800);
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    this.isLoggedIn = await this.isSessionValid();
    return this.isLoggedIn;
  }

  async isSessionValid(): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.goto('https://www.indeed.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
      return !(await this.page.$('[href*="login"]'));
    } catch { return false; }
  }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    if (!this.page) return [];
    const jobs: ScrapedJob[] = [];

    for (const role of params.roles.slice(0, 2)) {
      const location = params.locations[0] || '';
      const remote = params.workModes.includes('REMOTE') ? '&remotejob=1' : '';
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}${remote}&sort=date`;

      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.humanDelay(2000, 3000);

      const cards = await this.page.$$('[data-jk]');
      for (const card of cards.slice(0, params.limit || 20)) {
        try {
          const data = await card.evaluate((el) => {
            const jk = el.getAttribute('data-jk') || '';
            const title = el.querySelector('[data-testid="job-title"]')?.textContent?.trim() || '';
            const company = el.querySelector('[data-testid="company-name"]')?.textContent?.trim() || '';
            const location = el.querySelector('[data-testid="job-location"]')?.textContent?.trim() || '';
            const salary = el.querySelector('.salary-snippet-container')?.textContent?.trim() || '';
            return { jk, title, company, location, salary };
          });
          if (!data.jk || !data.title) continue;
          jobs.push(this.normalizeJobData({
            externalId: data.jk,
            externalUrl: `https://www.indeed.com/viewjob?jk=${data.jk}`,
            title: data.title,
            company: data.company,
            location: data.location,
            description: '',
            skills: [],
            technologies: [],
            keywords: [],
          }));
        } catch {}
      }
      await this.delay(parseInt(process.env.AUTOMATION_RATE_LIMIT_MS || '2000'));
    }
    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> {
    if (!this.page) return null;
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await this.humanDelay(1500, 2500);
    try {
      return await this.page.evaluate((pageUrl) => {
        const title = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() || '';
        const company = document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
        const description = document.querySelector('#jobDescriptionText')?.textContent?.trim() || '';
        const jk = new URL(pageUrl).searchParams.get('jk') || '';
        return { externalId: jk, externalUrl: pageUrl, title, company, description, skills: [], technologies: [], keywords: [] };
      }, url);
    } catch { return null; }
  }

  async applyToJob(params: ApplyParams): Promise<ApplyResult> {
    // Indeed application flow varies - typically redirects to company ATS
    return { success: false, steps: [], screenshots: [], error: 'Indeed requires manual application - use the apply URL' };
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close().catch(() => {});
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});
  }
}
