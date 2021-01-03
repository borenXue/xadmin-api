-- 本地 创建数据库与用户 && 用户授权 (MySQL 8.0.16)
drop database if exists `xadmin`;
drop user IF EXISTS uxadmin@'localhost';
drop user IF EXISTS uxadmin@'%';

create database `xadmin` default charset utf8 collate utf8_general_ci;
create user 'uxadmin'@'localhost' identified by 'pXadmin_110';
create user 'uxadmin'@'%' identified by 'pXadmin_110';

grant all on `xadmin`.* TO 'uxadmin'@'localhost' with grant option;
grant all on `xadmin`.* TO 'uxadmin'@'%' with grant option;

flush privileges;
