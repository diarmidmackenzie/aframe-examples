



Notes on persistent...

- Doesn't replicate objects to other clients.
- So they need to be explicitly populated in each client
- Need to specify a "networkId" so these sync together
- Issue when new client enters scene, they take control and reset positions etc.   Workaround is to specify "owner: scene" - but that's interfering with my logic over when physics should be active (based on object ownership... so needs some more thought)
- Spawning in persistent objects is particularly complicated and needs lots of special handling - see https://github.com/networked-aframe/networked-aframe/pull/327


Plus objects not actually persisting on exit - why not?

