import {
  QueryParam, Body, Post, Param, Put, Delete, Get, BodyParam, JsonController, Authorized, Patch,
} from 'routing-controllers';
import { Inject } from 'typedi';
import { FindConditions } from 'typeorm';
import UserService from '../../service/auth/UserService';
import UserEntity from '../../entity/auth/UserEntity';
import RoleEntity from '../../entity/auth/RoleEntity';

@JsonController('auth/user')
@Authorized('USER_ADMIN')
export default class UserController {
  @Inject(UserService.name)
  private readonly userService: UserService

  @Get()
  async search(
    @QueryParam('pageSize', { required: true, type: Number }) pageSize: number,
    @QueryParam('pageNum', { required: true }) pageNum: number,
    @QueryParam('cellphone') cellphone: number,
    @QueryParam('userName') userName: string,
    @QueryParam('loginName') loginName: string,
    @QueryParam('enable') enable: boolean,
  ) {
    const params: FindConditions<UserEntity> = {};
    if (cellphone) params.cellphone = cellphone;
    if (userName) params.userName = userName;
    if (loginName) params.loginName = loginName;
    if (typeof enable === 'boolean') params.enable = enable;
    return await this.userService.pagedSearch(pageSize, pageNum, params);
  }

  @Post()
  // @Body 注入的 user 为空对象: 将 @Controller 替换为 @JsonController 即可
  async insert(
    @Body({ required: true }) user: UserEntity,
    @BodyParam('roles') roles: number[],
  ) {
    if (roles && roles.length > 0) {
      user.roles = roles.map((id) => new RoleEntity(id));
    }
    return await this.userService.create(user);
  }

  @Put()
  async update(@Body() user: UserEntity, @BodyParam('roles') roles: number[]) {
    user.id = +user.id;
    if (roles && roles.length > 0) {
      user.roles = roles.map((id) => new RoleEntity(id));
    }
    return await this.userService.update(user);
  }

  @Delete('/:id')
  async delete(@Param('id') id: number) {
    return await this.userService.delete(id);
  }

  @Patch('/:id/enable')
  async enable(@Param('id') id: number) {
    return await this.userService.enableDisable(id, true);
  }

  @Patch('/:id/disable')
  async disable(@Param('id') id: number) {
    return await this.userService.enableDisable(id, false);
  }

  @Patch('/password')
  async changePassword(
    @BodyParam('id') id: number,
    @BodyParam('password') password: string,
  ) {
    return await this.userService.changePassword(id, password);
  }
}
