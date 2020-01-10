import {
  Column, RelationId, ManyToMany, Entity, JoinTable,
} from 'typeorm';
import Container from 'typedi';
import { AppConfig } from '../../util/app-config';
import BaseEntity from '../BaseEntity';
import RoleEntity from './RoleEntity';

const config: AppConfig = Container.get(AppConfig);

@Entity(config.tables.core_user, {
  orderBy: {
    updateTime: 'DESC',
  },
})
export default class UserEntity extends BaseEntity {
  @Column()
  userName: string

  @Column()
  loginName: string

  @Column()
  cellphone: number

  @Column()
  email: string

  @Column({
    select: false,
    update: false,
  })
  password: string

  @Column()
  enable: boolean

  @ManyToMany(() => RoleEntity, {
    cascade: false,
  })
  @JoinTable({
    name: config.tables.core_ref_user_role,
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: RoleEntity[]

  @RelationId((type: UserEntity) => type.roles)
  roleIds: number[]
}
