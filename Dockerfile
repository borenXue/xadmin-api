# alinode版本       nodejs版本
# 4.7.2             10.15.3

# 阿里云 NodeJS 性能平台 应用信息
# App Name：xadmin-api-sae
# App ID：87310
# App Secret：42ec14d530bc8dbb1a0e837eafbc1d79bbecbbe4

# FROM registry.cn-hangzhou.aliyuncs.com/xbr-devopts/node:10
FROM registry.cn-hangzhou.aliyuncs.com/aliyun-node/alinode:4.7.2
# TODO: registry-vpc 为什么会加载失败
# FROM registry-vpc.cn-hangzhou.aliyuncs.com/aliyun-node/alinode:4.7.2

RUN npm config set registry https://registry.npm.taobao.org

WORKDIR /usr/src/app

# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY package*.json ./
COPY agenthub-running.json /root/app-config.json

# 安装项目依赖包
RUN npm install

COPY . .

RUN npm run build:test

EXPOSE 8080
CMD ["npm", "run", "run:test"]
