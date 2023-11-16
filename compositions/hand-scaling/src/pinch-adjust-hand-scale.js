AFRAME.registerComponent('pinch-adjust-hand-scale', {

 schema: {
  leftHand: {type: 'selector', default: '#lhand'},
  rightHand: {type: 'selector', default: '#rhand'},
  increment: {default: 0.05}
 },

 init() {

  this.leftPinch = this.leftPinch.bind(this)
  this.rightPinch = this.rightPinch.bind(this)
  this.data.leftHand.addEventListener('pinchstarted', this.leftPinch)
  this.data.rightHand.addEventListener('pinchstarted', this.rightPinch)
 },

 leftPinch() {
  this.adjustHands(1 - this.data.increment)
 },

 rightPinch() {
  this.adjustHands(1 + this.data.increment)
 },

 adjustHands(scaleAdjustment) {

  this.adjustHand(this.data.leftHand, scaleAdjustment)
  this.adjustHand(this.data.rightHand, scaleAdjustment)

 },

 adjustHand(handEl, scaleAdjustment) {

  const currentScale = handEl.getAttribute('hand-tracking-controls').scale
  const newScale = currentScale * scaleAdjustment
  handEl.setAttribute('hand-tracking-controls', {scale: newScale})

 }
})
