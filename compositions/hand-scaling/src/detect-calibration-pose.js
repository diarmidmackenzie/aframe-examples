(function() {

  const HANDS = ["left", "right"]

  const JOINTS = [
    "thumb-tip",
    "index-finger-tip",
    "middle-finger-tip",
    "ring-finger-tip",
    "pinky-finger-tip"
  ]

  // component to detect the calibration pose.
  // criteria are:
  // 
  // * Hands close: each finger/thumb within 5cm of it's counterpart on the opposing hand
  // * Hands aligned: < 5mm vertical offset for each finger/thumb pair
  // * Hands steady: horizontal offset distance has been unchanged (within 5mm) for 1 second for each pair.
  // 
  // Above numbers are defaults: all tweakable through schema.
  AFRAME.registerComponent('detect-calibration-pose', {

    schema: {
      leftHand: {type: 'selector', default: '#lhand'},
      rightHand: {type: 'selector', default: '#rhand'},
      maxDistance: {default: 0.05},
      maxVerticalOffset: {default: 0.01},
      maxVariation: {default: 0.01},
      variationMeasurementTime: {default: 1000},
      enabled: {default: true},
      debug: {default: false},
      colorAlignedStable: {default: '#0f0'},
      colorAlignedUnstable: {default: 'orange'},
      colorNotAligned: {default: 'red'},
      colorOutOfRange: {default: '#333'},
    },

    init() {

      this.data.leftHand.addEventListener('model-loaded', () => {
        // wait until hand-tracking-controls has processed the model-loaded event.
        setTimeout(() => {
          this.left = this.data.leftHand.components['hand-tracking-controls'].bones
        })
      })
      this.data.rightHand.addEventListener('model-loaded', () => {
        // wait until hand-tracking-controls has processed the model-loaded event.
        setTimeout(() => {
          this.right = this.data.rightHand.components['hand-tracking-controls'].bones
        })
      })

      this.latestBones = {}
      this.latestOffsets = []
      this.recentOffsetLengths = []
      HANDS.forEach((hand) => {
        this.latestBones[hand] = []
      })
    },

    tick(time) {
      if (!this.left || !this.right) return
      if (!this.data.enabled) return

      this.getLatestBones()
      this.getLatestOffsets(time)

      if (this.data.debug) {
        this.renderDebugLines()
      }

      if (this.checkDistance() && 
          this.checkAlignment() &&
          this.checkStability()) {

        this.el.emit("calibration-pose-detected", this.latestOffsets)
      }

    },

    getLatestBones() {

      HANDS.forEach((hand) => {
        const bones = this[hand]
        JOINTS.forEach((jointName, index) => {
          const bone = bones.find((b) => (b.name === jointName))
          this.latestBones[hand][index] = bone
        })
      })
    },

    getLatestOffsets(time) {

      const {variationMeasurementTime} = this.data

      for (let ii = 0; ii < JOINTS.length; ii++) {

        if (!this.latestOffsets[ii]) {
          this.latestOffsets[ii] = new THREE.Vector3()
        }
        const offsetVector = this.latestOffsets[ii]

        const leftPos = this.latestBones["left"][ii].position
        const rightPos = this.latestBones["right"][ii].position
        offsetVector.subVectors(rightPos, leftPos)

        if (!this.recentOffsetLengths[ii]) {
          this.recentOffsetLengths[ii] = new TimeSeries(variationMeasurementTime)
        }
        const offsetHistory = this.recentOffsetLengths[ii]

        const horizontalLength = (v) => Math.sqrt(v.x * v.x + v.z * v.x)
        offsetHistory.add(horizontalLength(offsetVector), time)
      }
    },

    checkDistance() {

      for (let ii = 0; ii < JOINTS.length; ii++) {
        if (this.latestOffsets[ii].length() > this.data.maxDistance) {
          return false
        }
      }

      return true
    },

    checkAlignment() {

      for (let ii = 0; ii < JOINTS.length; ii++) {
        if (Math.abs(this.latestOffsets[ii].y) > this.data.maxVerticalOffset) {
          return false
        }
      }

      return true
    },

    checkStability() {

      const {maxVariation} = this.data
      
      for (let ii = 0; ii < JOINTS.length; ii++) {

        if (!this.recentOffsetLengths[ii].startedPruning ||
            this.recentOffsetLengths[ii].variation() > maxVariation) {
          return false
        }
      }

      return true
    },

    renderDebugLines() {

      for (let ii = 0; ii < JOINTS.length; ii++) {

        const start = this.latestBones["left"][ii].position
        const end = this.latestBones["right"][ii].position

        let color

        if (this.latestOffsets[ii].length() <= this.data.maxDistance) {
          // within range
          
          if (Math.abs(this.latestOffsets[ii].y) <= this.data.maxVerticalOffset) {
            // aligned
            
          if (this.recentOffsetLengths[ii].startedPruning &&
              this.recentOffsetLengths[ii].variation() <= this.data.maxVariation) {
              // stable
              color = this.data.colorAlignedStable
            }
            else {
              // unstable
              color = this.data.colorAlignedUnstable
            }
          }
          else {
            // not aligned
            color = this.data.colorNotAligned
          }
        }
        else {
          // out of range
          color = this.data.colorOutOfRange
        }

        const s = start
        const e = end
        this.el.sceneEl.setAttribute(`line__debug-${ii}`, 
                                     {start: `${s.x} ${s.y} ${s.z}`,
                                      end: `${e.x} ${e.y} ${e.z}`,
                                      color})
      }
    }
  });

  class TimeSeries {

    constructor(duration = 1000) {
      this.timestamps = []
      this.data = []
      this.duration = duration
      this.startedPruning = false
    }

    add(data, timeNow) {

      this.prune(timeNow)
      this.timestamps.push(timeNow)
      this.data.push(data)
    }

    prune(timeNow) {

      const {timestamps} = this
      for (let ii = 0; ii < timestamps.length; ii++) {
        const cutOff = timeNow - this.duration
        const deleteCount = timestamps.filter(x => x < cutOff).length
        timestamps.splice(0, deleteCount)
        this.data.splice(0, deleteCount)
        if (deleteCount > 0) {
          this.startedPruning = true
        }
      }
    }

    min() {
      return Math.min(...this.data)
    }

    max() {
      return Math.max(...this.data)
    }

    variation() {
      return this.max() - this.min()
    }
  }

  AFRAME.registerComponent('report-calibration-pose', {

    init() {
      this.el.addEventListener("calibration-pose-detected", () => {
        this.el.setAttribute('text', 'value: POSE DETECTED!')

        setTimeout(() => {
          this.el.setAttribute('text', 'value: AWAITING POSE AGAIN...')
        }, 2000)
      })
    }
  })

}())