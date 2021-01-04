import { Get, JsonController } from 'routing-controllers';
import DemoUserService from '../../service/demo/DemoUserService';
import { Inject } from 'typedi';

@JsonController('demo/user')
export default class DemoUserController {

  @Inject(DemoUserService.name)
  private readonly demoUserService: DemoUserService;

  @Get('/a')
  aaa() {
    return 'a'
  }

  @Get('/list')
  async list() {
    return await this.demoUserService.listAll()
  }

}
