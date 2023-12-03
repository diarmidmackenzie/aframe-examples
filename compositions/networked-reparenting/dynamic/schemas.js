// Note the way we're establishing the NAF schema here; this is a bit awkward
// because of a recent bug found in the original handling. This mitigates that bug for now,
// until a refactor in the future that should fix the issue more cleanly.
// see issue https://github.com/networked-aframe/networked-aframe/issues/267

// This one is necessary, because tracking the .head child component's material's color
// won't happen unless we tell NAF to keep it in sync, like here.
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;
NAF.schemas.getComponents = (template) => {
  if (!NAF.schemas.hasTemplate('#ball-template')) {
    NAF.schemas.add({
      template: '#ball-template',
      components: [
        'position',
        'rotation',
        'object-parent'
      ]
    });
  }
  const components = NAF.schemas.getComponentsOriginal(template);
  return components;
};