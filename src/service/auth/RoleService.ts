import { Service } from 'typedi';
import {
  Connection, Repository, EntityMetadata, FindConditions,
} from 'typeorm';
import { InjectConnection, InjectRepository } from 'typeorm-typedi-extensions';
import RoleEntity from '../../entity/auth/RoleEntity';
import UserEntity from '../../entity/auth/UserEntity';

@Service('RoleService')
export default class RoleService {
  private readonly meta: EntityMetadata

  private sql: Partial<SQLAuthRoleService>

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectRepository(RoleEntity) private readonly repository: Repository<RoleEntity>,
  ) {
    this.meta = this.conn.getMetadata(RoleEntity);
    this.prepareSql();
  }

  private prepareSql() {
    const table = this.meta.tableName;
    const refTable = 'core_admin_refs_role_right';
    this.sql = {
      queryRoleIdsStrByRightIds: `select group_concat(rr.role.id) str
        from ${refTable} rr where rr.right_id in (?)
      `,
      delete: `update ${table} set is_delete = 1 where id = ?`,
      enableDisable: `update ${table} set is_enable = ? where id in (?)`,
    };
  }

  // TODO: 支持字段的 模糊查询
  async pagedSearch(pageSize: number, pageNum: number, params: FindConditions<RoleEntity>, rights: number[]) {
    // 处理 rights
    const queryBuilder = this.repository.createQueryBuilder('role')
      .select()
      // TODO: 是否可配置到 RoleBean 中, 自动生成该 subQuery
      .addSelect((qb) => qb.subQuery()
        .select('c_user.user_name')
        .addFrom(UserEntity, 'c_user')
        .where('c_user.id = role.create_user_id'), 'createUserName')
      .addSelect((qb) => qb.subQuery()
        .select('u_user.user_name')
        .addFrom(UserEntity, 'u_user')
        .where('u_user.id = role.update_user_id'), 'updateUserName')
      .where('role.is_delete = 0')
      .orderBy({ 'role.update_time': 'DESC' })
      .skip((pageNum - 1) * pageSize)
      .take(pageSize);

    // 处理 rights: 得到与 这些权限 有关联的 角色 roleId 列表
    // TODO: 得到的 roleId 可能只与其中一个权限有关联, 应该 <也> 支持 <roleId 与所有权限都有关联> 的查询
    if (rights && rights.length > 0) {
      const res = await this.repository.query(this.sql.queryRoleIdsStrByRightIds!, [rights]);
      const roleIds = (res[0].str).split(',').map((item: any) => +item);
      if (roleIds.length > 0) {
        queryBuilder.andWhereInIds(roleIds);
      }
    }

    const resPromise = queryBuilder.getRawAndEntities();
    const [total, { entities: content, raw }] = await Promise.all([queryBuilder.getCount(), resPromise]);
    // TODO: qb 中 subQuery 中的 updateUserName 替换为 role_updateUserName 后, 可省略下面的代码
    content.forEach((item, idx) => {
      item.createUserName = raw[idx].createUserName;
      item.updateUserName = raw[idx].updateUserName;
    });
    return {
      total, pageSize, pageNum, content,
    };
  }

  async insert(role: RoleEntity) {
    return (await this.repository.save(role)).id;
  }

  // TODO: updateTime: 仅修改 refs 关系表时, right的updateTime 也会改变 - 不允许改变 并且 查询时的 updateTime, 应该取两者最大的 ?
  async update(role: RoleEntity) {
    // 指定要修改哪些字段, 防止误改, update_time 会自动更新
    const keys: (keyof RoleEntity)[] = ['code', 'name', 'description'];
    const subRole: any = {};
    for (const key of keys) {
      if (role[key] !== undefined && role[key] !== null)subRole[key] = role[key];
    }
    return await this.conn.transaction(async (runInTransaction) => {
      await runInTransaction.update(RoleEntity, role.id, subRole);
      const res = await runInTransaction.findOne(RoleEntity, role.id);
      res!.rights = role.rights; // TODO: res=undefined case
      await this.repository.save(res!);
      return true;
    });
  }

  async delete(id: number) {
    // TODO: 检查 - 有关联时不可被删除
    await this.repository.query(this.sql.delete!, [id]);
    return true;
  }

  async enableDisable(id: number, enable: boolean) {
    // TODO: 检查 - 有关联时不可被禁用
    await this.repository.query(this.sql.enableDisable!, [enable ? 1 : 0, id]);
    return true;
  }

  /**
   * @param roles eg: role: {id: 1}
   */
  async lightLoad(role: RoleEntity) {
    const res = await this.repository.findOne(role.id, {
      select: ['code', 'name'],
      loadRelationIds: {
        relations: ['rights'],
        disableMixedMap: false,
      },
    });
    // TODO: 如何只查询 rightIds 字段, 而不查询 rights
    delete res!.rights; // TODO: res=undefined case
    Object.assign(role, res);
  }
}

interface SQLAuthRoleService {
  queryRoleIdsStrByRightIds: string;
  delete: string;
  enableDisable: string;
  lightLoadList: string;
}
