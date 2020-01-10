import CacheManager, { Cache } from 'cache-manager';
import CacheManagerRedisStore from 'cache-manager-redis-store';
import Container from 'typedi';
import { AppConfig, InjectAppConfig } from './app-config';

let appCacheSingletonInstance: AppCache;

/**
 * 可依据缓存模块名进行 cache 参数设置, eg:
 *    LoginInfo 模块的 ttl 为 30 (分钟)
 */
export enum AppCacheKeyModule {
  LoginInfo = 'LOGIN_INFO',
  Default = 'DEFAULT',
}

type CacheValueObject = {
  [key: string]: string | string[] | number[];
}
export type AppCacheValue = string | string[] | CacheValueObject | CacheValueObject[]

export class AppCache {
  cache: Cache

  /**
   * TODO: 如何在 typedi 层面实现单例模式
   * TODO: memory && redis 共存时, 优先级策略的设置
   */
  constructor(
    @InjectAppConfig() private readonly config: AppConfig,
  ) {
    if (!appCacheSingletonInstance) {
      if (this.config.cache.memory && this.config.cache.redis) {
        this.cache = CacheManager.multiCaching([
          CacheManager.caching({ store: 'memory', ...this.config.cache.memory }),
          CacheManager.caching({
            store: CacheManagerRedisStore,
            ...this.config.cache.redis,
          }),
        ]);
      } else if (this.config.cache.memory && !this.config.cache.redis) {
        this.cache = CacheManager.caching({ store: 'memory', ...this.config.cache.memory });
      } else if (!this.config.cache.memory && this.config.cache.redis) {
        this.cache = CacheManager.caching({
          store: CacheManagerRedisStore,
          ...this.config.cache.redis,
        });
      } else { // Auth-Token 要求必须使用 cache 来缓存
        throw new Error('cache.memory 与 cache.redis 至少需要设置一个');
      }
      appCacheSingletonInstance = this;
      console.log('AppCache 初始化完成');
    }
    return appCacheSingletonInstance;
  }

  async update(keyModule: AppCacheKeyModule, key: string, value: AppCacheValue) {
    if (value === undefined || value === null || value === '') {
      return this.delete(keyModule, key);
    }
    return this.save(keyModule, key, value);
  }

  async save(keyModule: AppCacheKeyModule, key: string, value: AppCacheValue) {
    return new Promise((resolve, reject) => {
      let ttl = 0;
      switch (keyModule) {
        case AppCacheKeyModule.LoginInfo:
          ttl = 30 * 60; // 登录信息 30 分钟, ttl 单位为秒
          break;
        case AppCacheKeyModule.Default:
          ttl = 0;
          break;
        default:
          ttl = 0;
      }
      // TODO: 这里的 ttl 似乎并未生效, 而是使用的初始化时设置的 ttl
      this.cache.set(this.getFinalCacheKey(keyModule, key), value, ttl, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async get(keyModule: AppCacheKeyModule, key: string): Promise<AppCacheValue> {
    return new Promise((resolve, reject) => {
      this.cache.get(this.getFinalCacheKey(keyModule, key), (err, result) => {
        if (err) return reject(err);
        resolve(result as AppCacheValue);
      });
    });
  }

  async delete(keyModule: AppCacheKeyModule, key: string) {
    return new Promise((resolve, reject) => {
      this.cache.del(this.getFinalCacheKey(keyModule, key), (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private getFinalCacheKey(keyModule: AppCacheKeyModule, key: string) {
    return `${keyModule}__${key}`;
  }
}

export function InjectAppCache(): Function {
  return function (object: Record<string, any>, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: () => Container.get(AppCache),
    });
  };
}
