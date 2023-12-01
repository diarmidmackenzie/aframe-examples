

## Networked Physics

These examples show integration of [Networked A-Frame (NAF)](https://github.com/networked-aframe) with physics

So far we just have an example for [A-Frame Physics System with the Ammo driver](https://github.com/c-frame/aframe-physics-system/blob/master/AmmoDriver.md).

[Ammo example](./ammo/)

This shows the following:

- dynamic physics objects replicated between NAF clients
- objects can be manipulated by mouse using `aframe-drag-controls` (using a [build with some fixes](https://github.com/diarmidmackenzie/aframe-drag-controls/tree/fix-performance)) in any client
- in VR, objects can be manipulated using [`aframe-laser-manipulation`](https://diarmidmackenzie.github.io/aframe-components/components/laser-manipulation/).  This uses `controlMethod: transform` to avoid issues with re-parenting (see below)
- additional clients can connect and disconnect, without disrupting the scene.

<video src="https://github.com/diarmidmackenzie/aframe-examples/assets/16045703/ce573717-2f7d-4b35-a9e0-4d59f93455a3">
</video>



The example currently uses a single global room, so if you happen to join at the same time as another user anywhere in the world, you'll be in session with them.  Private rooms can easily be implemented in NAF, but it simplifies the demo to have a single global room.

### How does it work?

At a high level it works like this:

- each client runs its own physics simulation, with its own instantiation of the static physics bodies
- each dynamic physics body is simulated by exactly one client, and its position is replicated to all the other clients, where the same body is instantiated as a kinematic body
- dynamic bodies are not necessarily all simulated by the same client - the work of simulating the dynamic bodies is distributed across clients.
- a given dynamic body will be simulated by the client where it was last grabbed & released.

My initial plan was to run simulation of dynamic bodies on a single client designated as the "physics lead" since I thought that would give a better overall simulation.  However what I found was that this didn't give great behaviour when grabbing and releasing a body on a client that wasn't the lead: the body tends to jerk on release in quite an unrealistic way.  So I switched to an approach where the client where the body was grabbed and released takes over simulation of that dynamic body.  Based on my limited testing, this approach seems to work better.  This may not be ideal for all cases, but it works well for some simple physics simulations.

For a bit more detail, some quick additional Q&A...



**Q.  How are you handling grabbing / dragging?**

For both `aframe-drag-controls` and `aframe-laser-manipulation`, the position of a grabbed or dragged object is updated directly by the control system.  To allow this to happen, the physics body is set to "kinematic" while it is grabbed or dragged.  This is implemented via the `networked-body` component - see below.

An alternative approach to grabbing is to leave the grabbed object as a dynamic body, and use constraints to implement the grabbing (e.g. this is the approach used by [superhands](https://github.com/c-frame/aframe-super-hands-component) when used with physics).  I haven't yet looked at how that approach can be combined with networking, but there's likely to be some significant differences (see further Q below on constraints).



**Q. How are collisions handled between dynamic bodies that are simulated on different clients?**

This seems to work OK.  My understanding of how it works is as follows...

If client 1 simulates object A, and client 2 simulates object B, and A hits B, then the clients see the following:

- client 1 sees object A collide with kinematic object B'.  It does nothing with B', and makes adjustments to object A to reflect the collision.  Shortly, it learns of the effects of the collision on B via NAF and adjusts B' accordingly.
- client 2 sees kinematic object A' collide with object B  It does nothing with A', and makes adjustments to object B to reflect the collision.  Shortly, it learns of the effects of the collision on A via NAF and adjusts A' accordingly.

Network delays between the clients will mean that the simulation of the collision here is not perfect, but it seems to be adequate to generate reasonably realistic-looking physics.



**Q. What about constraints between bodies?**

I haven't done any testing with constraints yet, but in theory they should be able to work in a similar way to collisions, even if the bodies on either end of the constraint are simulated on different clients.

The key point is that constraints will still apply between the dynamic body simulated on a client, and the kinematic body that mirrors the movements of the dynamic body that's simulated on the other client.

There may be some cases where the constraint solver doesn't work quite so well due to the latencies involved in mirroring positions between clients, but in many cases, things ought to work reasonably well.



**Q. What happens if a body is grabbed on 2 different clients at once?**

A. Not 100% sure, as I didn't test this yet!  However I'd expect that each attempt to grab an object will result in a request to take ownership of the entity from a NAF perspective.  This means that whoever grabs an object second should end up in control of it.



**Q. What are the issues with re-parenting?**

[Re-parenting](https://github.com/diarmidmackenzie/aframe-components/tree/main/components/object-parent) is a common technique used to attach one object to another.

Unfortunately re-parenting can cause problems with object positions in NAF if the parent-child relationships and all ancestor objects in the tree are not replicated to all clients.

This example avoids these problems by using `controlMethod: transform` in `aframe-laser-controls`, which avoids re-parenting.  `aframe-drag-controls` doesn't use re-parenting either.

It should be possible to make re-parenting work with NAF, but there is still work to be done here to get this all working correctly.



### A-Frame Components

Here's a summary of the bespoke A-Frame components used in this demo.  See the [source code](index.js) for more details.

At this point, I don't consider these components or the interfaces they offer to be stable.  If they become stable in future, I may migrate some of these to my [`aframe-components`](https://diarmidmackenzie.github.io/aframe-components) repo.

#### physics-grabbable

This component is set on each grabbable object in the HTML.  It:

- puts the `networked-body` component in place
- listens for events that indicate an entity is grabbed / released (`dragstart` and `dragend`), and adjusts the body to kinematic / dynamic based on whether it is grabbed
- takes NAF ownership of the entity when it is grabbed.
  

#### networked-body

This component (and very small associated system) implements the networked physics for a body.

Schema as follows:

| Property       | Description                                                  | Default |
| -------------- | ------------------------------------------------------------ | ------- |
| kinematic      | Toggle the body between kinematic and dynamic mode.  Note that physics bodies that are NAF-owned by another client are always kinematic, regardless of this setting. | false   |
| ownershipTimer | How long (msecs) to wait after connecting to the NAF server for someone to assert ownership of this body.  After this time, this client will take ownership of this body. | 1000    |

This component

- puts in place the necessary components for physics simulation (e.g. `ammo-body` and `ammo-shape` for the `aframe-physics system ` with the Ammo driver).
- includes a workaround for a bug in `aframe-physics-system` that can cause problems when switching between kinematic and dynamic.
- listens for changes of NAF ownership of an entity, and switches the body to kinematic whenever it is not owned by this client.
- on connecting to the NAF server, waits for `ownershipTimer` msecs, and then takes ownership of the body if it has not been claimed by another client. 



#### hidden-until-ownership-changed

This cosmetic component provides clean behaviour when initially connecting to the NAF server, avoiding objects appearing to spawn in one place, and then jump to a different place.

When the scene is loading, entities with this attribute are hidden (and their physics interactions disabled), until a client has taken ownership of them.



### How the example uses NAF

For dynamic networked physics bodies, the example uses the [`persistent` flag](https://github.com/networked-aframe/networked-aframe#example-attachtemplatetolocalfalse:~:text=true-,persistent,-On%20remote%20creator) on the `networked` component.

Without this flag, a body would be associated with one particular client, and will disappear when the client disconnects.  That's nice behaviour for avatars, but we want networked physics bodies to persist when clients disconnect from the room.

The `persistent` flag is not very well described in the current NAF documentation (as of 1 December 2023), but there are some additional notes [here](https://github.com/networked-aframe/networked-aframe/issues/265).

In particular:

- Persistent entities need to be explicitly created on each client
- A `networkId` has to be explicitly specified, so that persistent entries created on different clients can be associated with each other
- If persistent entities are specified in HTML on each client (as we do in this example), each client will assume it owns the entity.  That's not what we want - when the 2nd, 3rd etc. clients join a room, we don't want them to grab ownership of anything.  To avoid this, we explicitly specify an `owner` of `"scene"`, and implement logic in `networked-body` to wait to see whether any other client asserts ownership of the body, before grabbing it.
- In addition to all the above, persistent entities are allocated a new owner when their owner disconnects, meaning that our networked physics bodies persist as long as at least one client remains in the room.

Note the spawning persistent objects is particularly complicated and needs lots of special handling - see [this issue](https://github.com/networked-aframe/networked-aframe/pull/327).  We don't yet have an example showing how to do this together with networked physics.

Note also that if *all* clients disconnect from a room, even persistent entities will lose their state - they will be recreated from scratch in their original positions the next time someone joins the room.  Persistence of state between sessions is a separate issue that would requires a back-end, and not handled by this example.



### Futures

Some key things it would be nice to add:

- Examples for other physics engines - e.g. PhysX and Cannon
- An example showing how re-parenting can work with NAF and physics
- An example showing spawning of persistent physics entities.
- An example showing constraints, and whether / how these can work between bodies being simulated by independent clients.

​	