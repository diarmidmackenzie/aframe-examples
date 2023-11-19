/* Copied from A-Frame hand-tracking-controls.js

https://github.com/aframevr/aframe/blob/3246f0cb86f6e1a873c75a103b1ff5127879416b/src/components/hand-tracking-controls.js

The MIT License

Copyright © 2015-2017 A-Frame authors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

With modifications to allow adjustment of scale and z-position of hands.
*/

/* global THREE */
var bind = AFRAME.utils.bind

var trackedControlsUtils = AFRAME.utils.trackedControls
var checkControllerPresentAndSetup = trackedControlsUtils.checkControllerPresentAndSetup;

var AFRAME_CDN_ROOT = window.AFRAME_CDN_ROOT || 'https://cdn.aframe.io/';
var LEFT_HAND_MODEL_URL = AFRAME_CDN_ROOT + 'controllers/oculus-hands/v4/left.glb';
var RIGHT_HAND_MODEL_URL = AFRAME_CDN_ROOT + 'controllers/oculus-hands/v4/right.glb';

var JOINTS = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip'
];

var THUMB_TIP_INDEX = 4;
var INDEX_TIP_INDEX = 9;

var PINCH_START_DISTANCE = 0.015;
var PINCH_END_DISTANCE = 0.03;
var PINCH_POSITION_INTERPOLATION = 0.5;

/**
 * Controls for hand tracking
 */
delete(AFRAME.components['hand-tracking-controls'])
AFRAME.registerComponent('hand-tracking-controls', {
  schema: {
    hand: {default: 'right', oneOf: ['left', 'right']},
    modelStyle: {default: 'mesh', oneOf: ['dots', 'mesh']},
    modelColor: {default: 'white'},
    wireframe: {default: false},
    scale: {default: 1},
    wristAdjustment: {default: 0}
  },

  bindMethods: function () {
    this.onControllersUpdate = bind(this.onControllersUpdate, this);
    this.checkIfControllerPresent = bind(this.checkIfControllerPresent, this);
    this.removeControllersUpdateListener = bind(this.removeControllersUpdateListener, this);
  },

  addEventListeners: function () {
    this.el.addEventListener('model-loaded', this.onModelLoaded);
    for (var i = 0; i < this.jointEls.length; ++i) {
      this.jointEls[i].object3D.visible = true;
    }
  },

  removeEventListeners: function () {
    this.el.removeEventListener('model-loaded', this.onModelLoaded);
    for (var i = 0; i < this.jointEls.length; ++i) {
      this.jointEls[i].object3D.visible = false;
    }
  },

  init: function () {
    var sceneEl = this.el.sceneEl;
    var webXROptionalAttributes = sceneEl.getAttribute('webxr').optionalFeatures;
    webXROptionalAttributes.push('hand-tracking');
    // Temporary fix.  This line is corrupting webxr requiredFeatures, breaking anchors.
    // Don't yet understand why.
    //sceneEl.setAttribute('webxr', {optionalFeatures: webXROptionalAttributes});
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.jointEls = [];
    this.controllerPresent = false;
    this.isPinched = false;
    this.pinchEventDetail = {position: new THREE.Vector3()};
    this.indexTipPosition = new THREE.Vector3();
    this.wristAdjustment = new THREE.Vector3();

    this.hasPoses = false;
    this.jointPoses = new Float32Array(16 * JOINTS.length);
    this.jointRadii = new Float32Array(JOINTS.length);

    this.bindMethods();

    this.updateReferenceSpace = this.updateReferenceSpace.bind(this);
    this.el.sceneEl.addEventListener('enter-vr', this.updateReferenceSpace);
    this.el.sceneEl.addEventListener('exit-vr', this.updateReferenceSpace);
  },

  updateReferenceSpace: function () {
    var self = this;
    var xrSession = this.el.sceneEl.xrSession;
    this.referenceSpace = undefined;
    if (!xrSession) { return; }
    var referenceSpaceType = self.el.sceneEl.systems.webxr.sessionReferenceSpaceType;
    xrSession.requestReferenceSpace(referenceSpaceType).then(function (referenceSpace) {
      self.referenceSpace = referenceSpace;
    }).catch(function (error) {
      self.el.sceneEl.systems.webxr.warnIfFeatureNotRequested(referenceSpaceType, 'tracked-controls-webxr uses reference space ' + referenceSpaceType);
      throw error;
    });
  },

  checkIfControllerPresent: function () {
    var data = this.data;
    var hand = data.hand ? data.hand : undefined;
    checkControllerPresentAndSetup(
      this, '',
      {hand: hand, iterateControllerProfiles: true, handTracking: true});
  },

  play: function () {
    this.checkIfControllerPresent();
    this.addControllersUpdateListener();
  },

  tick: function () {
    var sceneEl = this.el.sceneEl;
    var controller = this.el.components['tracked-controls'] && this.el.components['tracked-controls'].controller;
    var frame = sceneEl.frame;
    var trackedControlsWebXR = this.el.components['tracked-controls-webxr'];
    var referenceSpace = this.referenceSpace;
    if (!controller || !frame || !referenceSpace || !trackedControlsWebXR) { return; }
    this.hasPoses = false;
    if (controller.hand) {
      this.el.object3D.position.set(0, 0, 0);
      this.el.object3D.rotation.set(0, 0, 0);

      this.hasPoses = frame.fillPoses(controller.hand.values(), referenceSpace, this.jointPoses) &&
        frame.fillJointRadii(controller.hand.values(), this.jointRadii);

      this.updateHandModel();
      this.detectGesture();
    }
  },

  updateHandModel: function () {
    if (this.data.modelStyle === 'dots') {
      this.updateHandDotsModel();
    }

    if (this.data.modelStyle === 'mesh') {
      this.updateHandMeshModel();
    }
  },

  getBone: function (name) {
    var bones = this.bones;
    for (var i = 0; i < bones.length; i++) {
      if (bones[i].name === name) { return bones[i]; }
    }
    return null;
  },

  updateHandMeshModel: (function () {
    var jointPose = new THREE.Matrix4();
    return function () {
      var jointPoses = this.jointPoses;
      var controller = this.el.components['tracked-controls'] && this.el.components['tracked-controls'].controller;
      if (!controller || !this.mesh) { return; }
      this.mesh.visible = false;
      if (!this.hasPoses) { return; }
      var i = 0;
      var scale = this.data.scale;
      var wristAdjustmentDistance = this.data.wristAdjustment;
      for (var inputjoint of controller.hand.values()) {
        var bone = this.getBone(inputjoint.jointName);
        if (bone != null) {
          this.mesh.visible = true;
          jointPose.fromArray(jointPoses, i * 16);
          bone.position.setFromMatrixPosition(jointPose);
          bone.quaternion.setFromRotationMatrix(jointPose);
          bone.scale.set(scale, scale, scale)
          var wristPosition;
          var wristAdjustment = this.wristAdjustment;
          if (inputjoint.jointName === 'wrist') {
            wristPosition = bone.position;
            wristAdjustment.set(0, 0, wristAdjustmentDistance);
            wristAdjustment.applyQuaternion(bone.quaternion);
          } else {
            var position = bone.position;
            position.sub(wristPosition);
            position.multiplyScalar(scale);
            position.add(wristPosition);
          }
          bone.position.add(wristAdjustment);
        }
        i++;
      }
    };
  })(),

  updateHandDotsModel: function () {
    var jointPoses = this.jointPoses;
    var jointRadii = this.jointRadii;
    var controller = this.el.components['tracked-controls'] && this.el.components['tracked-controls'].controller;
    var jointEl;
    var object3D;

    for (var i = 0; i < controller.hand.size; i++) {
      jointEl = this.jointEls[i];
      object3D = jointEl.object3D;
      jointEl.object3D.visible = this.hasPoses;
      if (!this.hasPoses) { continue; }
      object3D.matrix.fromArray(jointPoses, i * 16);
      object3D.matrix.decompose(object3D.position, object3D.rotation, object3D.scale);
      jointEl.setAttribute('scale', {x: jointRadii[i], y: jointRadii[i], z: jointRadii[i]});
    }
  },

  detectGesture: function () {
    this.detectPinch();
  },

  detectPinch: (function () {
    var thumbTipPosition = new THREE.Vector3();
    var jointPose = new THREE.Matrix4();
    return function () {
      var indexTipPosition = this.indexTipPosition;
      if (!this.hasPoses) { return; }

      thumbTipPosition.setFromMatrixPosition(jointPose.fromArray(this.jointPoses, THUMB_TIP_INDEX * 16));
      indexTipPosition.setFromMatrixPosition(jointPose.fromArray(this.jointPoses, INDEX_TIP_INDEX * 16));

      var distance = indexTipPosition.distanceTo(thumbTipPosition);

      if (distance < PINCH_START_DISTANCE && this.isPinched === false) {
        this.isPinched = true;
        this.pinchEventDetail.position.copy(indexTipPosition).lerp(thumbTipPosition, PINCH_POSITION_INTERPOLATION);
        this.el.emit('pinchstarted', this.pinchEventDetail);
      }

      if (distance > PINCH_END_DISTANCE && this.isPinched === true) {
        this.isPinched = false;
        this.pinchEventDetail.position.copy(indexTipPosition).lerp(thumbTipPosition, PINCH_POSITION_INTERPOLATION);
        this.el.emit('pinchended', this.pinchEventDetail);
      }

      if (this.isPinched) {
        this.pinchEventDetail.position.copy(indexTipPosition).lerp(thumbTipPosition, PINCH_POSITION_INTERPOLATION);
        this.el.emit('pinchmoved', this.pinchEventDetail);
      }
    };
  })(),

  pause: function () {
    this.removeEventListeners();
    this.removeControllersUpdateListener();
  },

  injectTrackedControls: function () {
    var el = this.el;
    var data = this.data;
    el.setAttribute('tracked-controls', {
      hand: data.hand,
      iterateControllerProfiles: true,
      handTrackingEnabled: true
    });
    this.initDefaultModel();
  },

  addControllersUpdateListener: function () {
    this.el.sceneEl.addEventListener('controllersupdated', this.onControllersUpdate, false);
  },

  removeControllersUpdateListener: function () {
    this.el.sceneEl.removeEventListener('controllersupdated', this.onControllersUpdate, false);
  },

  onControllersUpdate: function () {
    var controller;
    this.checkIfControllerPresent();
    controller = this.el.components['tracked-controls'] && this.el.components['tracked-controls'].controller;
    if (!this.el.getObject3D('mesh')) { return; }
    if (!controller || !controller.hand || !controller.hand[0]) {
      this.el.getObject3D('mesh').visible = false;
    }
  },

  initDefaultModel: function () {
    if (this.el.getObject3D('mesh')) { return; }
    if (this.data.modelStyle === 'dots') {
      this.initDotsModel();
    }

    if (this.data.modelStyle === 'mesh') {
      this.initMeshHandModel();
    }
  },

  initDotsModel: function () {
     // Add models just once.
    if (this.jointEls.length !== 0) { return; }
    for (var i = 0; i < JOINTS.length; ++i) {
      var jointEl = this.jointEl = document.createElement('a-entity');
      jointEl.setAttribute('geometry', {
        primitive: 'sphere',
        radius: 1.0
      });
      jointEl.setAttribute('material', {color: this.data.modelColor,
                                        wireframe: this.data.wireframe});
      jointEl.object3D.visible = false;
      this.el.appendChild(jointEl);
      this.jointEls.push(jointEl);
    }
  },

  initMeshHandModel: function () {
    var modelURL = this.data.hand === 'left' ? LEFT_HAND_MODEL_URL : RIGHT_HAND_MODEL_URL;
    this.el.setAttribute('gltf-model', modelURL);
  },

  onModelLoaded: function () {
    var mesh = this.mesh = this.el.getObject3D('mesh').children[0];
    var skinnedMesh = this.skinnedMesh = mesh.getObjectByProperty('type', 'SkinnedMesh');
    if (!this.skinnedMesh) { return; }
    this.bones = skinnedMesh.skeleton.bones;
    this.el.removeObject3D('mesh');
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    skinnedMesh.frustumCulled = false;
    skinnedMesh.material = new THREE.MeshStandardMaterial({color: this.data.modelColor,
                                                           wireframe: this.data.wireframe});
    this.el.setObject3D('mesh', mesh);
  }
});

