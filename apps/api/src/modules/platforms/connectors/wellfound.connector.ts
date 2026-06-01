import { BaseConnector, JobSearchParams, ScrapedJob, ApplyParams, ApplyResult, PlatformCredentials } from '../base.connector';

export class WellfoundConnector extends BaseConnector {
  readonly platformName = 'wellfound';

  async initialize(account: any): Promise<void> {}
  async login(credentials: PlatformCredentials): Promise<boolean> { return false; }
  async isSessionValid(): Promise<boolean> { return false; }

  async searchJobs(params: JobSearchParams): Promise<ScrapedJob[]> {
    // Wellfound has a public API endpoint for job listings
    // Use axios to call their API (no Playwright needed for basic search)
    const axios = require('axios');
    const jobs: ScrapedJob[] = [];
    try {
      const role = params.roles[0] || 'software engineer';
      const response = await axios.get('https://wellfound.com/api/jobs', {
        params: { q: role, location: params.locations[0] || '', per_page: params.limit || 20 },
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const items = response.data?.jobs || response.data?.data || [];
      for (const item of items) {
        jobs.push(this.normalizeJobData({
          externalId: String(item.id || item.slug),
          externalUrl: `https://wellfound.com/jobs/${item.slug || item.id}`,
          title: item.title || item.job_type || '',
          company: item.startup?.name || item.company || '',
          location: item.locations?.[0] || item.location || 'Remote',
          description: item.description || '',
          workMode: item.remote ? 'REMOTE' : undefined,
          skills: item.skills?.map((s: any) => s.name || s) || [],
          technologies: [],
          keywords: [],
        }));
      }
    } catch {}
    return jobs;
  }

  async parseJob(url: string): Promise<ScrapedJob | null> { return null; }
  async applyToJob(params: ApplyParams): Promise<ApplyResult> {
    return { success: false, steps: [], screenshots: [], error: 'Wellfound applications require account connection' };
  }
}
