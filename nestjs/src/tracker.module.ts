import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ERROR_TRACKER_OPTIONS } from './constants';
import { ErrorTrackerService } from './tracker.service';
import type {
  ErrorTrackerModuleOptions,
  ErrorTrackerModuleAsyncOptions,
  ErrorTrackerOptionsFactory,
} from './types';

@Module({})
export class ErrorTrackerModule {
  static forRoot(options: ErrorTrackerModuleOptions): DynamicModule {
    return {
      module: ErrorTrackerModule,
      global: true,
      providers: [
        {
          provide: ERROR_TRACKER_OPTIONS,
          useValue: options,
        },
        ErrorTrackerService,
      ],
      exports: [ErrorTrackerService],
    };
  }

  static forRootAsync(options: ErrorTrackerModuleAsyncOptions): DynamicModule {
    return {
      module: ErrorTrackerModule,
      global: true,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        ErrorTrackerService,
      ],
      exports: [ErrorTrackerService],
    };
  }

  private static createAsyncProviders(
    options: ErrorTrackerModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<ErrorTrackerOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ErrorTrackerModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: ERROR_TRACKER_OPTIONS,
        useFactory: options.useFactory,
        inject: (options.inject || []) as any[],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<ErrorTrackerOptionsFactory>,
    ];

    return {
      provide: ERROR_TRACKER_OPTIONS,
      useFactory: async (optionsFactory: ErrorTrackerOptionsFactory) =>
        await optionsFactory.createErrorTrackerOptions(),
      inject,
    };
  }
}
