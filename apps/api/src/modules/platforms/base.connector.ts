// ================================================================
// Platform Connector Interface — Plugin Architecture
// All platform adapters must implement this interface.
// ================================================================

import type { Page, BrowserContext } from 'playwright';

export interface JobSearchParams {
  roles: string[];
  locations: string[];
  workModes: string[];
  skills: string[];
  keywords?: string[];
  salaryMin?: number;
  salaryMax?: number;
  employmentTypes?: string[];
  experienceLevels?: string[];
  limit?: number;
}

export interface ScrapedJob {
  externalId: string;
  externalUrl: string;
  applyUrl?: string;
  title: string;
  company: string;
  companyLogoUrl?: string;
  location?: string;
  country?: string;
  workMode?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  skills: string[];
  technologies: string[];
  keywords: string[];
  postedAt?: Date;
  expiresAt?: Date;
  rawData?: Record<string, unknown>;
}

export interface ApplyParams {
  jobUrl: string;
  resumeFilePath: string;
  coverLetter?: string;
  answers?: Record<string, string>;
  userProfile: Record<string, unknown>;
  allowSubmit?: boolean;
}

export interface ApplyResult {
  success: boolean;
  applicationId?: string;
  screenshots: string[];
  steps: ApplyStep[];
  error?: string;
}

export interface ApplyStep {
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  timestamp: Date;
  details?: string;
  screenshot?: string;
}

export interface PlatformCredentials {
  username?: string;
  password?: string;
  accessToken?: string;
  cookieData?: string;
  [key: string]: unknown;
}

// ── Stealth constants ──────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
];

// Comprehensive anti-detection init script injected into every page
export const STEALTH_INIT_SCRIPT = `
  // Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  delete navigator.__proto__.webdriver;

  // Spoof Chrome runtime
  window.chrome = {
    app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
    runtime: {
      OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
      RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
    },
  };

  // Spoof plugins (real Chrome has plugins)
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 2 },
      ];
      plugins.item = (i) => plugins[i];
      plugins.namedItem = (name) => plugins.find(p => p.name === name);
      plugins.refresh = () => {};
      return plugins;
    },
  });

  // Spoof languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
  Object.defineProperty(navigator, 'language', { get: () => 'en-US', configurable: true });

  // Fix permissions query
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = (params) => {
      if (params.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery.call(window.navigator.permissions, params);
    };
  }

  // Spoof hardware concurrency (typical desktop value)
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

  // Canvas fingerprint noise — adds tiny imperceptible variation per session
  const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
      const noise = Math.floor(Math.random() * 3);
      if (imageData.data.length > 0) imageData.data[0] = (imageData.data[0] + noise) % 256;
      ctx.putImageData(imageData, 0, 0);
    }
    return _toDataURL.apply(this, [type, quality]);
  };

  // Audio context fingerprint noise
  const _getChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(channel) {
    const arr = _getChannelData.call(this, channel);
    if (arr.length > 0) arr[0] = arr[0] + Math.random() * 0.0001 - 0.00005;
    return arr;
  };

  // Prevent headless detection via WebGL — spoof vendor/renderer
  const _getParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.';
    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
    return _getParam.call(this, parameter);
  };
  const _getParam2 = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.';
    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
    return _getParam2.call(this, parameter);
  };

  // Screen dimensions — match viewport so they're consistent
  Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
  Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight });

  // Prevent automation detection via timing checks
  const _now = Date.now;
  Date.now = function() { return _now() + Math.floor(Math.random() * 3); };
`;

export abstract class BaseConnector {
  protected credentials: PlatformCredentials = {};
  protected isLoggedIn = false;
  abstract readonly platformName: string;

  abstract initialize(account: { encryptedCredentials?: string | null; cookieData?: string | null; accessToken?: string | null }): Promise<void>;
  abstract login(credentials: PlatformCredentials): Promise<boolean>;
  abstract searchJobs(params: JobSearchParams): Promise<ScrapedJob[]>;
  abstract parseJob(url: string): Promise<ScrapedJob | null>;
  abstract applyToJob(params: ApplyParams): Promise<ApplyResult>;
  abstract isSessionValid(): Promise<boolean>;

  cleanup?(): Promise<void>;
  handleCaptcha?(imageBase64: string): Promise<string>;
  uploadResume?(filePath: string): Promise<string>;
  exportSessionCookies?(): Promise<string | null>;

  // ── Timing helpers ─────────────────────────────────────────────────────────

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected humanDelay(min = 500, max = 2000): Promise<void> {
    // Gaussian-ish distribution: weighted toward centre of range
    const jitter = Math.random() * 0.3 * (max - min);
    return this.delay(min + Math.random() * (max - min) * 0.7 + jitter);
  }

  // ── Stealth helpers ─────────────────────────────────────────────────────────

  protected randomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  protected randomViewport() {
    return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  }

  // Type text character-by-character with human-like delays
  protected async typeWithDelay(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    await this.humanDelay(100, 300);
    // Clear first
    await page.fill(selector, '');
    await this.humanDelay(50, 150);
    for (const char of text) {
      await page.keyboard.type(char, { delay: 30 + Math.random() * 120 });
    }
    await this.humanDelay(100, 200);
  }

  // Move mouse along a Bezier curve to target, then click — defeats linear-movement detection
  protected async moveAndClick(page: Page, selector: string): Promise<void> {
    const el = await page.$(selector);
    if (!el) return;
    const box = await el.boundingBox();
    if (!box) { await el.click(); return; }

    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Generate Bezier control points from current estimated position
    const startX = targetX - 200 + Math.random() * 400;
    const startY = targetY - 200 + Math.random() * 400;
    const cp1x = startX + (targetX - startX) * 0.25 + (Math.random() - 0.5) * 100;
    const cp1y = startY + (targetY - startY) * 0.25 + (Math.random() - 0.5) * 100;
    const cp2x = startX + (targetX - startX) * 0.75 + (Math.random() - 0.5) * 80;
    const cp2y = startY + (targetY - startY) * 0.75 + (Math.random() - 0.5) * 80;

    const steps = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      // Cubic Bezier formula
      const x = u**3 * startX + 3*u**2*t * cp1x + 3*u*t**2 * cp2x + t**3 * targetX;
      const y = u**3 * startY + 3*u**2*t * cp1y + 3*u*t**2 * cp2y + t**3 * targetY;
      await page.mouse.move(x, y);
      await this.delay(8 + Math.random() * 15);
    }
    await this.humanDelay(60, 180);
    await page.mouse.click(targetX, targetY);
  }

  // Save browser session cookies for later restoration
  protected async saveSessionCookies(context: BrowserContext): Promise<string> {
    const cookies = await context.cookies();
    return JSON.stringify(cookies);
  }

  // Perform a human-like scroll on the page
  protected async humanScroll(page: Page, distance: number): Promise<void> {
    const steps = 4 + Math.floor(Math.random() * 4);
    const chunk = distance / steps;
    for (let i = 0; i < steps; i++) {
      await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), chunk + (Math.random() - 0.5) * 30);
      await this.delay(60 + Math.random() * 120);
    }
  }

  // Run an operation with an AbortSignal-based timeout — prevents stuck automation
  withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms),
      ),
    ]);
  }

  // Detect common CAPTCHA patterns on a page
  protected async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.g-recaptcha',
      '#cf-challenge-running',
      '[data-sitekey]',
      'input[name="captcha"]',
      'div[class*="captcha"]',
    ];
    for (const sel of captchaSelectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) return true;
    }
    const title = await page.title().catch(() => '');
    if (/captcha|challenge|verify|cloudflare|blocked/i.test(title)) return true;
    return false;
  }

  // Apply stealth init script to a context
  protected async applyStealthToContext(context: BrowserContext): Promise<void> {
    await context.addInitScript(STEALTH_INIT_SCRIPT);
  }

  // ── Data helpers ───────────────────────────────────────────────────────────

  protected normalizeJobData(raw: Partial<ScrapedJob>): ScrapedJob {
    return {
      externalId: raw.externalId || '',
      externalUrl: raw.externalUrl || '',
      title: raw.title || '',
      company: raw.company || '',
      description: raw.description || '',
      skills: raw.skills || [],
      technologies: raw.technologies || [],
      keywords: raw.keywords || [],
      ...raw,
    };
  }

  protected extractSkillsFromText(text: string): string[] {
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
      'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL', 'PostgreSQL', 'MongoDB',
      'Redis', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Swift', 'Kotlin',
    ];
    return skillKeywords.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(text));
  }

  protected extractTechnologiesFromText(text: string): string[] {
    const techKeywords = [
      'React', 'Vue', 'Angular', 'Next.js', 'NestJS', 'FastAPI', 'Django',
      'Spring', 'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform',
      'GitHub Actions', 'CircleCI', 'Jenkins',
    ];
    return techKeywords.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(text));
  }

  protected extractKeywordsFromText(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set(['that', 'this', 'with', 'from', 'will', 'have', 'been', 'your', 'they', 'their', 'what', 'when', 'where', 'which', 'work', 'team']);
    const frequency: Record<string, number> = {};
    words.filter((w) => !stopWords.has(w)).forEach((w) => { frequency[w] = (frequency[w] || 0) + 1; });
    return Object.entries(frequency)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }
}
