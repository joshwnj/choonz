const html = require('choo/html')
const hms = require('hh-mm-ss')

function formatTime (seconds) {
  return hms.fromS(Math.round(seconds), 'mm:ss')
}

module.exports = function Progress ({ audio }) {
  const { currentTime, duration } = audio
  return html`<div class='progress'>${formatTime(currentTime)} / ${formatTime(duration)}</div>`
}
