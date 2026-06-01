import type { Browser, BrowserContext, Page } from 'playwright';
import {
  BaseConnector, JobSearchParams, ScrapedJob,
  ApplyParams, ApplyResult, PlatformCredentials,
  STEALTH_INIT_SCRIPT,
} from '../base.connector';

export class LinkedInConnector extends BaseConnector {
  readonly platformName = 'linkedin';
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
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--hide-scrollbars',
        '--mute-audio',
        '--disable-infobars',
      ],
    });

    const viewport = this.randomViewport();
    this.context = await this.browser.newContext({
      userAgent: this.randomUserAgent(),
      viewport,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not-A.Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });

    // Inject comprehensive stealth script into every page in this context
    await this.applyStealthToContext(this.context);

    // Restore session cookies if available
    if (account.cookieData) {
      try {
        const cookies = JSON.parse(account.cookieData);
        await this.context.addCookies(cookies);
      } catch {}
    }

    this.page = await this.context.newPage();
  }

  async login(credentials: PlatformCredentials): Promise<boolean> {
    if (!this.page) throw new Error('Connector not initialized');

    await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay(1500, 3000);

    if (await this.detectCaptcha(this.page)) {
      throw new Error('CAPTCHA detected on login page — manual intervention required');
    }

    await this.typeWithDelay(this.page, '#username', credentials.username as string);
    await this.humanDelay(400, 900);
    await this.typeWithDelay(this.page, '#password', credentials.password as string);
    await this.humanDelay(600, 1200);
    await this.moveAndClick(this.page, '[data-litms-control-urn="login-submit"], button[type="submit"]');

    try {
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {}

    if (await this.detectCaptcha(this.page)) {
      throw new Error('Security challenge detected after login — manual verification required');
    }

    this.isLoggedIn = await this.isSessionValid();
    return this.isLoggedIn;
  }

  async isSessionValid(): Promise<boolean> {
    if (!this.context) return false;
    try {
      const cookies = await this.context.cookies();
      // li_at is LinkedIn's primary auth cookie; liap is the mobile equivalent
      return cookies.some((c) => ['li_at', 'liap'].includes(c.name));
    } catch {
      return false;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Connector not initialized');

    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    for (const role of params.roles.slice(0, 3)) {
      const location = params.locations[0] || '';
      const remote = params.workModes.includes('REMOTE') ? '&f_WT=2' : '';
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}${remote}&sortBy=DD&f_TPR=r86400`;

      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.humanDelay(2000, 4000);

      if (await this.detectCaptcha(this.page)) {
        throw new Error('CAPTCHA detected during job search');
      }

      await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' }));
      await this.humanDelay(1200, 2000);
      await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      await this.humanDelay(800, 1500);

      const cards = await this.page.$$('.job-search-card, .jobs-search__results-list li, [data-job-id]');

      for (const card of cards.slice(0, params.limit || 20)) {
        try {
          const job = await card.evaluate((el) => {
            const titleEl = el.querySelector('.job-search-card__title, .job-card-list__title');
            const companyEl = el.querySelector('.job-search-card__company-name, .job-card-container__company-name');
            const locationEl = el.querySelector('.job-search-card__location, .job-card-container__metadata-item');
            const linkEl = el.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement;
            const dateEl = el.querySelector('time');
            return {
              title: titleEl?.textContent?.trim() || '',
              company: companyEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              url: linkEl?.href || '',
              postedAt: dateEl?.getAttribute('datetime') || null,
            };
          });

          if (!job.url || !job.title) continue;
          const jobId = job.url.match(/\/jobs\/view\/(\d+)/)?.[1];
          if (!jobId || seen.has(jobId)) continue;
          seen.add(jobId);

          jobs.push(this.normalizeJobData({
            externalId: jobId,
            externalUrl: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
            description: '',
            skills: [],
            technologies: [],
            keywords: [],
          }));

          await this.humanDelay(150, 400);
        } catch {}
      }

      await this.humanDelay(
        parseInt(process.env.AUTOMATION_RATE_LIMIT_MS || '2000'),
        parseInt(process.env.AUTOMATION_RATE_LIMIT_MS || '2000') + 2000,
      );
    }

    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> {
    if (!this.page) return null;

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay(1500, 3000);
    if (await this.detectCaptcha(this.page)) return null;

    try {
      const data = await this.page.evaluate(() => {
        const title = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() || '';
        const company = document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.textContent?.trim() || '';
        const location = document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() || '';
        const description = document.querySelector('.jobs-description__content')?.textContent?.trim() || '';
        const jobId = window.location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || '';
        return { title, company, location, description, jobId };
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
    if (!this.page) throw new Error('Connector not initialized');

    const steps: ApplyResult['steps'] = [];
    const screenshots: string[] = [];

    try {
      await this.page.goto(params.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.humanDelay(2000, 3500);

      if (await this.detectCaptcha(this.page)) {
        return { success: false, steps, screenshots, error: 'CAPTCHA detected — cannot auto-apply' };
      }

      // Find Easy Apply button
      const easyApplySelectors = [
        'button[aria-label*="Easy Apply"]',
        'button[aria-label*="easy apply"]',
        '.jobs-apply-button--top-card',
        '.jobs-s-apply button',
        '[data-control-name="jobdetails_topcard_inapply"]',
        'button.jobs-apply-button',
        '.jobs-unified-top-card__button-apply',
      ];
      let clicked = false;
      for (const sel of easyApplySelectors) {
        try {
          const btn = await this.page.$(sel);
          if (btn && await btn.isVisible()) {
            await this.moveAndClick(this.page, sel);
            clicked = true;
            break;
          }
        } catch {}
      }

      if (!clicked) {
        return { success: false, steps, screenshots, error: 'Easy Apply not available for this job' };
      }

      await this.humanDelay(1500, 2500);
      steps.push({ name: 'Open Application Modal', status: 'completed', timestamp: new Date() });
      screenshots.push(await this.captureScreenshot());

      let stepCount = 0;
      const maxSteps = 12;

      while (stepCount < maxSteps) {
        stepCount++;

        const modal = await this.page.$('.jobs-easy-apply-content');
        if (!modal) break;

        // Fill phone
        const phoneInput = await this.page.$('input[id*="phoneNumber"]');
        if (phoneInput && params.userProfile.phone) {
          const val = await phoneInput.inputValue();
          if (!val) await this.typeWithDelay(this.page, 'input[id*="phoneNumber"]', params.userProfile.phone as string);
        }

        // Custom answers
        if (params.answers) {
          for (const [key, answer] of Object.entries(params.answers)) {
            try {
              const textEl = await this.page.$(`input[id*="${key}"], textarea[id*="${key}"]`);
              const selectEl = await this.page.$(`select[id*="${key}"]`);
              if (selectEl) await selectEl.selectOption({ label: answer }).catch(() => {});
              else if (textEl) await this.typeWithDelay(this.page, `input[id*="${key}"], textarea[id*="${key}"]`, answer);
              await this.humanDelay(150, 400);
            } catch {}
          }
        }

        // Resume upload
        const resumeInput = await this.page.$('input[type="file"]');
        if (resumeInput && params.resumeFilePath) {
          await resumeInput.setInputFiles(params.resumeFilePath);
          await this.humanDelay(1500, 2500);
          steps.push({ name: `Step ${stepCount}: Resume Uploaded`, status: 'completed', timestamp: new Date() });
        }

        // Cover letter
        const coverEl = await this.page.$('textarea[id*="coverLetter"]');
        if (coverEl && params.coverLetter) {
          const val = await coverEl.inputValue();
          if (!val) await this.typeWithDelay(this.page, 'textarea[id*="coverLetter"]', params.coverLetter);
        }

        screenshots.push(await this.captureScreenshot());

        const submitBtn = await this.page.$('button[aria-label="Submit application"]');
        const reviewBtn = await this.page.$('button[aria-label="Review your application"]');
        const nextBtn = await this.page.$('button[aria-label="Continue to next step"]');

        if (submitBtn) {
          if (params.allowSubmit) {
            await this.moveAndClick(this.page, 'button[aria-label="Submit application"]');
            await this.humanDelay(2000, 3500);
            // Dismiss the post-submit "Your application was sent" dialog if it appears
            const dismissBtn = await this.page.$('button[aria-label="Dismiss"], .artdeco-modal__dismiss').catch(() => null);
            if (dismissBtn) await dismissBtn.click().catch(() => {});
            steps.push({ name: `Step ${stepCount}: Application Submitted`, status: 'completed', timestamp: new Date() });
            screenshots.push(await this.captureScreenshot());
            return { success: true, steps, screenshots };
          }
          steps.push({ name: `Step ${stepCount}: Ready to Submit`, status: 'completed', timestamp: new Date() });
          return { success: true, steps, screenshots, applicationId: 'pending-review' };
        }

        if (reviewBtn) {
          await this.moveAndClick(this.page, 'button[aria-label="Review your application"]');
        } else if (nextBtn) {
          await this.moveAndClick(this.page, 'button[aria-label="Continue to next step"]');
        } else {
          break;
        }

        await this.humanDelay(1000, 2000);
        steps.push({ name: `Step ${stepCount}: Completed`, status: 'completed', timestamp: new Date() });
      }

      return { success: true, steps, screenshots };
    } catch (error: any) {
      steps.push({ name: 'Application Error', status: 'failed', timestamp: new Date(), details: error.message });
      return { success: false, steps, screenshots, error: error.message };
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

  private async captureScreenshot(): Promise<string> {
    if (!this.page) return '';
    try {
      const buf = await this.page.screenshot({ type: 'png', fullPage: false });
      return buf.toString('base64');
    } catch {
      return '';
    }
  }
}
