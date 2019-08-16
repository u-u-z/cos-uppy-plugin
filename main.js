const { Plugin } = require('@uppy/core')
const cuid = require('cuid')
const cosAuth = require('./cos-auth')
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
        uppy.on('upload-progress', (file, progress) => {
            // file: { id, name, type, ... }
            // progress: { uploader, bytesUploaded, bytesTotal }
            console.log(file.id, progress.bytesUploaded, progress.bytesTotal)
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

        return this.uploadFiles(files)
    }

    uploadFiles(files) {
        const actions = files.map((file, i) => {
            const current = parseInt(i, 10) + 1
            const total = file.length

            if (file.error) {
                return () => Promise.reject(new Error(file.error))
            } else if (file.isRemote) {
                return () => Promise.reject(new Error("暂时只支持本地文件上传"))
            } else {
                return this.authorizationAndUpdate(file, current, total)
            }
        })
    }

    getTokenUrl(file, current, total) {
        const opts = this.getOptions(file)
        // Get Token Url
        let xhr = new XMLHttpRequest();
        let fileSize = file.size
        let url = this.stsUrl
        let key = file.name
        return new Promise((resolve, reject) => {
            xhr.open('GET', `${url}?key=${key}&contentLength=${fileSize}`, true);
            xhr.onreadystatechange = (e) => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    try {
                        let tokenUrl = JSON.parse(`${xhr.responseText}`)
                        resolve(tokenUrl.token, fileSize)
                    } catch (e) {
                        reject()
                    }
                }
            }
            xhr.send()
        })
    }
    putFile(file, tokenUrl) {
        let xhr = new XMLHttpRequest();
        let url = tokenUrl;
        return new Promise((resolve, reject) => {
            xhr.open('PUT', `${url}`, true)
            xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve()
                    } else {
                        reject(new Error('test'))
                    }
                }
            }
            xhr.send(file.data)
        })
    }

    authorizationAndUpdate(file, current, total) {

        return new Promise((resolve, reject) => {
            this.getTokenUrl(file, current, total).then((tokenUrl) => {
                this.putFile(file, tokenUrl).then(() => {
                    resolve()
                }).catch(() => {
                    reject()
                })
            })
            // this.getTokenUrl(file, current, total).then((tokenUrl) => {
            //     this.putFile(file, tokenUrl).then(() => {
            //         resolve()
            //     })
            // }).catch((e) => {
            //     console.error(`authorizationAndUpdate: reject`, e)
            //     reject()
            // })
        })




    }

    install() {
        this.uppy.addUploader(this.uploader)
    }

    uninstall() {
        this.uppy.removeUploader(this.uploader)
    }
}

/*
    if(typeof module === 'object'){
        module.exports = CosAuth;
    }else{
        window.CosAuth = CosAuth;
    }
*/

window.CosUppy = CosUppy
window.LocalUppy = {
    strings: {
        // When `inline: false`, used as the screen reader label for the button that closes the modal.
        closeModal: '关闭模块',
        // Used as the screen reader label for the plus (+) button that shows the “Add more files” screen
        addMoreFiles: '添加更多文件',
        // Used as the header for import panels, e.g., "Import from Google Drive".
        importFrom: '引入来自 %{name}',
        // When `inline: false`, used as the screen reader label for the dashboard modal.
        dashboardWindowTitle: '图片上传窗口（按下 ESC 关闭）',
        // When `inline: true`, used as the screen reader label for the dashboard area.
        dashboardTitle: '图片上传',
        // Shown in the Informer when a link to a file was copied to the clipboard.
        copyLinkToClipboardSuccess: '链接已复制到粘贴板.',
        // Used when a link cannot be copied automatically — the user has to select the text from the
        // input element below this string.
        copyLinkToClipboardFallback: '复制以下网址',
        // Used as the hover title and screen reader label for buttons that copy a file link.
        copyLink: '复制链接',
        // Used as the hover title and screen reader label for file source icons, e.g., "File source: Dropbox".
        fileSource: '文件来源: %{name}',
        // Used as the label for buttons that accept and close panels (remote providers or metadata editor)
        done: '完成',
        // Used as the screen reader label for buttons that remove a file.
        removeFile: '删除文件',
        // Used as the screen reader label for buttons that open the metadata editor panel for a file.
        editFile: '编辑文件',
        // Shown in the panel header for the metadata editor. Rendered as "Editing image.png".
        editing: '正在编辑 %{file}',
        // Text for a button shown on the file preview, used to edit file metadata
        edit: '编辑',
        // Used as the screen reader label for the button that saves metadata edits and returns to the
        // file list view.
        finishEditingFile: '完成文件编辑',
        // Used as the label for the tab button that opens the system file selection dialog.
        myDevice: '本地上传',
        // Shown in the main dashboard area when no files have been selected, and one or more
        // remote provider plugins are in use. %{browse} is replaced with a link that opens the system
        // file selection dialog.
        dropPasteImport: '将文件拖进来, 粘贴, %{browse} 或寻找目录引入',
        // Shown in the main dashboard area when no files have been selected, and no provider
        // plugins are in use. %{browse} is replaced with a link that opens the system
        // file selection dialog.
        dropPaste: '将文件拖进来, 粘贴 or %{browse}',
        // This string is clickable and opens the system file selection dialog.
        browse: '浏览',
        // Used as the hover text and screen reader label for file progress indicators when
        // they have been fully uploaded.
        uploadComplete: '上传完成',
        // Used as the hover text and screen reader label for the buttons to resume paused uploads.
        resumeUpload: '继续上传',
        // Used as the hover text and screen reader label for the buttons to pause uploads.
        pauseUpload: '暂停上传',
        // Used as the hover text and screen reader label for the buttons to retry failed uploads.
        retryUpload: '重试上传',

        // Used in a title, how many files are currently selected
        xFilesSelected: {
            0: '%{smart_count} 文件已选择',
            1: '%{smart_count} 所有文件已选择'
        },

        // @uppy/status-bar strings:
        uploading: '正在上传',
        complete: '完成'
        // ...etc
    }
}