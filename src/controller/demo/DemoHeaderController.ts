import { JsonController, Get, Res } from 'routing-controllers';
import { Response } from 'express';

@JsonController('demo/header')
export default class DemoHeaderController {
  // 直接使用浏览器地址栏打开即可下载附件
  //  http://localhost:10060/demo/header/attachment
  @Get('/attachment')
  attachment(@Res() res: Response) {
    res.attachment('demo-header-attachment.json');
    return {
      isFile: true,
    };
  }
}
