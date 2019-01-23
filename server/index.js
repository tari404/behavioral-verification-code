'use strict'

const program = require('commander')
const path = require('path')
const crypto = require('crypto')

const { createCanvas, loadImage } = require('canvas')
const express = require('express')
const bodyParser = require('body-parser')

program
  .version('0.1.0')
  .option('-a, --assets [string]', 'Static resource directory', './assets')
  .option('-s, --secret [string]', 'The HMAC key used to generate the cryptographic HMAC hash', 'Eevee')
  .parse(process.argv)

const app = express()
app.use(bodyParser.json({ limit: '1mb' }))
app.use(bodyParser.urlencoded({ extended: true }))

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
  res.header('X-Powered-By', ' 3.2.1')
  next()
})

const bgImages = []
let logo = null
const storage = new Map()
const phoneNumRec = new Map()
const tryTime = new Map()

function genImage () {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bgImages[0], 0, 0, 400, 300)
  const rX = Math.round(Math.random() * (400 - 100)) + 12
  const rY = Math.round(Math.random() * (300 - 160)) + 12
  ctx.globalAlpha = .4
  ctx.drawImage(logo, rX, rY, 75, 75)
  console.log(`-- gen image: x: ${rX}, y: ${rY}`)
  return {
    x: rX,
    y: rY,
    canvas
  }
}

app.post('/generate', (req, res) => {
  const data = req.body
  const phoneNum = data.phone
  if (!phoneNum || !/^\d{11}$/.test(phoneNum)) {
    return res.status(400).send('invalid argument: phone')
  }
  if (phoneNumRec.has(phoneNum)) {
    const record = phoneNumRec.get(phoneNum)
    if (record.time > new Date().getTime() - 60000) {
      return res.status(400).send('requests are too frequent')
    } else {
      storage.delete(record.hash)
    }
  }
  const { canvas, x, y } = genImage()
  canvas.toDataURL('image/jpeg', {
    quality: .8,
    progressive: false,
    chromaSubsampling: true
  }, (err, jpeg) => {
    if (err) {
      res.send({
        error: true
      })
    } else {
      const now = new Date().getTime()
      const hash = crypto.createHmac('sha256', program.secret).update(jpeg).digest('hex')
      storage.set(hash, { x, y, time: now, phoneNum })
      phoneNumRec.set(phoneNum, { time: now, hash })
      res.send({
        hash,
        x,
        y,
        img: jpeg
      })
    }
  })
})

app.post('/validate', (req, res) => {
  const data = req.body
  if (!data.x || !data.y || !data.hash) {
    return res.status(400).send('invalid argument')
  }
  const record = storage.get(data.hash)
  if (!record) {
    return res.status(400).send('invalid verification code id')
  }
  if (record.time < new Date().getTime() - 150000) {
    return res.status(400).send('verification code expiration')
  }
  const d2 = Math.pow(Number(data.x) - record.x, 2) +  Math.pow(Number(data.y) - record.y, 2)
  console.log(d2)
  if (d2 < 25) {
    res.send({
      success: true,
      phone: record.phoneNum
    })
  } else {
    const times = (tryTime.get(data.hash) || 0) + 1
    if (times > 5) {
      tryTime.delete(data.hash)
      storage.delete(data.hash)
    } else {
      tryTime.set(data.hash, times)
    }
    res.send({
      success: false,
      times
    })
  }
})

Promise.all([
  loadImage(path.join(program.assets, '/bg.jpg')),
  loadImage(path.join(program.assets, '/logo.png'))
]).then((ress) => {
  bgImages.push(ress[0])
  logo = ress[1]
  app.listen(3000)
  console.log('--- service start')
})
