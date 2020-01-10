import { Service } from 'typedi';
import {
  Connection, Repository, EntityMetadata,
} from 'typeorm';
import { InjectConnection, InjectRepository } from 'typeorm-typedi-extensions';
import arrayToTree from 'array-to-tree';
import { BadRequestError } from 'routing-controllers';
import RightEntity from '../../entity/auth/RightEntity';

@Service('RightService')
export default class RightService {
  private readonly meta: EntityMetadata

  private sql: Partial<SQLClosureTable>

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectRepository(RightEntity) private readonly repository: Repository<RightEntity>,
  ) {
    this.meta = this.conn.getMetadata(RightEntity);

    this.prepareSql();
  }

  private prepareSql() {
    const table = this.meta.tableName;
    const closureTable = `${this.meta.tableName}_closure`;
    const sortType = 'asc';
    const userTable = 'core_admin_user';
    this.sql = {
      // 新增相关
      queryParentId: `select parent_id from ${table} where id = ?`,
      queryParentIdAndSortOrder: `select parent_id, sort_order from ${table} where id = ?`,
      queryNextSortOrderTopLevel: `select max(sort_order) + 1 as sortOrder from ${table} where parent_id is null`,
      queryNextSortOrderSameLevel: `select max(sort_order) + 1 as sortOrder from ${table} where parent_id = ?`,
      insertClosure: `insert into ${closureTable} (id_ancestor, id_descendant, distance) values(?, ?, ?)`,
      queryIdsGTESortOrderTopLevel: `select rights.id from ${table} rights where parent_id is null and rights.sort_order >= ?`,
      queryIdsGTESortOrderSameLevel: `select rights.id from ${table} rights where parent_id = ? and rights.sort_order >= ?`,
      updateOrderAdd1: `update ${table} uright
        set uright.sort_order = uright.sort_order + 1
        where uright.id in (?)
        order by uright.sort_order desc
      `,
      // 查询相关
      queryTopLevel: `
        select
          r.*, (
            select c_user.user_name from ${userTable} c_user where c_user.id = r.create_user_id
          ) as create_user_name, (
            select u_user.user_name from ${userTable} u_user where u_user.id = r.update_user_id
          ) as update_user_name
        from ${table} r
        where r.parent_id is null and r.is_delete = 0 order by r.sort_order ${sortType}
      `,
      queryTopLevelInIds: `
        select
          r.*, (
            select c_user.user_name from ${userTable} c_user where c_user.id = r.create_user_id
          ) as create_user_name, (
            select u_user.user_name from ${userTable} u_user where u_user.id = r.update_user_id
          ) as update_user_name
        from ${table} r
        where r.parent_id is null and r.is_delete = 0 and r.is_enable = 1 and r.id in (?) order by r.sort_order ${sortType}
      `,
      queryTopLevelItemAllChildsId: `
        select id_descendant as id from ${closureTable} where id_ancestor = ? and distance > 0
      `,
      queryTopLevelItemAllChildsIdInIds: `select id_descendant as id from ${closureTable} where id_ancestor = ? and distance > 0 and id_descendant in (?)`,
      queryByIdList: `
        select
          r.*, (
            select c_user.user_name from ${userTable} c_user where c_user.id = r.create_user_id
          ) as create_user_name, (
            select u_user.user_name from ${userTable} u_user where u_user.id = r.update_user_id
          ) as update_user_name
        from ${table} r
        where r.is_delete = 0 and r.id in (?) order by r.sort_order ${sortType}
      `,
      queryByIdListInIds: `
        select
          r.*, (
            select c_user.user_name from ${userTable} c_user where c_user.id = r.create_user_id
          ) as create_user_name, (
            select u_user.user_name from ${userTable} u_user where u_user.id = r.update_user_id
          ) as update_user_name
        from ${table} r
        where r.is_delete = 0 and r.is_enable = 1 and r.id in (?) order by r.sort_order ${sortType}
      `,

      // 删除相关
      queryCascadeChildIdList: `select id_descendant as id from ${closureTable} where id_ancestor = ?`,
      markDeleteByIds: `update ${table} set is_delete = 1 where id in (?)`,
      // 启用禁用相关
      updateEnableByIds: `update ${table} set is_enable = ? where id in (?)`,
    };
  }

  private logMeta() {
    function metaObj(meta: any) {
      if (meta instanceof Array) {
        const list: any[] = [];
        meta.forEach((item) => list.push(metaObj(item)));
        return list;
      }
      const obj: any = {};
      for (const key in meta) {
        if (typeof meta[key] !== 'object') {
          obj[key] = meta[key];
        }
        // else if (meta[key] && meta[key] instanceof Array) {
        //   obj[key] = metaObj(meta[key])
        // }
      }
      return obj;
    }
    // this.meta.tableName: core_admin_right
    // this.meta.closureJunctionTable.tableName: core_admin_right_closure
    // this.meta.orderBy
    const obj: any = {
      // tableMetadataArgs: this.meta.tableMetadataArgs,
      closureJunctionTable: metaObj(this.meta.closureJunctionTable),
      // orderBy: metaObj(this.meta.orderBy),
      // columns: metaObj(this.meta.columns),
      // ...metaObj(this.meta)
    };
    console.log(JSON.stringify(obj));
  }

  private transformItem(plainObject: any) {
    const item: any = this.conn.manager.create(RightEntity, plainObject);
    item.sortOrder = plainObject.sort_order;
    item.enable = plainObject.is_enable;
    item.createUserId = plainObject.create_user_id;
    item.createTime = new Date(plainObject.create_time);
    item.createUserName = plainObject.create_user_name;
    item.updateUserId = plainObject.update_user_id;
    item.updateTime = new Date(plainObject.update_time);
    item.updateUserName = plainObject.update_user_name;
    delete item.version;
    item.parentId = plainObject.parent_id;
    return item;
  }

  async searchCascade(ids: number[] = [], transform?: (item: any) => object) {
    return await this.conn.transaction(async (runInTransaction) => {
      const repo = runInTransaction.getRepository(RightEntity);

      const topLevelList = await repo.query(
        ids.length > 0 ? this.sql.queryTopLevelInIds! : this.sql.queryTopLevel!,
        ids.length > 0 ? [ids] : [],
      );

      if (topLevelList.length === 0) return [];

      let all = topLevelList.map((item: any) => this.transformItem(item));

      for (const item of topLevelList) {
        // eslint-disable-next-line no-await-in-loop
        const childIds = await repo.query(
          ids.length > 0 ? this.sql.queryTopLevelItemAllChildsIdInIds! : this.sql.queryTopLevelItemAllChildsId!,
          ids.length > 0 ? [item.id, ids] : [item.id],
        );
        if (childIds.length > 0) {
          // eslint-disable-next-line no-await-in-loop
          const childs = await repo.query(
            ids.length > 0 ? this.sql.queryByIdListInIds! : this.sql.queryByIdList!,
            [childIds.map((itemInner: any) => itemInner.id)],
          ) || [];
          all = all.concat(childs.map((itemInner: any) => this.transformItem(itemInner)));
        }
      }

      const tree = arrayToTree(all, { parentProperty: 'parentId' });

      if (typeof transform === 'function') return this.treeMap(tree, transform);

      return tree;
    });
  }

  treeMap(tree: any[], transform: (item: any) => object) {
    const result = [];
    for (const item of tree) {
      let itemChildren: any[] = [];
      if (item.children && item.children.length > 0) {
        itemChildren = this.treeMap(item.children, transform);
      }
      const newItem: any = transform(item);
      newItem.children = itemChildren;
      result.push(newItem);
    }
    return result;
  }

  async lightLoad(right: RightEntity) {
    const res = await this.repository.findOne({
      select: ['code', 'name', 'type'],
      where: {
        id: right.id,
        is_delete: 0, // eslint-disable-line @typescript-eslint/camelcase
      },
    });
    Object.assign(right, res);
    return right;
  }

  // TODO: 检查 - 有关联时不可被删除
  // 标记删除 - 所有下级节点全部标记为已删除: 出于数据永久可用性考虑, sortOrder 字段及 closure 记录不作改动
  //   TODO: 待研究: 已删除数据太多时, 可能会导致插入、查询、移动等操作耗时加长
  async deleteCascade(id: number) {
    return await this.conn.transaction(async (runInTransaction) => {
      const repo = runInTransaction.getRepository(RightEntity);

      const parentIdList = await repo.query(this.sql.queryCascadeChildIdList!, [id]);
      await repo.query(this.sql.markDeleteByIds!, [parentIdList.map((item: any) => item.id)]);
      return true;
    });
  }

  // TODO: 检查 - 有关联时不可被禁用
  async enableDisable(id: number, enable: boolean) {
    return await this.conn.transaction(async (runInTransaction) => {
      const repo = runInTransaction.getRepository(RightEntity);

      const parentIdList = await repo.query(this.sql.queryCascadeChildIdList!, [id]);
      await repo.query(this.sql.updateEnableByIds!, [enable ? 1 : 0, parentIdList.map((item: any) => item.id)]);
      return true;
    });
  }

  async updateDetail(entity: RightEntity) {
    // 指定要修改哪些字段, 防止误改, update_time 会自动更新
    const keys: (keyof RightEntity)[] = ['code', 'name', 'type', 'icon', 'tip', 'description'];
    const subRight: any = {
      id: entity.id,
    };
    for (const key of keys) {
      subRight[key] = entity[key];
    }
    await this.repository.save(subRight, { reload: false });
    return true;
  }

  // 新增时, 主要是修改 sortOrder、parentId 以及插入 closure 相关信息, 可不用考虑 enable、delete 字段
  async insertOne(entity: RightEntity, parentId?: number, previousSiblingId?: number) {
    return await this.conn.transaction(async (runInTransaction) => {
      const repo = runInTransaction.getRepository(RightEntity);
      debugger; // eslint-disable-line

      // step 1: 设置 entity 的 parent 与 sortOrder
      if (parentId) entity.parent = new RightEntity(parentId);
      if (previousSiblingId) {
        // 如果 previousSiblingId 存在, 则代表 sortOrder 要紧跟在该节点后
        const [{ parent_id: pId, sort_order: sortOrder }] = await runInTransaction.query(this.sql.queryParentIdAndSortOrder!, [previousSiblingId]);
        entity.sortOrder = sortOrder + 1;
        if (pId !== parentId) throw new BadRequestError(`${previousSiblingId} 的父节点 id (${pId}) 不等于 parentId (${parentId})`);
        // sortOrder > previousSiblingId+1 的同级节点都需要将 sortOrder+1
        // ~ 多表 update 操作时, 不能使用 order by 和 limit
        // ~ where 后不能添加 select 子句: You can’t specify target table ‘x’ for update in FROM clause
        const res = await repo.query(
          parentId ? this.sql.queryIdsGTESortOrderSameLevel! : this.sql.queryIdsGTESortOrderTopLevel!,
          parentId ? [parentId, entity.sortOrder] : [entity.sortOrder],
        );
        if (res.length > 0) {
          await repo.query(this.sql.updateOrderAdd1!, [res.map((item: any) => item.id)]);
        }
      } else {
        // 查询平级中最大的 sortOrder 并设置新增数据的 sortOrder
        const [{ sortOrder }] = await runInTransaction.query(
          parentId ? this.sql.queryNextSortOrderSameLevel! : this.sql.queryNextSortOrderTopLevel!,
          parentId ? [parentId] : [],
        );
        entity.sortOrder = sortOrder || 0;
      }
      // step 2: 保存 entity
      const { id: entityId } = await repo.save(entity);
      // step 3: closure 表插入 自己
      await runInTransaction.query(this.sql.insertClosure!, [entityId, entityId, 0]);

      // step 4: 有 parent 则检查是否有父节点 (即 parent 非顶层节点)
      //             依次将父节点与该节点的关系插入 closure 表
      let nextParentId = parentId;
      let level = 1;
      while (nextParentId) {
        // eslint-disable-next-line no-await-in-loop
        await runInTransaction.query(this.sql.insertClosure!, [nextParentId, entityId, level++]);
        // eslint-disable-next-line no-await-in-loop
        const parentRes = await runInTransaction.query(this.sql.queryParentId!, [nextParentId]);
        nextParentId = undefined;
        if (parentRes.length > 0 && parentRes[0].parent_id) {
          nextParentId = parentRes[0].parent_id;
        }
      }
      return entityId;
    });
  }

  /**
   * 将 movedId 移至 referenceId 的前面, 实现逻辑:
   *
   * 1、查询基础信息: (供后续操作使用)
   *    movedId 与 referenceId 各自的 parentId、sortOrder
   *    movedId 与 referenceId 各自的 nextSibling 节点的 id 集合: 用于批量修改 sortOrder
   *    movedId 的所有后代节点 - 包括自己 - 用于 closure 表的记录删除、与后续的重建
   * 2、删除 closure 表中的 movedId 及其所有子节点相关记录
   * 3、referenceId 及其所有 nextsibling 节点的 sortOrder + 1
   * 4、修改 movedId 的 parentId 和 sortOrder
   * 5、movedId 所有 nextSibling 节点的 sortOrder - 1
   *    要剔除掉 referenceId 及其所有 nextsibling 节点 (同父时, 交换两个子节点时, 会冲突)
   *    TODO: (after 中是否有同样的 case 需要考虑)
   * 6、重建 movedId 及其所有子节点们在 closure 中的关联记录 (借助 parentId 依次向上深度遍历每个祖先节点)
   *
   * 说明:
   *    nextSibling: 排序在后面的所有同一级节点
   */
  async moveBefore(movedId: number, referenceId: number) {
    return await this.conn.transaction(async (runInTransaction) => {
      const table = this.meta.tableName;
      const closureTable = `${this.meta.tableName}_closure`;

      // step 1: 查询基本信息
      const [{ referenceParentId, referenceSortOrder }] = await runInTransaction.query(`
        select parent_id as referenceParentId, sort_order as referenceSortOrder
        from ${table} where id = ?
      `, [referenceId]);
      const [{ movedParentId, movedSortOrder }] = await runInTransaction.query(`
        select parent_id as movedParentId, sort_order as movedSortOrder
        from ${table} where id = ?
      `, [movedId]);
      const referenceNextSiblingIds = (await runInTransaction.query(`
        select id from ${table} where parent_id ${referenceParentId ? `=${referenceParentId}` : 'is null'}
        and sort_order > ?
      `, [referenceSortOrder])).map((item: any) => item.id);
      const movedNextSiblingIds = (await runInTransaction.query(`
        select id from ${table} where parent_id ${movedParentId ? `=${movedParentId}` : 'is null'}
        and sort_order > ?
      `, [movedSortOrder])).map((item: any) => item.id);
      const movedAllDescendantIds: any[] = (await runInTransaction.query(`
        select id_descendant from ${closureTable} where id_ancestor = ?
      `, [movedId])).map((item: any) => item.id_descendant);

      // console.log(`
      //   referenceParentId: ${referenceParentId}  referenceSortOrder: ${referenceSortOrder}
      //   movedParentId: ${movedParentId}  movedSortOrder: ${movedSortOrder}
      //   referenceNextSiblingIds: ${referenceNextSiblingIds}
      //   movedNextSiblingIds: ${movedNextSiblingIds}
      //   movedAllDescendantIds: ${movedAllDescendantIds}
      // `);

      // step 2: 删除 closure 表中所有关于 movedId 及其子节点 相关的记录
      await runInTransaction.query(`
        delete from ${closureTable}
        where id_descendant in (?) or id_ancestor in (?)
      `, [movedAllDescendantIds, movedAllDescendantIds]);

      // step 3: referenceId 及其所有 nextsibling 节点的 sortOrder + 1
      await runInTransaction.query(`
        update ${table} set sort_order = sort_order + 1
        where id in (?) order by sort_order desc
      `, [[referenceId, ...referenceNextSiblingIds]]);

      // step 4: 修改 movedId 的 parentId 和 sortOrder
      await runInTransaction.query(`
        update ${table}
        set parent_id = ?, sort_order = ?
        where id = ?
      `, [referenceParentId, referenceSortOrder, movedId]);

      // step 5: movedId 所有 nextSibling 节点的 sortOrder - 1
      const ids = movedNextSiblingIds.filter((id: number) => id !== referenceId && referenceNextSiblingIds.indexOf(id) < 0);
      if (ids.length > 0) {
        await runInTransaction.query(`
          update ${table} set sort_order=sort_order-1
          where id in (?) order by sort_order asc
        `, [ids]);
      }

      // step 6: 重建 movedId 及其所有子节点们在 closure 中的关联记录 (借助 parentId 依次向上深度遍历每个祖先节点)
      //          思路: 每个 item 都去循环遍历自己所有的祖先节点, 并依次插入与每个祖先节点的 distance
      const closureInsertParamsList = [];
      for (const itemId of movedAllDescendantIds) {
        let parentId = itemId;
        let distance = 0;
        while (parentId) {
          closureInsertParamsList.push([parentId, itemId, distance++]); // 先插入自己与自己的关联
          // eslint-disable-next-line no-await-in-loop
          [{ parentId }] = await runInTransaction.query(`
            select parent_id as parentId from ${table} where id = ?
          `, [parentId]);
        }
      }
      await runInTransaction.query(`
        insert into ${closureTable} (id_ancestor, id_descendant, distance)
        values ${closureInsertParamsList.map(() => '(?, ?, ?)').join(',')}
      `, closureInsertParamsList.flat());
    });
  }

  /**
   * 将 movedId 移至 referenceId 的后面, 实现逻辑:
   *    只考虑 referenceId 没有 nextSibling 的场景
   *    当 referenceId 有 nextSibling 时, 应调用 moveBefore 方法来实现
   *
   * 1、查询基础信息: (供后续操作使用)
   *    movedId 与 referenceId 各自的 parentId、sortOrder
   *    movedId 与 referenceId 各自的 nextSibling 节点的 id 集合: 用于批量修改 sortOrder
   *    movedId 的所有后代节点 - 包括自己 - 用于 closure 表的记录删除、与后续的重建
   * 2、删除 closure 表中的 movedId 及其所有子节点相关记录
   * 3、【diff】referenceId 的所有的 nextsibling 节点的 sortOrder + 1 (不含referenceId)
   * 4、【diff】修改 movedId 的 parentId 和 sortOrder (referenceSortOrder+1)
   * 5、movedId 所有 nextSibling 节点的 sortOrder - 1
   * 6、重建 movedId 及其所有子节点们在 closure 中的关联记录 (借助 parentId 依次向上深度遍历每个祖先节点)
   *
   * 说明:
   *    nextSibling: 排序在后面的所有同一级节点
   */
  async moveAfter(movedId: number, referenceId: number) {
    return await this.conn.transaction(async (runInTransaction) => {
      const table = this.meta.tableName;
      const closureTable = `${this.meta.tableName}_closure`;

      // step 1: 查询基本信息
      const [{ referenceParentId, referenceSortOrder }] = await runInTransaction.query(`
        select parent_id as referenceParentId, sort_order as referenceSortOrder
        from ${table} where id = ?
      `, [referenceId]);
      const [{ movedParentId, movedSortOrder }] = await runInTransaction.query(`
        select parent_id as movedParentId, sort_order as movedSortOrder
        from ${table} where id = ?
      `, [movedId]);
      const referenceNextSiblingIds = (await runInTransaction.query(`
        select id from ${table} where parent_id ${referenceParentId ? `=${referenceParentId}` : 'is null'}
        and sort_order > ?
      `, [referenceSortOrder])).map((item: any) => item.id);
      const movedNextSiblingIds = (await runInTransaction.query(`
        select id from ${table} where parent_id ${movedParentId ? `=${movedParentId}` : 'is null'}
        and sort_order > ?
      `, [movedSortOrder])).map((item: any) => item.id);
      const movedAllDescendantIds: any[] = (await runInTransaction.query(`
        select id_descendant from ${closureTable} where id_ancestor = ?
      `, [movedId])).map((item: any) => item.id_descendant);

      console.log(`
        referenceParentId: ${referenceParentId}  referenceSortOrder: ${referenceSortOrder}
        movedParentId: ${movedParentId}  movedSortOrder: ${movedSortOrder}
        referenceNextSiblingIds: ${referenceNextSiblingIds}
        movedNextSiblingIds: ${movedNextSiblingIds}
        movedAllDescendantIds: ${movedAllDescendantIds}
      `);

      // step 2: 删除 closure 表中所有关于 movedId 及其子节点 相关的记录
      await runInTransaction.query(`
        delete from ${closureTable}
        where id_descendant in (?) or id_ancestor in (?)
      `, [movedAllDescendantIds, movedAllDescendantIds]);

      // step 3: 【diff】referenceId 的所有的 nextsibling 节点的 sortOrder + 1 (不含referenceId)
      if (referenceNextSiblingIds.length > 0) {
        await runInTransaction.query(`
          update ${table} set sort_order = sort_order + 1
          where id in (?) order by sort_order desc
        `, [referenceNextSiblingIds]);
      }

      // step 4: 【diff】修改 movedId 的 parentId 和 sortOrder (referenceSortOrder+1)
      await runInTransaction.query(`
        update ${table}
        set parent_id = ?, sort_order = ?
        where id = ?
      `, [referenceParentId, referenceSortOrder + 1, movedId]);

      // step 5: movedId 所有 nextSibling 节点的 sortOrder - 1
      if (movedNextSiblingIds.length > 0) {
        await runInTransaction.query(`
          update ${table} set sort_order=sort_order-1
          where id in (?) order by sort_order asc
        `, [movedNextSiblingIds]);
      }

      // step 6: 重建 movedId 及其所有子节点们在 closure 中的关联记录 (借助 parentId 依次向上深度遍历每个祖先节点)
      //          思路: 每个 item 都去循环遍历自己所有的祖先节点, 并依次插入与每个祖先节点的 distance
      const closureInsertParamsList = [];
      for (const itemId of movedAllDescendantIds) {
        let parentId = itemId;
        let distance = 0;
        while (parentId) {
          closureInsertParamsList.push([parentId, itemId, distance++]); // 先插入自己与自己的关联
          // eslint-disable-next-line no-await-in-loop
          [{ parentId }] = await runInTransaction.query(`
            select parent_id as parentId from ${table} where id = ?
          `, [parentId]);
        }
      }
      await runInTransaction.query(`
        insert into ${closureTable} (id_ancestor, id_descendant, distance)
        values ${closureInsertParamsList.map(() => '(?, ?, ?)').join(',')}
      `, closureInsertParamsList.flat());

      return true;
    });
  }
}

/**
 * 权限 RightService 相关 sql: 基于 closure-table + parentId 方案
 *
 * GTE: greater than or equal
 */
interface SQLClosureTable {
  // insertOne 新增相关 sql
  /**
   * 根据 id 查找父 id, 参数: [id]
   */
  queryParentId: string;
  /**
   * 插入 closure 记录, 参数: [id_ancestor, id_descendant, distance]
   */
  insertClosure: string;
  /**
   * 根据 id 查找 父id 和 sortOrder, 参数: [id]
   */
  queryParentIdAndSortOrder: string;
  /**
   * 查找顶层的下个 sortOrder, 参数: []
   */
  queryNextSortOrderTopLevel: string;
  /**
   * 查找非顶层的同级别中的下个 sortOrder, 参数: [parentId]
   */
  queryNextSortOrderSameLevel: string;
  /**
   * 查找 >= 当前 sortOrder 的所有记录的 id, 参数: [sortOrder]
   */
  queryIdsGTESortOrderTopLevel: string;
  /**
   * 查找 >= 当前 sortOrder 的所有记录的 id, 参数: [parentId, sortOrder]
   */
  queryIdsGTESortOrderSameLevel: string;
  /**
   * 将所有的 sortOrder + 1, 参数: [idList]
   */
  updateOrderAdd1: string;


  // searchCascade 查询相关 sql
  /**
   * 查询未删除的第一层数据, 即 parentId 不存在, 排序: sortOrder desc
   */
  queryTopLevel: string;
  queryTopLevelInIds: string;
  /**
   * 查询某个 id 的所有子孙的 id 列表, 参数: [id]
   */
  queryTopLevelItemAllChildsId: string;
  queryTopLevelItemAllChildsIdInIds: string;
  /**
   * 根据 id 数组查询所有未删除项, 参数: [idList]
   */
  queryByIdList: string;
  queryByIdListInIds: string;


  // 删除相关
  queryCascadeChildIdList: string;
  markDeleteByIds: string;

  // 启用禁用相关
  updateEnableByIds: string;
}
