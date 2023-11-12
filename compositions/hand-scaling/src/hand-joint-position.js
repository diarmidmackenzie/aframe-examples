const _quaternion = new THREE.Quaternion()
const _position = new THREE.Vector3()
const _scale = new THREE.Vector3()

AFRAME.registerComponent('hand-joint-position', {

  schema: {
    hand: {type: 'string'},
    joint: {type: 'string'},
    // weight given to new data every frame.
    weight: {default: 0.1}
  },

  update() {

    const hands = document.querySelectorAll('[hand-tracking-controls]')
    const hand = Array.from(hands).find((h) => (h.components['hand-tracking-controls'].data.hand === this.data.hand))

    if (!hand) {
      console.warn(`hand-joint-position: Unable to find hand-tracking-controls for ${this.data.hand}`)
      return
    }

    hand.addEventListener('model-loaded', () => {

      // wait until hand-tracking-controls has processed the model-loaded event.
      setTimeout(() => {
        const bones = hand.components['hand-tracking-controls'].bones
        this.bone = bones.find((b) => (b.name === this.data.joint) )
        this.jumpPosition = true
      })
    })

    this.jumpPosition = true
  },

  tick() {

    if (!this.bone) return
    this.bone.matrix.decompose( _position, _quaternion, _scale );

    const object = this.el.object3D
    const weight = this.jumpPosition ? 1 : this.data.weight
    object.position.lerp(_position, weight)
    object.quaternion.slerp(_quaternion, weight)
    object.scale.lerp(_scale, weight)

    this.jumpPosition = false
  }

})