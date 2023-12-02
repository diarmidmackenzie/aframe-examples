// Change the parent of an object
AFRAME.registerComponent('object-parent', {

  schema: {
      parentId:     {type: 'string'},
      position:   {type: 'string', oneOf: ['absolute', 'relative'], default: 'relative'}
  },

  update() {

      const parentId = this.data.parentId
      const matches = document.querySelectorAll(`#${parentId}`)
      if (matches.length > 1) {
          console.warn(`object-parent matches duplicate entities for new parent ${parent.id}`)
      }

      const newParent = document.getElementById(parentId).object3D
      this.reparent(newParent)
      
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