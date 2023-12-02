// Note the way we're establishing the NAF schema here; this is a bit awkward
// because of a recent bug found in the original handling. This mitigates that bug for now,
// until a refactor in the future that should fix the issue more cleanly.
// see issue https://github.com/networked-aframe/networked-aframe/issues/267

// This one is necessary, because tracking the .head child component's material's color
// won't happen unless we tell NAF to keep it in sync, like here.
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;
NAF.schemas.getComponents = (template) => {
  if (!NAF.schemas.hasTemplate('#avatar-template')) {
    NAF.schemas.add({
      template: '#avatar-template',
      components: [
        // position and rotation are added by default if we don't include a template, but since
        // we also want to sync the color, we need to specify a custom template; if we didn't
        // include position and rotation in this custom template, they'd not be synced.
        'position',
        'rotation',

        // this is how we sync a particular property of a particular component for a particular
        // child element of template instances.
        {
          selector: '.head',
          component: 'material',
          property: 'color' // property is optional; if excluded, syncs everything in the component schema
        }
      ]
    });
    NAF.schemas.add({
      template: '#box-template',
      components: [
        'position',
        'rotation',
        'color',
        'object-parent'
      ]
    });
  }
  const components = NAF.schemas.getComponentsOriginal(template);
  return components;
};