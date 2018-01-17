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
  if (!state.tracks) { return html`<div>loading...</div>` }
  const trackPath = state.tracks[state.currentTrack]
  
  return html`
    <div>
      <div class='track-dir'>${formatDir(trackPath)}</div>
      <div class='track-name'>${formatName(trackPath)}</div>

      ${Scrubber(state, emit)}

      <div class='playback'>
        <div class='buttons'>
          <button onclick=${onclick}>${state.isPlaying ? 'pause' : 'play'}</button>
          <button onclick=${() => emit('prev')}>prev</button>
          <button onclick=${() => emit('next')}>next</button>
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

  state.progress = 0
  state.currentTrack = 0
  state.tracks = await findTracks(dir)

  play(state.tracks[0])

  emitter.on('togglePlaying', function () {
    if (state.isPlaying) { pause() }
    else { resume(state.progress) }

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
    pause()

    state.currentTrack += 1
    if (state.currentTrack >= state.tracks.length) {
      state.currentTrack = 0
    }
    
    play(state.tracks[state.currentTrack])
  })

  emitter.on('scrub', (value) => {
    pause()
    state.progress = value
    state.isScrubbing = true
    emitter.emit('render')
  })

  emitter.on('seek', (value) => {
    const { bs, startedAt } = state
    const time = ac.currentTime
    
    state.isScrubbing = false
    resume(value)
    emitter.emit('render')
  })

  setInterval(() => {
    const { 
      buffer,
      isPlaying,
      isScrubbing,
      startedAt
    } = state

    if (!isPlaying || isScrubbing) { return }

    state.progress = Math.min(ac.currentTime - startedAt, buffer.duration)

    if (state.progress >= buffer.duration) {
      pause()
      emitter.emit('next')
    }
    else {
      emitter.emit('render')
    }
  }, 500)

  async function play (url) {
    const bs = state.bs = ac.createBufferSource()
    bs.buffer = state.buffer = await loadSample(url)

    // url might have changed quicker than it could be loaded
    // TODO: not so happy with this aspect of `await`. Would be better to have a way
    // to explicitly cancel.
    if (url !== state.tracks[state.currentTrack]) { return }

    bs.connect(volume)

    const time = ac.currentTime
    bs.start(time)
    state.isPlaying = true
    state.startedAt = time
    state.progress = 0
  }

  function resume (progress) {
    const bs = state.bs = ac.createBufferSource()
    bs.buffer = state.buffer

    state.isPlaying = true
    bs.connect(volume)

    const time = ac.currentTime
    bs.start(time, progress)
    state.startedAt = time - progress
  }

  function pause () {
    const { bs, startedAt } = state
    const time = ac.currentTime

    state.isPlaying = false
    try {
      bs.disconnect(volume)
      bs.stop(time)
      state.progress = time - startedAt
    } catch (e) {

    }
  }

  window.onkeydown = ({ key }) => {
    switch (key) {
      case ' ':
        emitter.emit('togglePlaying')
        break

      case ']':
        pause()
        emitter.emit('next')
        break
      
      case '[':
        pause()
        emitter.emit('prev')
        break
    }
  }
}

function loadSample (url) {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest()
    request.open('GET', url)
    request.responseType = 'arraybuffer'
    request.onload = function () {
      ac.decodeAudioData(request.response, resolve, reject)
    }
    
    request.send()
  })
}
