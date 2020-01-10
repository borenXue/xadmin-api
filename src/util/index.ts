/* eslint-disable import/prefer-default-export */

export const TransformerDateNumber = {
  from: (value?: Date) => (!value ? value : new Date(value).getTime()),
  to: (value?: number) => (value ? new Date(value) : new Date()),
};
