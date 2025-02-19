import { Module, DynamicModule, Provider, OnApplicationShutdown, Inject } from '@nestjs/common';
import { RedisModuleOptions, RedisModuleAsyncOptions, RedisClients } from './interfaces';
import { RedisManager } from './redis-manager';
import {
    createOptionsProvider,
    createAsyncProviders,
    createRedisClientProviders,
    redisClientsProvider
} from './redis.providers';
import { REDIS_OPTIONS, REDIS_CLIENTS } from './redis.constants';
import { quitClients } from './common';
import { MISSING_CONFIGURATION } from '@/messages';
import { parseNamespace, isResolution, isRejection, isError } from '@/utils';
import { logger } from './redis-logger';
import { MissingConfigurationError } from '@/errors';

/**
 * @public
 */
@Module({})
export class RedisModule implements OnApplicationShutdown {
    constructor(
        @Inject(REDIS_OPTIONS) private readonly options: RedisModuleOptions,
        @Inject(REDIS_CLIENTS) private readonly clients: RedisClients
    ) {}

    /**
     * Registers the module synchronously.
     */
    static forRoot(options: RedisModuleOptions = {}, isGlobal = true): DynamicModule {
        const redisClientProviders = createRedisClientProviders();
        const providers: Provider[] = [
            createOptionsProvider(options),
            redisClientsProvider,
            RedisManager,
            ...redisClientProviders
        ];

        return {
            global: isGlobal,
            module: RedisModule,
            providers,
            exports: [RedisManager, ...redisClientProviders]
        };
    }

    /**
     * Registers the module asynchronously.
     */
    static forRootAsync(options: RedisModuleAsyncOptions, isGlobal = true): DynamicModule {
        if (!options.useFactory && !options.useClass && !options.useExisting) {
            throw new MissingConfigurationError(MISSING_CONFIGURATION);
        }

        const redisClientProviders = createRedisClientProviders();
        const providers: Provider[] = [
            ...createAsyncProviders(options),
            redisClientsProvider,
            RedisManager,
            ...redisClientProviders,
            ...(options.extraProviders ?? [])
        ];

        return {
            global: isGlobal,
            module: RedisModule,
            imports: options.imports,
            providers,
            exports: [RedisManager, ...redisClientProviders]
        };
    }

    async onApplicationShutdown(): Promise<void> {
        if (this.options.closeClient) {
            const result = await quitClients(this.clients);
            result.forEach(([namespace, quit]) => {
                if (isResolution(namespace) && isRejection(quit) && isError(quit.reason)) {
                    logger.error(`${parseNamespace(namespace.value)}: ${quit.reason.message}`);
                }
            });
        }
    }
}
