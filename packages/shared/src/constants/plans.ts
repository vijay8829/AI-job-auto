export const PLAN_LIMITS = {
  FREE: {
    applicationsPerMonth: 10,
    aiOptimizations: 3,
    resumeUploads: 2,
    platformConnections: 2,
    autoApply: false,
    analytics: false,
  },
  PRO: {
    applicationsPerMonth: 500,
    aiOptimizations: 100,
    resumeUploads: 20,
    platformConnections: 10,
    autoApply: true,
    analytics: true,
  },
  ENTERPRISE: {
    applicationsPerMonth: Infinity,
    aiOptimizations: Infinity,
    resumeUploads: Infinity,
    platformConnections: Infinity,
    autoApply: true,
    analytics: true,
  },
} as const;

export const PLAN_PRICES = {
  FREE: 0,
  PRO: 29,
  ENTERPRISE: 99,
} as const;

export const PLAN_FEATURES = {
  FREE: ['10 applications/month', 'AI resume parsing', '2 platform connections', 'Basic dashboard'],
  PRO: ['500 applications/month', 'AI auto-apply', 'Unlimited AI optimization', '10 platform connections', 'Advanced analytics', 'Cover letter generation'],
  ENTERPRISE: ['Unlimited applications', 'Full automation', 'Priority processing', 'All platforms', 'API access', 'Dedicated support'],
} as const;
