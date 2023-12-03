// Also requires:
// <script src="https://cdn.jsdelivr.net/npm/aframe-connecting-line@0.1.0/index.min.js"></script>

AFRAME.registerComponent('toggle-reparent-on-space', {

  schema: {
    parent: { type: 'selector'},
    debug: {default: false}
  },

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.key === " ") {
        this.toggleParent()
      }
    })
  },

  toggleParent() {

    if (this.el.hasAttribute('object-parent')) {
      this.el.removeAttribute('object-parent')
      this.el.removeAttribute('connecting-line');
    }
    else {
      this.el.setAttribute('object-parent', `parentId: ${this.data.parent.id}`)

      if (this.data.debug) {
        this.el.setAttribute('connecting-line', `start: #${this.el.id};
                                                 end: #${this.data.parent.id}`)
      }
    }
  }
})
