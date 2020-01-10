import {
  JsonController, QueryParam, Post, Body, Delete, Param, Put, BodyParam, Get, Authorized, Patch,
} from 'routing-controllers';
import { Inject } from 'typedi';
import { FindConditions } from 'typeorm';
import RoleService from '../../service/auth/RoleService';
import RoleEntity from '../../entity/auth/RoleEntity';
import RightEntity from '../../entity/auth/RightEntity';

@JsonController('auth/role')
@Authorized('USER_ADMIN')
export default class RoleController {
  @Inject(RoleService.name)
  private readonly roleService: RoleService

  @Get()
  async search(
    @QueryParam('pageSize', { required: true, type: Number }) pageSize: number,
    @QueryParam('pageNum', { required: true }) pageNum: number,
    @QueryParam('code') code: string,
    @QueryParam('name') name: string,
    @QueryParam('enable') enable: boolean,
  ) {
    const params: FindConditions<RoleEntity> = {};
    if (code) params.code = code;
    if (name) params.name = name;
    if (typeof enable === 'boolean') params.enable = enable;
    return await this.roleService.pagedSearch(pageSize, pageNum, params, []);
  }

  @Post()
  async insert(
    @Body({ required: true, validate: true }) role: RoleEntity,
    @BodyParam('rights') rightIds: number[],
  ) {
    if (rightIds && rightIds.length > 0) {
      role.rights = rightIds.map((id) => new RightEntity(id));
    }
    return await this.roleService.insert(role);
  }

  @Put()
  async update(@Body() role: RoleEntity, @BodyParam('rights') rightIds: number[]) {
    if (rightIds && rightIds.length > 0) {
      role.rights = rightIds.map((id) => new RightEntity(id));
    }
    return await this.roleService.update(role);
  }

  @Delete('/:id')
  async delete(@Param('id') id: number) {
    return await this.roleService.delete(id);
  }

  @Patch('/:id/enable')
  async enable(@Param('id') id: number) {
    return await this.roleService.enableDisable(id, true);
  }

  @Patch('/:id/disable')
  async disable(@Param('id') id: number) {
    return await this.roleService.enableDisable(id, false);
  }
}
