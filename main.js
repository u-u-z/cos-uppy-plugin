const { Plugin } = require('@uppy/core')
const cuid = require('cuid')
const cos = require('cos-js-sdk-v5')
class CosUppy extends Plugin {
    constructor(uppy, opts) {
        super(uppy, opts)
        this.id = opts.id || 'UppyCos'
        this.type = 'example'
        this.uploader = this.uploader.bind(this)
        this.bucket = opts.bucket || 'test'
        this.region = opts.region || 'test'
        this.stsUrl = opts.stsUrl || 'test'
        this.protocol = location.protocol === 'https:' ? 'https:' : 'http:'
        this.prefix = this.protocol + '//' + this.bucket + '.cos.' + this.region + '.myqcloud.com/'
        uppy.on('file-added', (file) => {
            console.log('Added file', file)
        })
    }

    getOptions(file) {
        const overrides = this.uppy.getState().xhrUpload
        const opts = {
            ...this.opts,
            ...(overrides || {}),
            ...(file.xhrUpload || {}),
            headers: {}
        }
        Object.assign(opts.headers, this.opts.headers)
        if (overrides) {
            Object.assign(opts.headers, overrides.headers)
        }
        if (file.xhrUpload) {
            Object.assign(opts.headers, file.xhrUpload.headers)
        }

        return opts
    }

    camSafeUrlEncode(str) {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    uploader(fileIDs) {
        if (fileIDs.length === 0) {
            this.uppy.log('[XHRUpload] No files to upload!')
            return Promise.resolve()
        }
        this.uppy.log('[XHRUpload] Uploading...')
        const files = fileIDs.map((fileID) => this.uppy.getFile(fileID))
        return this.uploadFiles(files).then(() => null)
    }

    uploadFiles(files) {
        const actions = files.map((file, i) => {
            const current = parseInt(i, 10) + 1
            const total = files.length

            if (file.error) {
                return () => Promise.reject(new Error(file.error))
            } else if (file.isRemote) {
                return () => Promise.reject(new Error("暂时只支持本地文件上传"))
            } else {
                return this.authorizationAndUpdate(file, current, total)
            }
        })
    }

    // 获取签名
    async getAuthorization(options, cb) {
        return new Promise((resolve, reject) => {
            var url = this.stsUrl
            //var url = '../server/sts.php';
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var credentials;
                        try {
                            credentials = (new Function('return ' + xhr.responseText))().credentials;
                        } catch (e) { }
                        if (credentials) {
                            cb(null, {
                                XCosSecurityToken: credentials.sessionToken,
                                Authorization: CosAuth({
                                    SecretId: credentials.tmpSecretId,
                                    SecretKey: credentials.tmpSecretKey,
                                    Method: options.Method,
                                    Pathname: options.Pathname,
                                })
                            }).then(resolve())
                        } else {
                            console.error(xhr.responseText);
                            cb('获取签名出错').then(reject());
                        }
                    } else {
                        cb('获取签名出错').then(reject());
                    }
                }
            };
            xhr.send();
        })
    };

    uploadFile(file, callback) {
        var Key = 'dir/' + file.name;

        this.getAuthorization({ Method: 'POST', Pathname: '/' }, (err, info) => {
            return new Promise((resolve, reject) => {
                var fd = new FormData();
                fd.append('key', Key);
                fd.append('Signature', info.Authorization);
                fd.append('Content-Type', '');

                info.XCosSecurityToken && fd.append('x-cos-security-token', info.XCosSecurityToken);
                fd.append('file', file);

                var url = this.prefix;
                var xhr = new XMLHttpRequest();

                xhr.open('POST', url)

                xhr.upload.onprogress = (e) => {
                    console.log('上传进度 ' + (Math.round(e.loaded / e.total * 10000) / 100) + '%');
                };

                xhr.onload = () => {
                    console.log("上传成功")
                    resolve();

                };

                xhr.onerror = () => {
                    callback('文件 ' + Key + ' 上传失败，请检查是否没配置 CORS 跨域规则');
                    reject();
                };

                xhr.send(fd);
            })

        });
    };


    authorizationAndUpdate(file, current, total) {
        const opts = this.getOptions(file)

        return new Promise((resolve, reject) => {
            file && this.uploadFile(file, function (err, data) {
                if (err) {
                    reject()
                } else {
                    resolve()
                    console.log(err || data);
                    console.log(上传成功);
                }
            });
        })
    }

    install() {
        this.uppy.addUploader(this.uploader)
    }

    uninstall() {
        this.uppy.removeUploader(this.uploader)
    }
}

window.CosUppy = CosUppy