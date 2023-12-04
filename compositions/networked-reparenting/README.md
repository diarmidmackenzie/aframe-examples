

## Networked Reparenting

These examples show integration of [Networked A-Frame (NAF)](https://github.com/networked-aframe) with object reparenting (i.e. arranging the Three.js scene graph differently from the A-Frame HTML scene graph)

We use a [modified version](https://github.com/diarmidmackenzie/aframe-examples/tree/main/compositions/networked-parenting/object-parent.js) of the [`object-parent` component](https://diarmidmackenzie.github.io/aframe-components/components/object-parent/) that has been extended to work together with NAF (at some point I hope to fold these changes back into an updated version of `object-parent`)

We have two examples:

- [static reparenting](./static/) - A modified version of the [Networked A-Frame basic example](https://github.com/networked-aframe/networked-aframe#more-examples), with two cubes statically re-parented into "hand positions" of each avatar.

<video src="https://github.com/diarmidmackenzie/aframe-examples/assets/16045703/64ecb4d4-8f83-47bd-9183-766aa6f8f9ee" controls="controls" style="max-width: 400px;">
</video>

- [dynamic reparenting](./dynamic/) - An example where one sphere can be parented to and unparented from another sphere, and the relationships and positions of both spheres are replicated between clients.

<video src="https://github.com/diarmidmackenzie/aframe-examples/assets/16045703/9489a51d-83d1-4a42-9a85-e426273c3b46" controls="controls" style="max-width: 400px;">
</video>



### Some Technical notes

Several modifications had to be made to the original `object-parent` component to get it to work correctly with NAF.  Some significant points as follows:

- It's not possible to use selectors on a schema of a component replicated by NAF, so we've switched to using strings instead to identify the id of the parent.
- Element IDs aren't necessarily meaningful in the context of another client, so we also replicate the network ID of the parent element.  Where a network ID is specified, this takes precedence over any element ID.
- NAF doesn't appear to replicate removal of attributes.  So whereas it was previously possible to return an entity to it's original parent by simply removing the `object-parent` attribute, this is now done by explicitly specifying a parentID and parentNetworkID that are empty.
- When switching parent, all previous position and orientation data becomes meaningless.  NAF buffers this data to allow for smooth "lerping" between positions.  This lerp buffer has to be cleared out on reparenting, as the data is not meaningful in the new frame of reference, and can lead to ugly jumps out of position if it's used for positioning.
- There are a few race conditions that need to be handled, as network timings mean things can happen in a variety of orders.  Testing these live is rather fiddly.  Some Unit Tests of these cases would be useful (but don't exist yet).



### Acknowledgements

The static re-parenting example draws extensively on the [Networked A-Frame basic example](https://github.com/networked-aframe/networked-aframe#more-examples), including the avatar design.



### Futures

- Fold these changes & examples back into the [`object-parent` component](https://diarmidmackenzie.github.io/aframe-components/components/object-parent/), as maintained in my [aframe-components](https://diarmidmackenzie.github.io/aframe-components/) collection.
- Add some unit tests for the component, especially for the various NAF race conditions.



​	