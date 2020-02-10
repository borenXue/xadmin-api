/**
 * merge-anything 合并规则测试: https://runkit.com/borenxue/merge-anything-rule-test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import deepFreeze from 'deep-freeze';
import Container, { ContainerInstance } from 'typedi';
import MergeAnything from 'merge-anything';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { MysqlConnectionCredentialsOptions } from 'typeorm/driver/mysql/MysqlConnectionCredentialsOptions';
import { ClientOpts } from 'redis';

let appConfigSingletonInstance: AppConfig;

export class AppConfig {
  port: number

  mysql: MysqlConnectionCredentialsOptions

  typeorm: {
    options: MysqlConnectionOptions;
  }

  tables: {
    core_right: string;
    core_role: string;
    core_user: string;
    core_ref_user_role: string;
    core_ref_role_right: string;
  }

  cache: {
    memory: false | {
      max: number;
      ttl: number;
    };
    // ClientOpts 选项参考: https://github.com/NodeRedis/node_redis#options-object-properties
    redis: false | (ClientOpts & {
      ttl: number;
      max: number;
    });
  }

  logger: {
    console: boolean;
    aliyun: boolean | {};
    file: boolean;
  }

  express: {
    routePrefix: string;
    authTokenCookie: {
      key: string;
      maxAge: number;
      httpOnly: boolean;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
      methods: string;
    };
  }

  /**
   * 自动获取项目配置 - 通过 process.env.NODE_ENV 区分
   * TODO: 部分参数支持 环境变量可覆盖 yml 配置 - 通过自定义 decorator 来实现
   * TODO: 去除 containerInstance && 动态设置构造参数(全局, 而非每个 Container.get 处单独设置)
   * TODO: 单例模式使用 Container 的机制来实现 - eg: @Service - 可行性待确认
   * TODO: appConfigSingletonInstance instanceof AppConfig 当前为 false
   * @param relativeDirectory 配置文件所在目录的相对路径, 相对于命令执行时所在文件夹
   * @param file 配置文件前缀, eg: app.development.yml 文件的 file 为 app
   * @param env process.env.NODE_ENV 的值, 不传则默认取  默认为 process.env.NODE_ENV, 取不到时为 development
   */
  constructor(containerInstance: ContainerInstance, relativeDirectory = 'config', file = 'app', env?: string) {
    if (!appConfigSingletonInstance) {
      const envValue = env || process.env.NODE_ENV || 'development';
      const baseFilePath = path.resolve(process.cwd(), relativeDirectory, `${file}.base.yml`);
      const filePath = path.resolve(process.cwd(), relativeDirectory, `${file}.${envValue}.yml`);
      appConfigSingletonInstance = MergeAnything(
        yaml.safeLoad(fs.readFileSync(baseFilePath, 'utf8')),
        yaml.safeLoad(fs.readFileSync(filePath, 'utf8')),
      ) as AppConfig;
      deepFreeze(appConfigSingletonInstance);
      console.log('AppConfig 初始化完成');
    }
    return appConfigSingletonInstance;
  }
}

export function InjectAppConfig(): Function {
  return function injectAppConfigInner(object: Record<string, any>, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: () => Container.get(AppConfig),
    });
  };
}
