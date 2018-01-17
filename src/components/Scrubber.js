const html = require('choo/html')

module.exports = function Scrubber ({ audio }, emit) {
  const { currentTime, duration } = audio

  const percent = (currentTime / duration) * 100
  return html`
  <div class='scrubber-wrapper'>
    <div style='position: relative'>
      <input type='range' class='scrubber' min='0' max='${duration}' value=${currentTime} oninput=${(e) => emit('scrub', e.target.value)} onchange=${(e) => emit('seek', e.target.value)} />
      <div class='train-wrapper'>
        <span class='train flip-h' style='left: ${percent}%;'>🚂</spn>
      </div>
    </div>
  </div>
  `
}
