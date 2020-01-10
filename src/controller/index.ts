import DemoParamController from './demo/DemoParamController';
import AuthController from './auth/AuthController';
import RightController from './auth/RightController';
import RoleController from './auth/RoleController';
import UserController from './auth/UserController';
import DemoHeaderController from './demo/DemoHeaderController';

export default [
  // auth 模块: auth/*
  AuthController,
  RightController,
  RoleController,
  UserController,
  // demo 模块: demos/*
  DemoParamController,
  DemoHeaderController,
];
