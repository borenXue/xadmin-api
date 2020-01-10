import { InterceptorInterface, Action, Interceptor } from 'routing-controllers';

@Interceptor()
class ResponseWrapper implements InterceptorInterface {
  intercept(action: Action, result: any) {
    return {
      success: true,
      code: 200,
      info: '',
      data: result,
    };
  }
}

export default [
  ResponseWrapper,
];
