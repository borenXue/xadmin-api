/* eslint-disable import/prefer-default-export */
import { createParamDecorator } from 'routing-controllers';
import Container from 'typedi';
import { AppConfig } from './app-config';

// TODO: 不存在时需要抛出异常
export function CookieAuthToken(required?: boolean) {
  return createParamDecorator({
    required,
    value: (action) => action.request.cookies[Container.get(AppConfig).express.authTokenCookie.key],
  });
}
