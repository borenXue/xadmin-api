-- 本地 创建数据库与用户 && 用户授权 (MySQL 8.0.16)
drop database if exists `xadmin`;
create database `xadmin` default charset utf8 collate utf8_general_ci;

drop user IF EXISTS uxadmin@'localhost';
create user 'uxadmin'@'localhost' identified by 'pxadmin';
grant all on `xadmin`.* TO 'uxadmin'@'localhost' with grant option;

flush privileges;
