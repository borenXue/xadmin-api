import HelloController from './demo/HelloController';
import DemoHeaderController from './demo/DemoHeaderController';
import DemoParamController from './demo/DemoParamController';
import DemoUserController from './demo/DemoUserController';

import AuthController from './auth/AuthController';
import RightController from './auth/RightController';
import RoleController from './auth/RoleController';
import UserController from './auth/UserController';

export default [
  // auth 模块: auth/*
  AuthController,
  RightController,
  RoleController,
  UserController,
  // demo 模块: demos/*
  DemoParamController,
  DemoHeaderController,
  HelloController,
  DemoUserController,
];
