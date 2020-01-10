import {
  PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, VersionColumn, Column,
} from 'typeorm';

import { TransformerDateNumber } from '../util/index';

export default abstract class BaseEntity {
  // @Min(1) TODO: 新增时不需要 id, 更新时需要 id 是否可实现
  @PrimaryGeneratedColumn()
  id: number

  constructor(id?: number) {
    if (typeof id === 'number') this.id = id;
  }

  @CreateDateColumn({
    type: 'datetime',
    update: false,
    transformer: TransformerDateNumber,
  })
  createTime: number

  @Column({
    nullable: true,
  })
  createUserId: number

  createUserName: string

  @UpdateDateColumn({
    type: 'datetime',
    transformer: TransformerDateNumber,
  })
  updateTime: number

  @Column({
    nullable: true,
  })
  updateUserId: number

  updateUserName: string

  @VersionColumn()
  version: number
}
