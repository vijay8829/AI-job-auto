import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@ai-job/database';

export type UsageLimitKey = 'applications' | 'aiOptimizations' | 'resumeUploads' | 'platformConnections';

export const CheckUsageLimit = (limit: UsageLimitKey) => SetMetadata('usageLimit', limit);

const LIMIT_MAP: Record<UsageLimitKey, { used: string; max: string; label: string }> = {
  applications:       { used: 'applicationsThisMonth', max: 'applicationsLimit',        label: 'Monthly application'        },
  aiOptimizations:    { used: 'aiOptimizationsUsed',   max: 'aiOptimizationsLimit',      label: 'AI optimization'            },
  resumeUploads:      { used: 'resumeUploads',         max: 'resumeUploadsLimit',         label: 'Resume upload'              },
  platformConnections:{ used: 'platformConnections',   max: 'platformConnectionsLimit',   label: 'Platform connection'        },
};

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitKey = this.reflector.get<UsageLimitKey>('usageLimit', context.getHandler());
    if (!limitKey) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.sub ?? request.user?.id;
    if (!userId) return true;

    const usage = await prisma.usageLimit.findUnique({ where: { userId } });
    if (!usage) return true;

    const { used, max, label } = LIMIT_MAP[limitKey];
    if ((usage as any)[used] >= (usage as any)[max]) {
      throw new ForbiddenException(
        `${label} limit reached (${(usage as any)[used]}/${(usage as any)[max]}). Upgrade your plan to continue.`,
      );
    }

    return true;
  }
}
