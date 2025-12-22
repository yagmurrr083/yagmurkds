import express from 'express'
import path from 'path'
import pageRouter from './routers/pageRouter.js'

const app = express()
const port = process.env.PORT || 3000

// VERCEL FIX: Use process.cwd() to locate folders in Lambda environment
// __dirname is unreliable in bundled serverless functions
const PROJECT_ROOT = process.cwd()

// View Engine
app.set('view engine', 'ejs')
app.set('views', path.join(PROJECT_ROOT, 'views'))

// Middleware
// Serve static files from 'public' directory
app.use(express.static(path.join(PROJECT_ROOT, 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/', pageRouter)

// Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err)
    res.status(500).send('Bir şeyler ters gitti! Hata: ' + err.message)
})

export default app

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Sunucu ${port} portunda çalışıyor...`)
    })
}
