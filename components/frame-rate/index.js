/* Component to update the target frame rate for an XR device, as per the WebXr Space.
   API Reference: https://www.w3.org/TR/webxr/#dom-xrsession-updatetargetframerate
*/

AFRAME.registerComponent('frame-rate', {
  schema: {
    type: 'number', default: 72
  },

  init() {
    this.update = this.update.bind(this)
    this.el.sceneEl.addEventListener('enter-vr', this.update)
  },

  update() {

    const scene = this.el.sceneEl
    if (!scene.is('vr-mode')) {
      // Don't try to set frame rate when not in VR mode.
      // The frame rate will be set on entry to VR.
      return
    }

    const renderer = scene.renderer
    if (!renderer.xr || !renderer.xr.getSession) {
      console.warn(`Unabled to request unsupported frame rate of ${this.data}.  No XR Session found.`)
      return
    }

    const session = renderer.xr.getSession()
    if (!session) {
      console.warn(`Unabled to request unsupported frame rate of ${this.data}.  No XR Session found.`)
      return
    }

    const rates = session.supportedFrameRates

    if (rates.includes(this.data)) {
      session.updateTargetFrameRate(this.data).catch((e) => {
        console.warn(`Unabled to set target frame rate of ${this.data}. Error info: ${e}`)
      })
    }
    else {
      console.warn(`Unabled to request unsupported frame rate of ${this.data}.  Supported frame rates: ${rates}`)
    }
  },

  getSupportedFrameRates() {

    const renderer = this.el.sceneEl.renderer
    if (!renderer.xr || !renderer.xr.getSession) {
      console.warn(`Unabled to get list of supported Frame Rates.  No XR Session found.`)
      return
    }

    const session = renderer.xr.getSession()
    if (!session) {
      console.warn(`Unable to get list of supported Frame Rates.  No XR Session found.`)
      return
    }

    return session.supportedFrameRates
  },

  getFrameRate() {

    const renderer = this.el.sceneEl.renderer
    if (!renderer.xr || !renderer.xr.getSession) return null

    const session = renderer.xr.getSession()
    if (!session) return null

    return session.frameRate
  }

})

AFRAME.registerComponent('automatic-frame-rate', {
  schema: {
    initialRate: { type: 'number', default: 72},
    uprateSamples: { type: 'number', default: 1000},
    uprateThreshold: { type: 'number', default: 2},
    downrateSamples: { type: 'number', default: 100},
    downrateThreshold: { type: 'number', default: 10},
  },

  init() {
    this.el.setAttribute('frame-rate', this.data.initialRate)
    this.frameRateComponent = this.el.components['frame-rate']
    this.frameRate = this.data.initialRate

    this.startTimers = this.startTimers.bind(this)
    this.stopTimers = this.stopTimers.bind(this)
    this.el.sceneEl.addEventListener('enter-vr', this.startTimers)
    this.el.sceneEl.addEventListener('exit-vr', this.stopTimers)

    this.uprateCheck = this.uprateCheck.bind(this)
    this.downrateReset = this.downrateReset.bind(this)

    this.uprateMissedFrames = 0
    this.downrateMissedFrames = 0

    this.availableRates = new Array()
  },

  startTimers() {
    this.stopTimers()

    this.frameRate = this.frameRateComponent.getFrameRate()

    // Target used to measue whether ticks are slow.
    // The way WebXR scheduling works, if we miss a frame, we'll miss by a lot (typically 2x),
    // so we can be pretty generous with what we consider "on time".
    this.targetTick = (1000 / this.frameRate) * 1.5

    const uprateCheckInterval = this.uprateSamples * this.frameRate
    this.uprateTimer = setInterval(this.uprateCheck, uprateCheckInterval)
    this.uprateMissedFrames = 0

    const downrateResetInterval = this.downrateSamples * this.frameRate
    this.downrateTimer = setInterval(this.downrateReset, downrateResetInterval)
    this.downrateMissedFrames = 0

    this.tick = this.tickProcess
  },

  stopTimers() {
    if (this.uprateTimer) {
      clearInterval(this.uprateTimer)
    }

    if (this.downrateTimer) {
      clearInterval(this.downrateTimer)
    }

    this.tick = null
  },

  uprateCheck() {

    if (this.uprateMissedFrames <= this.data.uprateThreshold) {
      // enough frames hit in this time period to uprate
      this.uprateFrameRate()
    }

    // reset counter for next cycle
    this.uprateMissedFrames = 0
  },

  downrateReset() {
    this.downrateMissedFrames = 0
  },

  updateAvailableRates() {
    const rates = this.frameRateComponent.getSupportedFrameRates()
    
    // copy and sort array, without modifying the original array, or
    // creating a new array.
    this.availableRates.length = 0
    for (let i = 0, l = rates.length; i < l; ii++) {
      this.availableRates.push(rates[i])
    }

    this.availableRates.sort()
  },

  uprateFrameRate() {
    this.changeFrameRate(1)
  },
  
  downrateFrameRate() {
    this.changeFrameRate(-1)
  },

  changeFrameRate(step) {
    this.updateAvailableRates()

    const rate = this.frameRateComponent.getFrameRate()
    const index = this.availableRates.findIndex(rate)
    const newRate = this.availableRates[index + step]

    this.el.setAttribute('frame-rate', newRate)

    // save off new frame rate, and restart timers
    this.frameRate = newRate
    this.startTimers()
  },

  tickProcess(t, dt) {

    if (dt > this.targetTick) {
      this.uprateMissedFrames++
      this.downrateMissedFrames++
    }

    if (this.downrateMissedFrames >= this.data.downrateThreshold) {
      // enough frames missed in this time period to downrate.
      this.downrateFrameRate()
    }
  }
})
