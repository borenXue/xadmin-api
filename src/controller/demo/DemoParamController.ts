/* eslint-disable max-classes-per-file */
import {
  JsonController, Post, Params, QueryParams, CookieParams, HeaderParams, Get, Body,
  UploadedFiles, // eslint-disable-line @typescript-eslint/no-unused-vars
} from 'routing-controllers';
import { IsNumber } from 'class-validator';

class Person {
  name: string

  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
    maxDecimalPlaces: 2,
  }, {
    message: '必须是数字',
  })
  age: number

  birthDate: Date
}

@JsonController('demos/params')
export default class DemoParamController {
  @Get('/hello-world')
  helloWorld() {
    return {
      val: 'hello world ~_~',
    };
  }

  @Get('/get-to-object')
  paramToObject(
    @QueryParams({ required: true }) person: Person,
  ) {
    return {
      ...person,
      // birthDateTime: person.birthDate.getTime()
    };
  }

  @Post('/file-info')
  paramsFile(
    // 如果其他 filed 字段有对应的文件, 则会报错: MulterError: Unexpected field
    @UploadedFiles('abc') files: any = [],
  ) {
    const res = [];
    for (const file of files) {
      const { buffer } = file;
      file.buffer = {
        length: buffer.length,
        byteLength: buffer.byteLength,
        byteOffset: buffer.byteOffset,
      };
      res.push(file);
    }
    return res;
  }

  @Post('/all/:type/:key')
  allPostParams(
    @Params() params: any,
    @QueryParams() queryParams: any,
    // 依赖 cookie-parser
    @CookieParams() cookieParams: any,
    @HeaderParams() headerParams: any,
    // 依赖 body-parser
    // 支持 multipart/form-data、application/x-www-form-urlencoded、application/json
    // form-data 类型参数依赖 multer (安装即可, 不用 app.use)
    @Body() body: any,
  ) {
    return {
      body,
      params,
      queryParams,
      cookieParams,
      headerParams,
    };
  }
}
