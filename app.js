import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pageRouter from './routers/pageRouter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

// View Engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/', pageRouter)

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Bir şeyler ters gitti!')
})

app.listen(port, () => {
    console.log(`Sunucu ${port} portunda çalışıyor...`)
})
