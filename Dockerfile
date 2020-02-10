FROM node:10

RUN npm config set registry https://registry.npm.taobao.org

WORKDIR /usr/src/app

# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY package*.json ./

# 安装项目依赖包
RUN npm install

COPY . .

RUN npm run build:test

EXPOSE 8080
CMD ["npm", "run", "run:test"]
