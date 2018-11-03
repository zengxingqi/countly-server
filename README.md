# 开箱即用，自由配置
本项目是为了使countly-server适用于本地调试和编译打包，最终pm2部署线上服务器。

## 安装使用
### 1. 安装项目依赖
` cd 20181102 && yarn `
### 2. 打包静态资源
` npm run grunt:task `
### 3. 启用mongodb服务
` mongod `
### 4. 启用API服务
` npm run api `
### 5. 启用server服务
` npm run server `
### 6. 浏览器访问
` http://localhost:6001 `
或
` http://127.0.0.1:6001 `

## 说明
如果本项目对你有价值，请帮忙点个Star，谢谢！
附上中文文档https://resources.count.ly/v2.0/docs

## 补充
源代码和社区版权请访问https://github.com/Countly/countly-server
