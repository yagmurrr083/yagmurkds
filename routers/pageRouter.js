import express from 'express'
import * as analizController from '../controllers/analizController.js'
import * as firmaController from '../controllers/firmaController.js'
import * as girisimciController from '../controllers/girisimciController.js'

const router = express.Router()

// Pages
router.get('/', (req, res) => res.redirect('/analiz')) // Default to Analiz
router.get('/analiz', analizController.getAnalizPage)
router.get('/firmalar', firmaController.getFirmalarPage)
router.get('/girisimciler', girisimciController.getGirisimcilerPage)

// API / AJAX Endpoints
router.get('/api/firmalar/list', analizController.getFirmalarList) // For modal
router.get('/api/analiz/data', analizController.getAnalizData)
router.post('/api/analiz/update-threshold', analizController.updateThreshold)

export default router
