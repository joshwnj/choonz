const html = require('choo/html')
const devtools = require('choo-devtools')
const choo = require('choo')
const glob = require('glob')
const path = require('path')

const Progress = require('./components/Progress')
const Scrubber = require('./components/Scrubber')

const ac = new AudioContext()
const volume = ac.createGain()
volume.gain.value = 1.0
volume.connect(ac.destination)

var app = choo()
app.use(devtools())
app.use(store)
app.route('/', mainView)
app.mount('div')

function formatDir (trackPath) {
  const parts = trackPath.split(path.sep)
  return parts[parts.length - 2]
}

function formatName (trackPath) {
  const parts = trackPath.split(path.sep)
  return parts[parts.length - 1]
}

function mainView (state, emit) {
  if (!state.tracks) { return html`<div class='loading'>loading...</div>` }
  const trackPath = state.tracks[state.currentTrack]
  
  return html`
    <div>
      <div class='track-dir'>${formatDir(trackPath)}</div>
      <div class='track-name'>${formatName(trackPath)}</div>

      ${Scrubber(state, emit)}

      <div class='playback'>
        <div class='buttons'>
          <button class='ft2' onclick=${onclick}>${state.isPlaying ? 'pause' : 'play'}</button>
          <button class='ft2' onclick=${() => emit('prev')}>prev</button>
          <button class='ft2' onclick=${() => emit('next')}>next</button>
        </div>

        ${Progress(state)}
      </div>
    </div>
  `

  function onclick () {
    emit('togglePlaying')
  }
}

function findTracks (dir) {
  return new Promise((resolve, reject) => {
    glob(`${dir}/**/*.+(mp3|ogg)`, (err, files) => {
      if (err) { return reject(err) }

      return resolve(files)
    })
  })
}

async function store (state, emitter) {
  const dir = process.cwd()
  const audio = new Audio()
  audio.autoplay = true

  audio.onended = () => {
    emitter.emit('next')
  }

  audio.onplay = () => {
    emitter.emit('render')
  }

  state.audio = audio
  state.currentTrack = 0
  state.tracks = await findTracks(dir)

  play(state.tracks[0])

  emitter.on('togglePlaying', function () {
    if (state.isPlaying) { pause() }
    else { resume() }

    emitter.emit('render')
  })

  emitter.on('prev', () => {
    pause()

    state.currentTrack -= 1
    if (state.currentTrack < 0) {
      state.currentTrack = state.tracks.length
    }

    play(state.tracks[state.currentTrack])
  })

  emitter.on('next', () => {
    // stop when we get to the end
    console.log(state.currentTrack, state.tracks.length)
    if (state.currentTrack === state.tracks.length - 1) { return }

    pause()
    state.currentTrack += 1
    play(state.tracks[state.currentTrack])
  })

  emitter.on('scrub', (value) => {
    pause()
    state.audio.currentTime = value
    state.isScrubbing = true
    emitter.emit('render')
  })

  emitter.on('seek', (value) => {
    state.isScrubbing = false

    resume()
    emitter.emit('render')
  })

  let lastTime
  setInterval(() => {
    const { 
      isPlaying,
      isScrubbing
    } = state
    if (!isPlaying || isScrubbing) { return }

    const { currentTime } = audio

    // only need to render when we've gone a whole second
    const timeAtSec = Math.floor(currentTime)
    if (timeAtSec !== lastTime) {
      lastTime = timeAtSec
      emitter.emit('render')
    }
  }, 200)

  function play (url) {
    audio.src = state.tracks[state.currentTrack]
    state.isPlaying = true
  }

  function resume (progress) {
    audio.play()
    state.isPlaying = true
  }

  function pause () {
    audio.pause()
    state.isPlaying = false
  }

  window.onkeydown = ({ key }) => {
    switch (key) {
      case ' ':
        emitter.emit('togglePlaying')
        break

      case ']':
        emitter.emit('next')
        break
      
      case '[':
        emitter.emit('prev')
        break
    }
  }
}
