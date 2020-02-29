import './xhr-polyfill'

document.addEventListener('deviceready', () => {
  console.log('cordova-plugin-xhr-local-file is ready.')
  document.dispatchEvent(new Event('xhrlocalfileready'))
})
