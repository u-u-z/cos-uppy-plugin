/**
 * Do not use in a production environment
 * 
 */

const express = require('express')
const app = express()
const port = 3389
app.use('/app', express.static('dist'))
app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}! you can visit http://127.0.0.1:${port}/app/index.html`))