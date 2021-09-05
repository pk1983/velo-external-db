const compose = require('docker-compose')

const runImage = async (image) => await compose.upOne(image, { cwd: __dirname, log: true })
const stopImage = async (image) => await compose.stopOne(image, { cwd: __dirname, log: true })

module.exports = { runImage, stopImage }