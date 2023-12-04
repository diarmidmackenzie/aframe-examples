// Also requires:
// <script src="https://cdn.jsdelivr.net/npm/aframe-connecting-line@0.1.0/index.min.js"></script>

AFRAME.registerComponent('toggle-parent-on-click', {

  schema: {
    button: { type: 'selector'},
    parent: { type: 'selector'},
    debug: {default: false}
  },

  init() {
    this.data.button.onclick = this.toggleParent.bind(this)
    
  },

  toggleParent() {

    NAF.utils.takeOwnership(this.el)

    if (this.el.hasAttribute('object-parent')) {
      this.el.removeAttribute('object-parent')
      this.el.removeAttribute('connecting-line');
      this.data.button.innerHTML = "Parent"
    }
    else {
      this.el.setAttribute('object-parent', `parentId: ${this.data.parent.id}`)

      if (this.data.debug) {
        this.el.setAttribute('connecting-line', `start: #${this.el.id};
                                                 end: #${this.data.parent.id}`)
      }
    }
  },

  tick() {

    if (this.el.hasAttribute('object-parent')) {
      this.data.button.innerHTML = "Unparent"
    }
    else {
      this.data.button.innerHTML = "Parent"
    }

  }
})
