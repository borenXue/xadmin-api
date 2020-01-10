import {
  Column, RelationId, ManyToMany, Entity, JoinTable,
} from 'typeorm';
import { MinLength } from 'class-validator';
import Container from 'typedi';
import { AppConfig } from '../../util/app-config';
import RightEntity from './RightEntity';
import BaseEntity from '../BaseEntity';

const config: AppConfig = Container.get(AppConfig);

@Entity(config.tables.core_role)
export default class RoleEntity extends BaseEntity {
  @Column()
  @MinLength(2)
  name: string

  @Column()
  code: string

  @Column()
  description: string

  @Column()
  enable: boolean

  // TODO: onUpdate: 'CASCADE'  + repo.update() 并未生效
  // cascade 代表的是, 如果 rights 不存在时, 动态插入
  @ManyToMany(() => RightEntity, {
    cascade: false,
  })
  @JoinTable({
    name: config.tables.core_ref_role_right,
    joinColumn: { name: 'role_id' },
    inverseJoinColumn: { name: 'right_id' },
  })
  rights: RightEntity[]

  @RelationId((type: RoleEntity) => type.rights)
  rightIds: []
}
