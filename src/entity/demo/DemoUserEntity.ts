import { AppConfig } from "../../util/app-config";
import Container from "typedi";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


const config: AppConfig = Container.get(AppConfig);

@Entity({
  name: config.tables.demo_user
})
export default class DemoUserEntity {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ name: 'nick_name' })
  nickName: string;

}
