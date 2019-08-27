# cos-uppy-plugin

一个 Uppy 插件，解决腾讯云 COS 的上传问题，目前还不完善。已完成基本的 腾讯云 COS 临时

## 安装方式

```shell
yarn add cos-uppy-plugin
```

### Typescript 使用前

```typescript
declare module "cos-uppy-plugin" { let anything: any; export = anything }
```

## 使用方式

1. 首先请查阅 Uppy 文档，了解 Uppy 的基本API.
2. 集成插件到你 Uppy 对象

```js
uppy.use(cosUppy, {
    bucket: 'bucket-12345678', // bucket id
    region: 'ap-beijing', // 所属 区域
    stsUrl: 'http://127.0.0.1:6275/cos/1256314360/upload/url', // STS API URL
    protocol: 'http'
})
```

|   属性   | 说明                                             |
| :------: | ------------------------------------------------ |
|  bucket  | 腾讯云 COS bucket id                             |
|  region  | 腾讯云 COS 所属区域                              |
|  stsUrl  | 获取 “临时上传URL” 的（暂时不支持 sts 临时签名） |
| protocol | 使用协议                                         |



### stsUrl

此部分与本插件无关，以下只说明上传原理。你需要获取 `mark` 线上项目的 url 地址。 

原目的为 sts 临时 secret key 签发的获取地址，但因项目需要我们使用 获取 tokenURL（临时上传地址） 的方式上传。stsUrl 后端TokenURL生成逻辑目前在`mark` 项目中。根据腾讯云文档 https://cloud.tencent.com/document/product/436/36121 开发。

