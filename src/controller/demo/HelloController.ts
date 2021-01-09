import { Get, JsonController, QueryParam } from "routing-controllers";

@JsonController()
export default class HelloController {

  @Get()
  helloWorld() {
    return {
      val: 'hello world ~_~',
    };
  }

  @Get('slow')
  slowRequest(@QueryParam('count') count: number = 10000) {
    for (let i = 0; i < count; i++) {
      if (i % 500 === 0) {
        console.log('slow api: ', count, i)
      }
    }
    return count
  }

}
