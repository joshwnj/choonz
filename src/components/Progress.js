const html = require('choo/html')
const hms = require('hh-mm-ss')

function formatTime (seconds) {
  try {
    return hms.fromS(Math.round(seconds), 'mm:ss')
  } catch (e) {
    return '--:--'
  }
}

module.exports = function Progress ({ audio }) {
  const { currentTime, duration } = audio
  return html`<div class='progress'>${formatTime(currentTime)} / ${formatTime(duration)}</div>`
}
