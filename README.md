# xadmin-api

基于 `typescript` 的通用的 NodeJS API 项目, [接口文档](https://documenter.getpostman.com/view/4200940/SWLccU5u?version=latest)

* [API 文档](https://documenter.getpostman.com/view/4200940/SWLccU5u): 选择右上角的「Run in Postman」可直接调起本地的 postman 应用, 并自动导入

### 本地配置与运行

* 安装 mysql 8 && root 用户登录后使用依次执行以下 sql
  * `resources/sql/init-db.sql` 初始化数据库与用户
  * `resources/sql/init-auth-table.sql` 初始化表结构 && 基础数据
* 启动项目: `npm install && npm start`
* enjoy ~_~

### 相关技术

* 数据库: `Mysql`、`redis`(缓存, 可选)
* 开发语言: `TypeScript`
* 核心第三方库:
  * web 框架: [`express`](http://expressjs.com.cn) && [`routing-controllers`](https://github.com/typestack/routing-controllers)
  * ORM 框架: [`typeorm`](https://typeorm.io)
  * 其他: 依赖注入 `typedi`、缓存管理 [`cache-manager`](https://github.com/BryanDonovan/node-cache-manager#readme)
  * 开发、部署辅助工具: nodemon、concurrently、pm2

### TODO

* 与 xadmin-web 的集成测试, 尤其是 RightController 的 move 接口
* 添加日志支持
* 接口优化
  * 登录失效规则: 最后一次请求接口的 30 分钟后失效 而不是登录的30分钟后
  * 删除操作校验: 有级联无法处理时, 直接报错, eg: 删除权限、角色时, 检查是否有用户、角色已配置该项
  * 事务控制全部移至 controller 层或 request 层面
  * 部分操作考虑给表加锁
* 代码模块职责划分清晰 - 代码检查梳理
  * controller: 参数校验、结果包装、任务分发、事务控制、
  * service: 干活, 简单点
  * 登录校验、接口权限校验: authorizationChecker
* 第三方库的 typescript 定义编写: `cache-manager-redis-store`
