import type { ClientConfig } from '@royaltics/tracker';
import type { ModuleMetadata, Type } from '@nestjs/common';

export interface ErrorTrackerModuleOptions extends Omit<ClientConfig, 'platform'> {
  readonly captureRequests?: boolean;
  readonly captureResponses?: boolean;
  readonly captureHeaders?: boolean;
  readonly ignoredRoutes?: readonly string[];
  readonly ignoredErrors?: readonly string[];
}

export interface ErrorTrackerOptionsFactory {
  createErrorTrackerOptions(): Promise<ErrorTrackerModuleOptions> | ErrorTrackerModuleOptions;
}

export interface ErrorTrackerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  readonly useExisting?: Type<ErrorTrackerOptionsFactory>;
  readonly useClass?: Type<ErrorTrackerOptionsFactory>;
  readonly useFactory?: (...args: unknown[]) => Promise<ErrorTrackerModuleOptions> | ErrorTrackerModuleOptions;
  readonly inject?: unknown[];
}
