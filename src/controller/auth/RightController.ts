import {
  JsonController, Post, Delete, Put, Get, Body, BodyParam, Param, Authorized, Patch,
} from 'routing-controllers';
import { Inject } from 'typedi';
import RightService from '../../service/auth/RightService';
import RightEntity from '../../entity/auth/RightEntity';

@JsonController('auth/right')
@Authorized('USER_ADMIN')
export default class RightController {
  @Inject(RightService.name)
  private rightService: RightService

  @Post()
  async create(
    @Body() right: RightEntity,
    @BodyParam('parentId', { required: false, type: Number }) parentId: number,
    @BodyParam('previousSiblingId', { required: false, type: Number }) previousSiblingId: number,
  ) {
    return await this.rightService.insertOne(right, parentId, previousSiblingId);
  }

  @Delete('/:id')
  async delete(@Param('id') id: number) {
    return await this.rightService.deleteCascade(id);
  }

  // parentId、closure 信息的修改由 move 方法来实现
  @Put()
  async update(@Body() right: RightEntity) {
    return await this.rightService.updateDetail(right);
  }

  @Patch('/:id/enable')
  async enable(@Param('id') id: number) {
    return await this.rightService.enableDisable(id, true);
  }

  @Patch('/:id/disable')
  async disable(@Param('id') id: number) {
    return await this.rightService.enableDisable(id, false);
  }

  @Patch('/move')
  async sortMove(
    @BodyParam('movedId', { required: true }) movedId: number,
    @BodyParam('referenceId', { required: true }) referenceId: number,
    @BodyParam('type', { required: true }) type: 'before' | 'after',
  ) {
    if (type === 'before') return await this.rightService.moveBefore(movedId, referenceId);
    if (type === 'after') return await this.rightService.moveAfter(movedId, referenceId);
    throw new Error('type 值必须为 before 或 after');
  }

  @Get()
  async listAllCascade() {
    return await this.rightService.searchCascade();
  }
}
