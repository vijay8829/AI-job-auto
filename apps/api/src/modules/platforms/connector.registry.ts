import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseConnector } from './base.connector';
import { LinkedInConnector } from './connectors/linkedin.connector';
import { IndeedConnector } from './connectors/indeed.connector';
import { NaukriConnector } from './connectors/naukri.connector';
import { GlassdoorConnector } from './connectors/glassdoor.connector';
import { WellfoundConnector } from './connectors/wellfound.connector';
import { GreenhouseConnector } from './connectors/greenhouse.connector';
import { LeverConnector } from './connectors/lever.connector';

@Injectable()
export class ConnectorRegistry implements OnModuleInit {
  private readonly logger = new Logger(ConnectorRegistry.name);
  private readonly connectors = new Map<string, new () => BaseConnector>();

  onModuleInit() {
    this.register('linkedin', LinkedInConnector);
    this.register('indeed', IndeedConnector);
    this.register('naukri', NaukriConnector);
    this.register('glassdoor', GlassdoorConnector);
    this.register('wellfound', WellfoundConnector);
    this.register('greenhouse', GreenhouseConnector);
    this.register('lever', LeverConnector);
    this.logger.log(`Registered ${this.connectors.size} platform connectors`);
  }

  register(platformName: string, ConnectorClass: new () => BaseConnector): void {
    this.connectors.set(platformName.toLowerCase(), ConnectorClass);
    this.logger.log(`Registered connector: ${platformName}`);
  }

  getConnector(platformName: string): BaseConnector | null {
    const ConnectorClass = this.connectors.get(platformName.toLowerCase());
    if (!ConnectorClass) return null;
    return new ConnectorClass();
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.connectors.keys());
  }

  isSupported(platformName: string): boolean {
    return this.connectors.has(platformName.toLowerCase());
  }
}
