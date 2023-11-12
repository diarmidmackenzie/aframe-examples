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
      maxVerticalOffset: {default: 0.005},
      maxVariation: {default: 0.005},
      variationMeasurementTime: {default: 1000},
    },

    init() {

      this.data.leftHand.addEventListener('model-loaded', () => {
        // wait until hand-tracking-controls has processed the model-loaded event.
        setTimeout(() => {
          this.left = this.data.leftHand.components['hand-tracking-controls'].bones
        })
      })
      this.data.leftHand.addEventListener('model-loaded', () => {
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

      this.getLatestBones()
      this.getLatestOffsets(time)

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

      for (ii = 0; ii < JOINTS.length; ii++) {

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

        offsetHistory.add(offsetVector.length(), time)
      }
    },

    checkDistance() {

      for (ii = 0; ii < JOINTS.length; ii++) {
        if (this.latestOffsets[ii].length() > this.data.maxDistance) {
          return false
        }
      }

      return true
    },

    checkAlignment() {

      for (ii = 0; ii < JOINTS.length; ii++) {
        if (Math.abs(this.latestOffsets[ii].y) > this.data.maxVerticalOffset) {
          return false
        }
      }

      return true
    },

    checkStability() {

      const {maxVariation} = this.data
      
      for (ii = 0; ii < JOINTS.length; ii++) {

        if (this.recentOffsetLengths[ii].variation() > maxVariation) {
          return false
        }
      }

      return true
    }
  });

  class TimeSeries {

    constructor(duration = 1000) {
      this.timestamps = []
      this.data = []
      this.duration = duration
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
      }
    }

    min() {
      Math.min(...this.data)
    }

    max() {
      Math.max(...this.data)
    }

    variation() {
      return this.max() - this.min()
    }
  }

  AFRAME.registerComponent('report-calibration-pose', {

    init() {
      this.el.addEventListener("calibration-pose-detected", () => {
        this.el.setAttribute('text', 'value: POSE DETECTED!')
      })
    }
  })

}())