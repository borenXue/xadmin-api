import {
  Entity, Column, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';

import { Length, IsIn } from 'class-validator';
import Container from 'typedi';
import { AppConfig } from '../../util/app-config';
import BaseEntity from '../BaseEntity';

const config: AppConfig = Container.get(AppConfig);

@Entity({
  name: config.tables.core_right,
  orderBy: {
    sortOrder: 'ASC',
  },
})
export default class RightEntity extends BaseEntity {
  @Column()
  @Length(3)
  name: string

  @Column()
  @Length(3)
  code: string

  @Column('enum')
  @IsIn(['page', 'page-dir', 'button', 'interface', 'database'])
  type: 'page' | 'page-dir' | 'button' | 'interface' | 'database'

  @Column()
  url: string

  @Column({ nullable: true })
  icon: string

  @Column({ nullable: true })
  tip: string

  @Column({ nullable: true })
  description: string

  @Column()
  enable: boolean

  @Column()
  sortOrder: number

  @OneToMany(() => RightEntity, 'parent_id')
  children: RightEntity[]

  isLeaf: boolean

  @ManyToOne(() => RightEntity, (type) => type.children)
  @JoinColumn({ name: 'parent_id' })
  parent: RightEntity
}
