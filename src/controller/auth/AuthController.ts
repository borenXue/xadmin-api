import {
  Post, JsonController, BodyParam, Get, Res, CurrentUser, HttpError, Authorized, Patch,
} from 'routing-controllers';
import { Response } from 'express';
import { Inject } from 'typedi';
import { CookieAuthToken } from '../../util/decorator';
import UserService from '../../service/auth/UserService';
import RoleService from '../../service/auth/RoleService';
import RightService from '../../service/auth/RightService';
import { AppConfig, InjectAppConfig } from '../../util/app-config';
import RoleEntity from '../../entity/auth/RoleEntity';
import { ExpectedError } from '../../util/errors';
import {
  InjectAppCache, AppCacheKeyModule, AppCacheValue, AppCache,
} from '../../util/app-cache';

// 仅保存本次系统重启后所产生的 token
const tokensFromStartup: string[] = [];

@JsonController('auth')
export default class AuthController {
  private readonly tokenKey: string

  constructor(
    @Inject(UserService.name) private readonly userService: UserService,
    @Inject(RoleService.name) private readonly roleService: RoleService,
    @Inject(RightService.name) private readonly rightService: RightService,
    @InjectAppCache() private readonly cache: AppCache,
    @InjectAppConfig() private readonly config: AppConfig,
  ) {
    this.tokenKey = this.config.express.authTokenCookie.key;
  }

  async getUserInfo(user: any) {
    for (const role of user.roles) {
      await this.roleService.lightLoad(role); /* eslint-disable-line no-await-in-loop */
    }
    const set: Set<number> = new Set<number>();
    user.roles.forEach((role: RoleEntity) => role.rightIds.forEach((rId) => set.add(rId)));

    const transfrom = (item: any) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      url: item.url,
      type: item.type,
      icon: item.icon,
      tip: item.tip,
      sortOrder: item.sort_order,
      parentId: item.parent_id,
    });
    user.rights = set.size > 0 ? await this.rightService.searchCascade(Array.from(set), transfrom) : [];
    // user.rightsFlatArray = this.treeToArray(JSON.parse(JSON.stringify(user.rights)));

    return user;
  }

  @Post('/login')
  async login(
    @Res() res: Response,
    @BodyParam('loginName') loginName: string,
    @BodyParam('password') password: string,
    @CookieAuthToken(false) token: string,
  ) {
    // 登录时, 如果 token 存在, 则清除该 token 对应的缓存值
    if (token) {
      await this.cache.delete(AppCacheKeyModule.LoginInfo, token);
    }
    if (!loginName) throw new ExpectedError('请输入登录账号');
    if (!password) throw new ExpectedError('请输入密码');

    if (!await this.userService.existUser(loginName)) throw new ExpectedError('该用户不存在');

    const user = await this.userService.getUserInfoByLoginName(loginName, password);

    if (!user) throw new ExpectedError('密码不正确');

    const userInfo: any = await this.getUserInfo(user);

    // 生成新的 token
    const cookieToken = new Date().getTime() + Math.random().toString(32).substring(2);
    await this.cache.save(AppCacheKeyModule.LoginInfo, cookieToken, userInfo);
    tokensFromStartup.push(cookieToken);

    res.cookie(this.tokenKey, cookieToken, {
      httpOnly: this.config.express.authTokenCookie.httpOnly,
      path: '/',
      // 浏览器单位为 s, 这里单位为 ms
      maxAge: this.config.express.authTokenCookie.maxAge,
    });

    return userInfo;
  }

  @Post('/logout')
  async logout(
    @Res() res: Response,
    @CookieAuthToken(false) token: string,
  ) {
    if (token) {
      await this.cache.delete(AppCacheKeyModule.LoginInfo, token);
    }
    // 仅当参数与 cookie 完全一致时浏览器才会清除 (expires 与 maxAge 除外)
    res.clearCookie(this.tokenKey, {
      httpOnly: this.config.express.authTokenCookie.httpOnly,
      path: '/',
    });
    res.status(200);
    return true;
  }

  @Post('/is-login')
  async isLogin(
    @Res() res: Response,
    @CookieAuthToken(false) token: string,
  ) {
    const userInfo: any = token ? await this.cache.get(AppCacheKeyModule.LoginInfo, token) : null;
    if (!token || !userInfo) throw new HttpError(401, '登录已过期, 请重新登录');

    res.cookie(this.tokenKey, token, {
      httpOnly: this.config.express.authTokenCookie.httpOnly,
      path: '/',
      // 浏览器单位为 s, 这里单位为 ms
      maxAge: this.config.express.authTokenCookie.maxAge,
    });
    return userInfo;
  }

  @Patch('/password')
  @Authorized()
  async changePassword(
    @CurrentUser({ required: true }) user: any,
    @BodyParam('password', { required: true }) password: string,
    @BodyParam('oldPassword', { required: true }) oldPassword: string,
  ) {
    const userItem = await this.userService.getUserInfoByLoginName(user.loginName, oldPassword);
    if (!userItem) throw new Error('当前密码不正确');

    return await this.userService.changePassword(user.id, password);
  }

  @Get('/cache')
  @Authorized('SYSTEM_ADMIN')
  async getCaches() {
    const res: { key: string[]; [key: string]: AppCacheValue } = { key: [] };
    for (const key of tokensFromStartup) {
      const val = await this.cache.get(AppCacheKeyModule.LoginInfo, key); // eslint-disable-line no-await-in-loop
      res[key] = val;
      res.key.push(key);
    }
    return res;
  }
}
