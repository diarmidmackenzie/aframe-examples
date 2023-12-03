// Change the parent of an object
AFRAME.registerComponent('object-parent', {

  schema: {
      parentId:        {type: 'string'},
      parentNetworkId: {type: 'string'},
      position:   {type: 'string', oneOf: ['absolute', 'relative'], default: 'absolute'}
  },

  update() {

    // parentNetworkId takes precedence over parentId
    let newParentEl
    if (this.data.parentNetworkId) {
      console.log(this.data.parentNetworkId)
      newParentEl = NAF.entities.entities[this.data.parentNetworkId]
    }
    else {
      const parentId = this.data.parentId
      const matches = document.querySelectorAll(`#${parentId}`)
      if (matches.length > 1) {
          console.warn(`object-parent matches duplicate entities for new parent ${parent.id}`)
      }
      newParentEl = document.getElementById(parentId)
    }

    const newParent = newParentEl.object3D
    this.reparent(newParent)

    const networkId = newParentEl.components?.networked.data?.networkId

    if (networkId) {
      this.el.setAttribute('object-parent', `parentNetworkId: ${networkId}`)
    }
  },

  remove() {

    const originalParentEl = this.el.parentEl
    this.reparent(originalParentEl.object3D)

  },

  reparent(newParent) {

    const object = this.el.object3D
    const oldParent = object.parent

    if (object.parent === newParent) {
        return;
    }

    objectEl = (o) => {
        if (o.type === 'Scene') {
            return (this.el.sceneEl)
        }
        else {
            return o.el
        }
    }

    //console.log(`Reparenting ${object.el.id} from ${objectEl(oldParent).id} to ${objectEl(newParent).id}`);
    
    if (this.data.position === 'absolute') {
      newParent.attach(object);
    }
    else {
      newParent.add(object);
    }
    
  },
});