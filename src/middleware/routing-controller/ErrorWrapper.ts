import {
  ExpressErrorMiddlewareInterface, Middleware, BadRequestError, UnauthorizedError,
} from 'routing-controllers';
import { Response, Request } from 'express';
import { ExpectedError } from '../../util/errors';

@Middleware({ type: 'after' })
export default class ErrorWrapper implements ExpressErrorMiddlewareInterface {
  error(error: any, request: Request, response: Response, next: (err?: any) => any) {
    if (typeof error === 'object' && error instanceof Error) {
      console.log(error);
      const res: any = {
        success: false,
        info: error.message,
        data: null,
        code: (error as any).httpCode || 500,
        stack: error.stack,
      };
      // class-validator 校验失败后抛出的错误
      if (error instanceof BadRequestError && (error as any).errors) {
        res.stack = (error as any).errors;
      }

      if (error instanceof ExpectedError || error instanceof UnauthorizedError) {
        delete res.stack;
      }

      response.setHeader('api-error', encodeURIComponent(res.message || ''));
      if (res.code === 401) response.status(401);
      response.send(res);
    } else {
      next(error);
    }
  }
}
