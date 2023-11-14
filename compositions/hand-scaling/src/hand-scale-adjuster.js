(function() {

  const HANDS = ["left", "right"]

  const JOINTS = [
    "thumb-tip",
    "index-finger-tip",
    "middle-finger-tip",
    "ring-finger-tip",
    "pinky-finger-tip"
  ]

  const _wristsHVector = new THREE.Vector3()
  const _gapHVector = new THREE.Vector3()
  const _currentHandsWidthVector = new THREE.Vector3()
  const _up = new THREE.Vector3(0, 1, 0)

  AFRAME.registerComponent('hand-scale-adjuster', {

    schema: {
      leftHand: {type: 'selector', default: '#lhand'},
      rightHand: {type: 'selector', default: '#rhand'}
    },
  
    init() {
      this.scaleHands = this.scaleHands.bind(this)
      this.el.addEventListener("calibration-pose-detected", this.scaleHands)
    },
  
    scaleHands(e) {
  
      const offsets = e.detail
      
      const scaleAdjustment = this.estimateHandScale(this.data.leftHand,
                                                     this.data.rightHand, 
                                                     offsets)

      HANDS.forEach((hand) => {
        const handEl = this.data[hand + 'Hand']
        const currentScale = handEl.getAttribute('hand-tracking-controls').scale
        const newScale = currentScale * scaleAdjustment
        handEl.setAttribute('hand-tracking-controls', {scale: newScale})
      })
    },
  
    estimateHandScale(leftHand, rightHand, offsets) {
      /* We estimate hand scale by computing
      - _wristsHVector: The horizontal distance between the wrists
      - _gapHVector: The horizontal distance between the fingertips.
      Then the scale factor to use is:
      length(_wristsHVector - _gapHVector) / length(_wristsHVector)

      Note that in cases where hand models are too large, the direction of
      _gapHVector may be opposite to the direction of _wristsHVector,
      so it's important to do the vector arithmetic *before* extracting lengths
      (which loses direction information).
      */

      const getBone = (hand, name) => {
        const bones = hand.components['hand-tracking-controls'].bones
        return bones.find((b) => (b.name === name))
      }
      const leftWrist = getBone(leftHand, "wrist")
      const rightWrist = getBone(rightHand, "wrist")

      _wristsHVector.subVectors(rightWrist.position,
                                leftWrist.position)
      _wristsHVector.projectOnPlane(_up)
  
      const scaleFactors = []

      for (let ii = 0; ii < JOINTS.length; ii++) {
        _gapHVector.copy(offsets[ii]).projectOnPlane(_up)
        _currentHandsWidthVector.subVectors(_wristsHVector, _gapHVector)
        
        const scaleFactor = (_wristsHVector.length() / _currentHandsWidthVector.length()) 
        scaleFactors.push(scaleFactor)
        console.log(`Finger index: ${ii}, scale: ${scaleFactor}`)
      }

      const meanScale = scaleFactors.reduce((a, b) => a + b) / scaleFactors.length

      console.log(`Mean scale: ${meanScale}`)
      return meanScale
    }
  })
}())
