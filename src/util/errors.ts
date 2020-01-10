/* eslint-disable import/prefer-default-export */
import { HttpError } from 'routing-controllers';

export class ExpectedError extends HttpError {
  name = 'ExpectedError'

  constructor(msg?: string) {
    super(400);
    Object.setPrototypeOf(this, ExpectedError.prototype);
    if (msg) this.message = msg;
  }
}
