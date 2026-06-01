import type { Browser, BrowserContext, Page } from 'playwright';
import {
  BaseConnector, JobSearchParams, ScrapedJob,
  ApplyParams, ApplyResult, PlatformCredentials,
  STEALTH_INIT_SCRIPT,
} from '../base.connector';

export class NaukriConnector extends BaseConnector {
  readonly platformName = 'naukri';
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(account: { encryptedCredentials?: string | null; cookieData?: string | null }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright') as typeof import('playwright');

    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-infobars',
      ],
    });

    this.context = await this.browser.newContext({
      userAgent: this.randomUserAgent(),
      viewport: this.randomViewport(),
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not-A.Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });

    await this.applyStealthToContext(this.context);

    if (account.cookieData) {
      try {
        const cookies = JSON.parse(account.cookieData);
        await this.context.addCookies(cookies);
      } catch {}
    }

    this.page = await this.context.newPage();
  }

  async login(credentials: PlatformCredentials): Promise<boolean> {
    if (!this.page) return false;

    await this.page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay(1500, 3000);

    if (await this.detectCaptcha(this.page)) {
      throw new Error('CAPTCHA detected on Naukri login — manual intervention required');
    }

    // Try multiple selector variations (Naukri changes DOM frequently)
    const emailSelectors = ['#usernameField', 'input[placeholder*="Email"]', 'input[type="email"]'];
    const passSelectors  = ['#passwordField', 'input[placeholder*="Password"]', 'input[type="password"]'];
    const submitSelectors = ['button[type="submit"].loginButton', 'button[type="submit"]', '.loginButton'];

    for (const sel of emailSelectors) {
      const el = await this.page.$(sel);
      if (el) { await this.typeWithDelay(this.page, sel, credentials.username as string); break; }
    }
    await this.humanDelay(400, 800);

    for (const sel of passSelectors) {
      const el = await this.page.$(sel);
      if (el) { await this.typeWithDelay(this.page, sel, credentials.password as string); break; }
    }
    await this.humanDelay(600, 1200);

    for (const sel of submitSelectors) {
      const el = await this.page.$(sel);
      if (el) { await this.moveAndClick(this.page, sel); break; }
    }

    try {
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {}

    if (await this.detectCaptcha(this.page)) {
      throw new Error('Security challenge after Naukri login — manual verification required');
    }

    this.isLoggedIn = await this.isSessionValid();
    return this.isLoggedIn;
  }

  async isSessionValid(): Promise<boolean> {
    if (!this.context) return false;
    try {
      const cookies = await this.context.cookies();
      // Naukri auth cookies
      return cookies.some((c) => ['nauk_at', 'nkz', 'NKWF', 'nk_session'].includes(c.name));
    } catch {
      return false;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    if (!this.page) return [];

    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    for (const role of params.roles.slice(0, 3)) {
      const location = params.locations[0] || '';
      const slug = role.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const locSlug = location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const url = locSlug
        ? `https://www.naukri.com/${slug}-jobs-in-${locSlug}`
        : `https://www.naukri.com/${slug}-jobs`;

      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.humanDelay(2000, 4000);

      if (await this.detectCaptcha(this.page)) {
        throw new Error('CAPTCHA on Naukri job search');
      }

      await this.humanScroll(this.page, 600);
      await this.humanDelay(1000, 2000);

      // Naukri uses multiple card formats across A/B tests
      const cardSelectors = [
        'article.jobTuple',
        '.srp-jobtuple-wrapper',
        '.job-container',
        '[class*="jobTuple"]',
      ];

      let cards: any[] = [];
      for (const sel of cardSelectors) {
        cards = await this.page.$$(sel);
        if (cards.length > 0) break;
      }

      for (const card of cards.slice(0, params.limit || 20)) {
        try {
          const data = await card.evaluate((el: Element) => {
            const titleEl  = el.querySelector('a.title, .row1 a, a[class*="title"], .jobTitle a') as HTMLAnchorElement;
            const compEl   = el.querySelector('.companyInfo a, .comp-name, [class*="companyName"]');
            const locEl    = el.querySelector('.location span, .locWdth, [class*="location"]');
            const jobId    = el.getAttribute('data-job-id')
              || titleEl?.href?.match(/\-(\d+)\.htm/)?.[1]
              || titleEl?.href?.match(/(\d+)/)?.[1]
              || '';
            return {
              externalId: jobId,
              externalUrl: titleEl?.href || '',
              title: titleEl?.textContent?.trim() || '',
              company: compEl?.textContent?.trim() || '',
              location: locEl?.textContent?.trim() || '',
            };
          });

          if (!data.title || !data.externalId || seen.has(data.externalId)) continue;
          seen.add(data.externalId);
          jobs.push(this.normalizeJobData({ ...data, description: '', skills: [], technologies: [], keywords: [] }));
          await this.humanDelay(100, 300);
        } catch {}
      }

      await this.humanDelay(
        parseInt(process.env.AUTOMATION_RATE_LIMIT_MS || '2500'),
        parseInt(process.env.AUTOMATION_RATE_LIMIT_MS || '2500') + 2000,
      );
    }

    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> {
    if (!this.page) return null;

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay(1500, 2500);
    if (await this.detectCaptcha(this.page)) return null;

    try {
      const data = await this.page.evaluate(() => {
        const title    = document.querySelector('.jd-header-title, h1.jd-header')?.textContent?.trim() || '';
        const company  = document.querySelector('.jd-header-comp-name a, .comp-name')?.textContent?.trim() || '';
        const location = document.querySelector('.location .location, .comp-info-detail .info-icon')?.textContent?.trim() || '';
        const desc     = document.querySelector('#job_description .dang-inner-html, .job-desc')?.textContent?.trim() || '';
        const jobId    = window.location.pathname.match(/\-(\d+)\.htm/)?.[1] || '';
        return { title, company, location, description: desc, jobId };
      });

      return this.normalizeJobData({
        externalId: data.jobId,
        externalUrl: url,
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        skills: this.extractSkillsFromText(data.description),
        technologies: this.extractTechnologiesFromText(data.description),
        keywords: this.extractKeywordsFromText(data.description),
      });
    } catch {
      return null;
    }
  }

  async applyToJob(params: ApplyParams): Promise<ApplyResult> {
    if (!this.page) return { success: false, steps: [], screenshots: [], error: 'Not initialized' };

    const steps: ApplyResult['steps'] = [];
    const screenshots: string[] = [];

    try {
      await this.page.goto(params.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.humanDelay(2000, 3500);

      if (await this.detectCaptcha(this.page)) {
        return { success: false, steps, screenshots, error: 'CAPTCHA detected on job page' };
      }

      screenshots.push(await this._screenshot());
      steps.push({ name: 'Job page loaded', status: 'completed', timestamp: new Date() });

      // Expanded selector list covering Naukri's A/B test variants
      const applySelectors = [
        'button#apply-button',
        'button[id*="apply"]',
        '.apply-button',
        '[class*="applyBtn"]',
        '[class*="apply-btn"]',
        'button[class*="apply"]',
        '[data-ga-track*="apply"]',
        '[data-automation="apply-button"]',
        'a[href*="apply"]',
        'button:has-text("Apply")',
        'a:has-text("Apply Now")',
      ];

      let clicked = false;
      let clickedEl: any = null;
      for (const sel of applySelectors) {
        try {
          const btn = await this.page.$(sel);
          if (btn && await btn.isVisible()) {
            clickedEl = btn;
            await this.moveAndClick(this.page, sel);
            clicked = true;
            break;
          }
        } catch {}
      }

      if (!clicked) {
        screenshots.push(await this._screenshot());
        return { success: false, steps, screenshots, error: 'Apply button not found on Naukri job page' };
      }

      await this.humanDelay(1500, 2500);

      // Detect external redirect (company-hosted ATS)
      const afterUrl = this.page.url();
      if (!afterUrl.includes('naukri.com')) {
        steps.push({ name: 'Redirected to company site', status: 'completed', timestamp: new Date(), details: afterUrl });
        screenshots.push(await this._screenshot());
        return { success: true, steps, screenshots, applicationId: 'pending-review' };
      }

      // Post-click CAPTCHA check
      if (await this.detectCaptcha(this.page)) {
        screenshots.push(await this._screenshot());
        return { success: false, steps, screenshots, error: 'CAPTCHA appeared after clicking Apply' };
      }

      steps.push({ name: 'Application flow opened', status: 'completed', timestamp: new Date() });
      screenshots.push(await this._screenshot());

      // Check if a multi-step form or modal appeared
      const modalSelectors = [
        '[class*="apply-modal"]', '[class*="applyModal"]',
        '.apply-overlay', '[data-automation="apply-modal"]',
      ];
      let modalFound = false;
      for (const sel of modalSelectors) {
        if (await this.page.$(sel)) { modalFound = true; break; }
      }
      if (modalFound) {
        steps.push({ name: 'Application modal detected', status: 'completed', timestamp: new Date() });
      }

      return { success: true, steps, screenshots, applicationId: 'pending-review' };
    } catch (err: any) {
      steps.push({ name: 'Application error', status: 'failed', timestamp: new Date(), details: err.message });
      screenshots.push(await this._screenshot());
      return { success: false, steps, screenshots, error: err.message };
    }
  }

  async exportSessionCookies(): Promise<string | null> {
    if (!this.context) return null;
    try {
      return await this.saveSessionCookies(this.context);
    } catch {
      return null;
    }
  }

  async cleanup(): Promise<void> {
    await this.page?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  private async _screenshot(): Promise<string> {
    if (!this.page) return '';
    try {
      return (await this.page.screenshot({ type: 'png' })).toString('base64');
    } catch {
      return '';
    }
  }
}
