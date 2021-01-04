use xadmin;

-- 删除所有表: 后台权限设计
drop table if exists `core_admin_refs_user_role`;
drop table if exists `core_admin_user`;
drop table if exists `core_admin_refs_role_right`;
drop table if exists `core_admin_role`;
drop table if exists `core_admin_right_closure`;
drop table if exists `core_admin_right`;
drop table if exists `demo_user`;

-- -------------------------------------------------------
-- ------------------------  后台权限设计
-- -------------------------------------------------------
-- 权限表
create table `core_admin_right` (
  `id` bigint unsigned primary key not null auto_increment,
  `name` varchar(50) not null comment "必填-权限名: 可用作按钮名、目录名、页面名等",
  `code` varchar(50) not null comment "必填-权限 code, 定义后可改变, 必须保证唯一性 (move 操作的可靠性考虑 & 前端路由的编写规则要求)",
  `url` varchar(50) default null comment "页面或模块对应的前端访问地址, page.url = pageDir.url + page.url",
  `type` enum('page', 'page-dir', 'button', 'database', 'interface') not null comment "必填-权限类型",
  `icon` varchar(255) default null comment "权限 icon: 只针对页面类型的权限设置, 可为 icon 或图片(是否有必要支持图片, 若图片不规范, 可能会导致最终展示的页面很丑)",
  `tip` varchar(255) default null comment "权限在页面中的特别提示文案, 一般用于页面按钮类型",
  `description` varchar(255) default null comment "权限的详细描述",
  `is_enable` tinyint(1) unsigned default 1 not null comment "是否启用, 默认启用",
  `is_delete` tinyint(1) unsigned default 0 comment "是否已删除, 默认未删除",
  `parent_id` bigint unsigned default null comment "父 ID",
  `sort_order` int(11) default 0 comment "用于同级排序",
  `create_time` timestamp(3) not null default CURRENT_TIMESTAMP(3),
  `create_user_id` bigint unsigned,
  `update_time` timestamp(3) not null default CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `update_user_id` bigint unsigned,
  `version` bigint unsigned,
  -- code 不可修改, 否则 move 操作时容易报错
  unique key `uk_core_admin_right_code` (`code`),
  unique key `uk_core_admin_right_sortorder_parentid` (`parent_id`, `sort_order`),
  index (`type`),
  index (`code`),
  index (`is_enable`),
  index (`is_delete`)
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci
comment="权限表, 支持级联 - Closure Table 模式 + parent_id";

create table `core_admin_right_closure` (
  `id_ancestor` bigint unsigned not null comment "祖先 - 上级节点的 ID",
  `id_descendant` bigint unsigned not null comment "子代 - 下级节点的 ID",
  `distance` bigint unsigned default null comment "距离 - 子代到祖先中间隔了几级",
  primary key (`id_ancestor`,`id_descendant`),
  constraint `fk_core_admin_right_closure_descendant` foreign key (`id_descendant`) references `core_admin_right` (`id`),
  constraint `fk_core_admin_right_closure_ancestor` foreign key (`id_ancestor`) references `core_admin_right` (`id`)
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci;

-- 角色表
create table `core_admin_role` (
  `id` bigint unsigned primary key not null auto_increment,
  `name` varchar(50) not null comment "角色名",
  `code` varchar(50) not null comment "角色 code, 定义后不可更改, 可能会以硬编码的方式植入到代码中来控制接口的访问权限",
  `description` varchar(255) default null comment "权限的详细描述",
  `is_enable` tinyint(1) unsigned default 1 not null comment "是否启用, 默认启用",
  `is_delete` tinyint(1) unsigned default 0 comment "是否已删除, 默认未删除",
  `create_time` timestamp(3) not null default CURRENT_TIMESTAMP(3),
  `create_user_id` bigint unsigned,
  `update_time` timestamp(3) not null default CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `update_user_id` bigint unsigned,
  `version` bigint unsigned,
  unique key `uk_core_admin_role_code` (`code`),
  index (`is_enable`),
  index (`is_delete`),
  index (`name`)
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci
comment="角色表, 不支持分组或级联";

create table `core_admin_refs_role_right` (
  `role_id` bigint unsigned not null comment "角色 ID",
  `right_id` bigint unsigned not null comment "权限 ID, 可能为单个权限, 也可能为权限组",
  primary key (role_id, right_id),
  constraint fk_core_admin_refs_role_right_roleid foreign key (role_id) references core_admin_role(id),
  constraint fk_core_admin_refs_role_right_rightid foreign key (right_id) references core_admin_right(id),
  `create_time` timestamp(3) not null default CURRENT_TIMESTAMP(3),
  `create_user_id` bigint unsigned,
  `update_time` timestamp(3) not null default CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `update_user_id` bigint unsigned,
  `version` bigint unsigned
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci
comment="角色权限关系表, 用于定义某个角色有哪些权限";

-- 用户表
create table `core_admin_user` (
  `id` bigint unsigned primary key not null auto_increment,
  `user_name` varchar(20) not null comment "必填-用户真实姓名",
  `login_name` varchar(20) not null comment "用户登录账号",
  `cellphone` varchar(30) comment "用户手机号",
  `email` varchar(30) comment "用户邮箱-用于找回密码",
  `is_enable` tinyint(1) unsigned default 1 comment "是否启用, 默认不启用",
  `is_delete` tinyint(1) unsigned default 0 comment "是否已删除, 默认未删除",
  `password` varchar(32) default "e10adc3949ba59abbe56e057f20f883e" comment "用户登录密码, 默认密码: md5('123456')",
  `create_time` timestamp(3) not null default CURRENT_TIMESTAMP(3),
  `create_user_id` bigint unsigned,
  `update_time` timestamp(3) not null default CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `update_user_id` bigint unsigned,
  `version` int(5),
  unique key `uk_core_admin_user_loginname` (`login_name`),
  index (`user_name`),
  index (`cellphone`),
  index (`email`),
  index (`is_enable`),
  index (`is_delete`)
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci
comment="用户表";

create table `core_admin_refs_user_role` (
  `user_id` bigint unsigned not null comment "用户 ID",
  `role_id` bigint unsigned not null comment "角色 ID",
  primary key (`user_id`, `role_id`),
  constraint fk_userrole_user foreign key (`user_id`) references core_admin_user(id),
  constraint fk_userrole_role foreign key (`role_id`) references core_admin_role(id),
  `create_time` timestamp(3) not null default CURRENT_TIMESTAMP(3),
  `create_user_id` bigint unsigned,
  `update_time` timestamp(3) not null default CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `update_user_id` bigint unsigned,
  `version` int(5)
) engine=innodb auto_increment=1
default charset=utf8 collate=utf8_general_ci
comment="用户角色关联表";


-- 基础权限数据初始化
insert into `core_admin_right` (name, code, url, type, `parent_id`, `sort_order`)
values ('用户权限管理', 'auth_group', '/auth', 'page-dir', null, 0),
  ('用户管理', 'auth_user', '/auth/user', 'page', 1, 0),
  ('角色管理', 'auth_role', '/auth/role', 'page', 1, 1),
  ('权限管理', 'auth_right', '/auth/right', 'page', 1, 2);

insert into `core_admin_right_closure` (`id_ancestor`, `id_descendant`, distance)
values (1,1,0),(2,2,0),(3,3,0),(4,4,0),
  (1,2,1), (1,3,1), (1,4,1);

-- 初始化角色数据
insert into `core_admin_role` (name, code)
values ('系统管理员', 'SYSTEM_ADMIN'), ('用户管理员', 'USER_ADMIN');

insert into `core_admin_refs_role_right` (`role_id`, `right_id`)
values (1, 1), (1, 2), (1, 3), (1, 4),
  (2, 1), (2, 2), (2, 3), (2, 4);

-- 初始化系统用户
insert into `core_admin_user` (user_name, login_name)
values ('系统管理员', 'system-admin'), ('最高级管理员', 'super-admin'), ('用户管理员', 'admin');

insert into `core_admin_refs_user_role` (user_id, role_id)
values (1, 1), (2, 1), (2, 2), (3, 2);


create table `demo_user` (
  `id` bigint unsigned primary key not null auto_increment,
  `name` varchar(20) not null,
  `nick_name` varchar(50) not null
) engine=innodb auto_increment=1 default charset=utf8 collate=utf8_general_ci comment="测试表";
insert into `demo_user` values(null, '小明', 'xiao ming'), (null, '小红', 'xiao hong');
