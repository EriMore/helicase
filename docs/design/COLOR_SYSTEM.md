# Color System

## Semantic palette

| Role | Direction | Meaning |
|---|---|---|
| Space | Near-black blue-black | Base environment and negative space. |
| Structure | Cool luminous neutrals | Molecular presence without arbitrary decoration. |
| Confidence-high | Blue/cyan | Model trusts this region more strongly. |
| Confidence-low | Amber/orange haze | Prediction is less certain; never treat as failure by default. |
| Generation | Restrained violet | A candidate is being created or replayed. |
| Evidence | Soft white | Labels, citations, and readable content. |
| Warning | Warm red, sparingly | Error, incompatibility, or safety-relevant interruption. |

## Rules

Color is a data channel. Every semantic color must have a text, shape, motion, or texture companion. Avoid rainbow scales. Avoid using generation violet for ordinary interface emphasis.

## Contrast

Text and controls must remain readable against the space field and luminous structures. Bloom must never lower the contrast of a scientific qualifier.

## Confidence X-ray

The X-ray is not a color filter. Trusted cores remain crisp; uncertain regions gain translucency, volume, and a restrained wobble. The legend must state what confidence means and what it does not mean.
