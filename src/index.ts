import 'reflect-metadata';
import express, {
  Application, Response, Request, NextFunction,
} from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import {
  useContainer as useContainerRoutingControllers, useExpressServer, Action, UnauthorizedError,
} from 'routing-controllers';
import {
  useContainer as useContainerTypeORM, createConnection, ConnectionOptions, Connection,
} from 'typeorm';
import Container from 'typedi';

import { AppCacheKeyModule, AppCache } from './util/app-cache';
import { AppConfig } from './util/app-config';
import MyNamingStrategy from './util/MyNamingStrategy';

import entities from './entity/index';
import controllers from './controller/index';
import middlewares from './middleware/routing-controller/index';
import interceptors from './interceptors/index';

const config: AppConfig = Container.get(AppConfig);
const appCache: AppCache = Container.get(AppCache);

// typeorm 初始化
async function initTypeOrmAndMySql(): Promise<Connection> {
  // typeorm 集成 typedi, 可结合 typeorm-typedi-extensions 使用
  useContainerTypeORM(Container);

  const mysqlOptions: ConnectionOptions = ({
    ...config.typeorm.options,
    entities,
    namingStrategy: new MyNamingStrategy(),
  }) as ConnectionOptions;

  // 创建 typeorm 数据库连接
  return await createConnection(mysqlOptions);
}

// 初始化 express 和 routing-controller
async function initExpressAndRoutingController(): Promise<Application> {
  const app = express();

  // 配置 express 中间件
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  // routing-controllers 集成 typedi
  useContainerRoutingControllers(Container);

  // 绑定 routing-controller 与 express
  useExpressServer(app, {
    // class-transformer @Body() @Param @QueryPparam @BodyParam
    classTransformer: true,
    // class-validator @Body() @Param @QueryPparam @BodyParam
    validation: true,
    cors: config.express.cors,
    development: process.env.NODE_ENV === 'development',
    routePrefix: config.express.routePrefix,
    controllers,
    middlewares,
    interceptors,
    defaultErrorHandler: false,
    authorizationChecker: async (action: Action, roles: string[]) => {
      const user: any = await appCache.get(AppCacheKeyModule.LoginInfo, action.request.cookies[config.express.authTokenCookie.key]);
      if (!user) throw new UnauthorizedError('请先登录后再操作');

      if (roles.length === 0) return true;

      const userRoles: string[] = [];
      for (const item of user.roles) {
        userRoles.push(item.code);
      }

      for (const item of roles) {
        if (!userRoles.includes(item)) return false;
      }

      return true;
    },
    currentUserChecker: async (action: Action) => await appCache.get(AppCacheKeyModule.LoginInfo, action.request.cookies[config.express.authTokenCookie.key]),
    defaults: {
      nullResultCode: 500,
      undefinedResultCode: 500,
      paramOptions: {
        required: false, // 结合 validation 配置: 为 true 时, 不会依据 ts 的 ?: 来动态判断
      },
    },
  });

  return Promise.resolve(app);
}


async function startServer(): Promise<void> {
  await initTypeOrmAndMySql();
  const app: Application = await initExpressAndRoutingController();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next();
    res.status(404).json({
      success: false,
      code: 404,
      info: `请求不存在: ${req.path}`,
      data: null,
    });
  });

  const { port } = config;
  app.listen(+port, 'localhost');
  // eslint-disable-next-line no-console
  console.warn(`Application server listening on ${port} ......`);
}

startServer();
