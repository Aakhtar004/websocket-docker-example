require('babel-register')({
  presets: ['env'],
  plugins: ['transform-object-rest-spread', 'transform-es2015-modules-commonjs']
});

// Initialize database first
const initDatabase = require('./models/init-db')

const startApp = async () => {
  try {
    await initDatabase()
    console.log('🎉 Starting application...')
    require('./app')
  } catch (error) {
    console.error('💥 Failed to start application:', error)
    process.exit(1)
  }
}

startApp()