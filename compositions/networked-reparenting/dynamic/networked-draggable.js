AFRAME.registerComponent('networked-draggable', {

  init() {  
    this.el.addEventListener("dragstart", this.grabStart.bind(this));
  },

  grabStart() {

    NAF.utils.takeOwnership(this.el)
  },
});
