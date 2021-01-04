import { Get, JsonController } from "routing-controllers";

@JsonController()
export default class HelloController {

  @Get()
  helloWorld() {
    return {
      val: 'hello world ~_~',
    };
  }

}
