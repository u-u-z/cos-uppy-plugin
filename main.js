const { Plugin } = require('@uppy/core')
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
                // We emit upload-started here, so that it's also emitted for files
                // that have to wait due to the `limit` option.
                this.uppy.emit('upload-started', file)
                return this.uploadRemote.bind(this, file, current, total)
            } else {
                this.uppy.emit('upload-started', file)
                return this.upload.bind(this, file, current, total)
            }
        })
        const promises = actions.map((action) => {
            const limitedAction = this.limitUploads(action)
            return limitedAction()
        })

        return settle(promises)
    }

    install() {
        this.uppy.addUploader(this.uploader)
    }

    uninstall() {
        this.uppy.removeUploader(this.uploader)
    }
}