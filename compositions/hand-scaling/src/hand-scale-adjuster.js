(function() {

  const HANDS = ["left", "right"]

  const JOINTS = [
    "thumb-tip",
    "index-finger-tip",
    "middle-finger-tip",
    "ring-finger-tip",
    "pinky-finger-tip"
  ]

  const _vector = new THREE.Vector3()
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
      const hDeltas = offsets.map((vec) => vec.projectOnPlane(_up).length() / 2)

      HANDS.forEach((hand) => {
        const handEl = this.data[hand + 'Hand']

        const scale = this.estimateHandScale(handEl, hDeltas)
        handEl.setAttribute('hand-tracking-controls', {scale: scale})
      })
    },
  
    estimateHandScale(hand, hDeltas) {
  
      const getBone = (name) => bones.find((b) => (b.name === name))
      bones = hand.components['hand-tracking-controls'].bones
      wrist = getBone("wrist")
  
      const scaleFactors = []
      JOINTS.forEach((jointName, index) => {
        jointBone = getBone(jointName)
        _vector.subVectors(wrist.position, jointBone.position)
        _vector.projectOnPlane(_up)
        const hOffset = _vector.length()
        hDelta = hDeltas[index]
        const scaleFactor = (hDelta + hOffset) / hOffset
        scaleFactors.push(scaleFactor)
        console.log(`Hand: ${hand.id}, Finger index: ${index}, scale: ${scaleFactor}`)
      })

      const meanScale = scaleFactors.reduce((a, b) => a + b) / scaleFactors.length

      console.log(`Hand: ${hand.id}, Mean scale: ${meanScale}`)
      return meanScale
    }
  })
}())
