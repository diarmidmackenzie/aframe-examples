AFRAME.registerComponent('pinch-smooth-hand-scale', {

 schema: {
  leftHand: {type: 'selector', default: '#lhand'},
  rightHand: {type: 'selector', default: '#rhand'},
  enabled: {default: true}
 },

 init() {

  this.pinchStarted = this.pinchStarted.bind(this)
  this.pinchMoved = this.pinchMoved.bind(this)
  this.pinchEnded = this.pinchEnded.bind(this)
  
  const { leftHand, rightHand } = this.data
  leftHand.addEventListener('pinchstarted', this.pinchStarted)
  rightHand.addEventListener('pinchstarted', this.pinchStarted)
  leftHand.addEventListener('pinchmoved', this.pinchMoved)
  rightHand.addEventListener('pinchmoved', this.pinchMoved)
  leftHand.addEventListener('pinchended', this.pinchEnded)
  rightHand.addEventListener('pinchended', this.pinchEnded)

  this.pinchingHand = null
  this.startY = 0

  leftHand.addEventListener('loaded', () => {
    this.leftStartScale = leftHand.getAttribute('hand-tracking-controls').scale
  })
  rightHand.addEventListener('loaded', () => {
    this.rightStartScale = rightHand.getAttribute('hand-tracking-controls').scale
  })
  
  this.previousScaleAdjustment = 1
  this.latestScaleAdjustment = 1
 },

 pinchStarted(e) {
  if (!this.data.enabled) return
  if (this.pinchingHand) return

  this.pinchingHand = e.target
  this.startY = e.detail.position.y
 },

 pinchMoved(e) {
  if (!this.data.enabled) return
  if (this.pinchingHand !== e.target) return

  const delta = e.detail.position.y - this.startY
  this.latestScaleAdjustment = Math.max(0.1, 1 + delta)
  this.updateHandsScale()
 },

 pinchEnded(e) {
  if (!this.data.enabled) return
  if (this.pinchingHand !== e.target) return

  this.pinchingHand = null
  this.previousScaleAdjustment *= this.latestScaleAdjustment
  this.latestScaleAdjustment = 1
 },

 updateHandsScale() {
  this.updateHandScale(this.data.leftHand, this.leftStartScale)
  this.updateHandScale(this.data.rightHand, this.rightStartScale)
 },
 
 updateHandScale(handEl, startScale) {
  const newScale = startScale * this.previousScaleAdjustment * this.latestScaleAdjustment
  handEl.setAttribute('hand-tracking-controls', {scale: newScale})
 }
})
