# Hand Scaling

Various ways of handling hand scaling for WebXR.

### Quick Links to Demos

- [Smooth manual adjustment](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/manual-smooth/)
- [Incremental manual adjustment](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/manual-increments/)
- [Automatic adjustment (experimental)](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/auto/)
- [Automatic adjustment (experimental) - debug view](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/auto-debug/)

## Background

The WebXR Hand Tracking APIs provide data about positions of joints in hands detected by hand tracking.

However, they don't provide the real-world position data.  Instead, they provide data that is [adjusted to provide a level of anonymization](https://www.w3.org/TR/webxr-hand-input-1/#privacy-security).

The WebXR specs permit rounding of data to an approximate hand size.  However current popular implementations (e.g. on the Meta browser) map the data to a single fixed-size hand model.  This inevitably means that the hand models may be significantly larger or smaller than some users' hands.

This isn't usually too problematic in VR, but in AR (aka Mixed Reality or Passthrough), it can make interactions feel clumsy, and break immersion, if the hand model isn't a good match for the user's real hands.

The demos on this page offers various options for adjusting hand scale:

- Manual adjustment mechanisms, where the user explicitly sets their desired hand size
- An experimental "automatic" adjustment mechanism.

## Manual Adjustment

Manual adjustment techniques require the user to explicitly set the size of their hands using a control mechanism.

Two examples of manual adjustment are provided:

- [Smooth adjustment](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/manual-smooth/): pinching and moving the pinch up/down adjusts the size of both hands.

  This example can be found here

- [Incremental adjustment](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/manual-increments/): right pinch increases the size of both hands; left pinch reduces the size of both hands.

  This example can be found here

## Automatic Adjustment

The goal for automatic adjustment is to adjust hand scale without the user needing to explicitly adjust the size of their hands.

The concept, as shown in this video is as follows:

- The user places their hands with fingertips together
- By using the distance between the two hands when the fingertips are placed together, it's possible to determine an appropriate scale adjustment for the two hands.

The difficulty is determining *when* both hands are in the correct position.

In [this demo](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/auto/), this is achieved by monitoring the vectors between corresponding pairs of fingertips (and thumbtips).  The demo waits for each of these to be:

- Close: a distance of 5cm apart.  Note that this assumes the starting hand size is within 2.5cm of the true size.
- Aligned: a vertical offset of 10mm between the two fingers.
- Stable: the horizontal distance between the two fingers does not vary by more than 10mm over the course of a second.

(all of these parameters are configurable in the `detect-calibration-pose` component)

There is also a ["debug" version of the demo](https://diarmidmackenzie.github.io/aframe-examples/compositions/hand-scaling/auto-debug/), which uses color coded lines to show the status of the fingers:

- dark grey when out of range
- red when in range, but not aligned
- orange when in range and aligned, but not stable
- green when in range, aligned and stable.

When all lines are green, the hands are considered aligned, and the scale is adjusted to match the positions of the hands.  If hands are detected as aligned again, the scale is re-adjusted.

### Problems with automatic adjustment

All very nice in theory, but in practice, there are several problems with this solution.

1. The main problem is the (in)stability of the reported finger positions.  Even when hands are held dead still, the ML-derived hand positions reported over WebXR remain stable, jolting around by 5+mm from one frame to the next.

2. The second problem is that it assumes "correct" user behaviour.  If a user places their hands steadily in the correct positions, but with a space of 2-3cm, this will be detected as the correct position, but the resulting hand scale will be too large.  I had hoped it might be possible to determine whether the fingers are braced together based on the stability of the position data (it being easier to hold fingers dead still when they are braced together).  Unfortunately the variability in the WebXR finger position data is far greater, making it impossible to detect such a difference.

3. A final problem area is that when the hands are larger than they should be, the likelihood of successful pose detection decreases.  The pose detection *can* still work with oversized hands, but larger hands mean even bigger noise which makes it harder for all finger positions to be within thresholds.  Some improvements could be made here:

   - Scale thresholds up/down based on current hand scale

   - Enhance debug lines to be visible even when occluded by the hand models.

   At this point, these improvements don't seem to be worthwhile, given issues 1 & 2 remain, above.



### User-triggered automatic adjustment

Another possible approach would be automatic adjustment, but with an explicit indication from the user when their hands are in position, rather than trying to detect this automatically.

I've not moved forwards with this approach because:

- given that hands need to be in a specific position, the options for a user-generated indication that the are "ready" are limited and not particularly intuitive.  The best option would probably be a fused gaze-based cursor
- when such an additional control is added in, the automatic mechanism ends up being just as complex (in terms of the level of user interaction required) as manual adjustment mechanisms.  Manually adjusting hand size is not particularly difficult, so if an automatic adjustment mechanism isn't any slicker, there's little real benefit.



## Components

A list of all the components used in these examples, together with their schemas...

### hand-tracking-controls

A modified version of the core A-Frame [`hand-tracking-controls`](https://aframe.io/docs/1.5.0/components/hand-tracking-controls.html) component.  If you include this component, it overwrites the default implementation of the component.

This adds 3 additional properties to the component schema:

| Property        | Description                                                  | Default |
| --------------- | ------------------------------------------------------------ | ------- |
| wireframe       | Draws the hand model using a wireframe, rather than a solid mesh.  Gives user a better view of their own hands when adjusting hand model scale in Mixed Reality | false   |
| scale           | A scale factor to apply to the hand model                    | 1       |
| wristAdjustment | A linear adjustment to make to the wrist position.  Measured in metres, along the axis of the wrist. | 0       |

None of the examples linked above adjust wristAdjustment, but it could be adjusted manually in the same way as the scale parameter is.



### pinch-adjust-hand-scale

| Property | Description | Default |
| -------- | ----------- | ------- |
| leftHand  | A selector for the left hand entity (which should have the `hand-tracking-controls `component configured on it). | #lhand  |
| rightHand | A selector for the right hand entity (which should have the `hand-tracking-controls `component configured on it). | #rhand  |
| increment | The percentage increase/decrease of hand scale to apply on each pinch gesture.  Expressed as a value between 0 and 1. | 0.05 (i.e. 5%) |
| enabled | Whether or not the component should operate | true |



### pinch-smooth-hand-scale

| Property | Description | Default |
| -------- | ----------- | ------- |
| leftHand  | A selector for the left hand entity (which should have the `hand-tracking-controls `component configured on it). | #lhand  |
| rightHand | A selector for the right hand entity (which should have the `hand-tracking-controls `component configured on it). | #rhand  |
| enabled   | Whether or not the component should operate                  | true           |

The adjustment scale used (not currently configurable) maps 1m in vertical movement to 100% of hand size, so a 1m vertical movement upwards would scale the hands to 200% of their original size.

Scaling down is limited to 10% of the original size (0.9m of movement) per gesture.



### detect-calibration-pose

| Property | Description | Default |
| -------- | ----------- | ------- |
| leftHand  | A selector for the left hand entity (which should have the `hand-tracking-controls `component configured on it). | #lhand  |
| rightHand | A selector for the right hand entity (which should have the `hand-tracking-controls `component configured on it). | #rhand  |
| maxDistance | The maximum distance between two corresponding fingertips for them to be considered as "in pose".  Note this has to allow for possible mis-sizing of the hand models in either direction. | 0.05 (5cm) |
| maxVerticalOffset | The maximum vertical distance between two corresponding fingertips for them to be considered as "in pose".  Note this has to allow for variation in the WebXR hand data, even when fingers are completely still. | 0.01 (1cm) |
| maxVariation | The maximum horizontal variation in the horizontal distance between two corresponding fingertips for them to be considered as "stable".  Note this has to allow for variation in the WebXR hand data, even when fingers are completely still. | 0.01 (1cm) |
| variationMeasurementTime | The time period over which the horizontal distance between fingertips must be stable, to quality as stable. | 1000 (1sec) |
| enabled | Whether or not the component should operate | true |
| debug | Display connecting lines between fingertip pairs, indicating the current state of pose detection for each pair. | false |
| colorAlignedStable | Color used in debug mode for finger-finger relations that are aligned & stable. | #0f0 |
| colorAlignedUnstable | Color used in debug mode for finger-finger relations that are aligned but unstable. | orange |
| colorNotAligned | Color used in debug mode for finger-finger relations that are not aligned. | red |
| colorOutOfRange | Color used in debug mode for finger-finger relations that are not within `maxDistance.` | #333 |

When a stable pose is detected, this component emits an event  `calibration-pose-detected`.  The event detail contains an array of 5 x Vector3s, each containing the vector offset from the left fingertip (or thumbtip) to the corresponding right fingertip (or thumbtip).



### hand-scale-adjuster

| Property  | Description                                                  | Default |
| --------- | ------------------------------------------------------------ | ------- |
| leftHand  | A selector for the left hand entity (which should have the `hand-tracking-controls `component configured on it). | #lhand  |
| rightHand | A selector for the right hand entity (which should have the `hand-tracking-controls `component configured on it). | #rhand  |

This component listens for the `calibration-pose-detected` event emitted by the `detect-calibration-pose` component, and updates the hand scale based on the data provided in the event detail.

The component also extracts the wrist position from each hand, and uses this, together with the event data to determine an appropriate scale to apply to both hands.
