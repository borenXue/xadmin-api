import DemoUserEntity from "../../entity/demo/DemoUserEntity";
import { Service } from "typedi";
import { Connection, Repository } from "typeorm";
import { InjectConnection, InjectRepository } from "typeorm-typedi-extensions";

@Service('DemoUserService')
export default class DemoUserService {

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectRepository(DemoUserEntity) private readonly repository: Repository<DemoUserEntity>,
  ) {}

  async listAll() {
    return this.repository.find()
  }

}
