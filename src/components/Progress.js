const html = require('choo/html')
const hms = require('hh-mm-ss')

function formatTime (seconds) {
  return hms.fromS(Math.round(seconds), 'mm:ss')
}

module.exports = function Progress ({ buffer, progress }) {
  if (!buffer || !progress) { return '' }
  
  const { duration } = buffer
  return html`<div class='progress'>${formatTime(progress)} / ${formatTime(duration)}</div>`
}
