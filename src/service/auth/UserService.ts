import { Service } from 'typedi';
import {
  Connection, Repository, EntityMetadata, FindConditions,
} from 'typeorm';
import { InjectConnection, InjectRepository } from 'typeorm-typedi-extensions';
import md5 from 'md5';
import UserEntity from '../../entity/auth/UserEntity';

@Service('UserService')
export default class UserService {
  private readonly meta: EntityMetadata

  private sql: Partial<SQLAuthUserService>

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectRepository(UserEntity) private readonly repository: Repository<UserEntity>,
  ) {
    this.meta = this.conn.getMetadata(UserEntity);

    this.prepareSql();
  }

  private prepareSql() {
    const table = this.meta.tableName;
    this.sql = {
      updatePassword: `update ${table} set password = md5(?) where id = ?`,
      enableDisable: `update ${table} set is_enable = ? where id = ?`,
      delete: `update ${table} set is_delete = 1 where id = ?`,
      queryByLoginName: `select id from ${table} where is_enable = 1 and is_delete = 0 and login_name = ?`,
      queryByPassword: `select id from ${table} where is_enable = 1 and is_delete = 0 and login_name = ? and password = md5(?)`,
    };
  }

  // TODO: 支持字段的 模糊查询
  async pagedSearch(pageSize: number, pageNum: number, params: FindConditions<UserEntity>) {
    const queryBuilder = this.repository.createQueryBuilder('user')
      .select()
      .addSelect((qb) => qb.subQuery()
        .select('c_user.user_name')
        .addFrom(UserEntity, 'c_user')
        .where('c_user.id = user.create_user_id'), 'user_createUserName')
      .addSelect((qb) => qb.subQuery()
        .select('u_user.user_name')
        .addFrom(UserEntity, 'u_user')
        .where('u_user.id = user.update_user_id'), 'user_updateUserName')
      .where(params)
      .andWhere('user.is_delete = 0')
      .orderBy({
        'user.update_time': 'DESC',
      })
      .skip((pageNum - 1) * pageSize)
      .take(pageSize);
    const [total, { entities: content, raw }] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.getRawAndEntities(),
    ]);
    content.forEach((item, idx) => {
      item.createUserName = raw[idx].user_createUserName;
      item.updateUserName = raw[idx].user_updateUserName;
    });
    return {
      total, pageNum, pageSize, content,
    };
  }

  async existUser(loginName: string) {
    const res = await this.repository.query(this.sql.queryByLoginName!, [loginName]);
    return res.length !== 0;
  }

  async getUserInfoByLoginName(loginName: string, password: string) {
    const res: Partial<UserEntity> | undefined = await this.repository.findOne({
      select: ['id', 'userName', 'loginName'],
      loadRelationIds: {
        disableMixedMap: true,
      },
      where: {
        // TODO: is_delete 未生效
        // TODO: 测试环境 - aliyun-sae 中直接报错
        // is_delete: 0, // eslint-disable-line @typescript-eslint/camelcase
        enable: 1,
        loginName,
        password: md5(password),
      },
    });
    return res;
  }

  async create(user: UserEntity) {
    return (await this.repository.save(user)).id;
  }

  async update(user: UserEntity) {
    // 指定要修改哪些字段, 防止误改, update_time 会自动更新
    const keys: (keyof UserEntity)[] = ['userName', 'loginName', 'cellphone', 'email'];
    const subUser: any = {};
    for (const key of keys) {
      if (user[key] !== undefined && user[key] !== null) subUser[key] = user[key];
    }
    return await this.conn.transaction(async (runInTransaction) => {
      await runInTransaction.update(UserEntity, user.id, subUser);
      const res = await runInTransaction.findOne(UserEntity, user.id);
      res!.roles = user.roles || []; // TODO: res=undefined

      await runInTransaction.save(res!);
      return true;
    });
  }

  async changePassword(id: number, password: string) {
    await this.repository.query(this.sql.updatePassword!, [password, id]);
    return true;
  }

  async delete(id: number) {
    await this.repository.query(this.sql.delete!, [id]);
    return true;
  }

  async enableDisable(id: number, enable: boolean) {
    await this.repository.query(this.sql.enableDisable!, [enable ? 1 : 0, id]);
    return true;
  }
}

interface SQLAuthUserService {
  updatePassword: string;
  enableDisable: string;
  delete: string;
  queryByLoginName: string;
  queryByPassword: string;
}
