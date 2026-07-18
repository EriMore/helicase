# Helicase Design System

## System identity

Helicase is an instrument of luminous evidence. Its design system must make a technical object feel immediate without making it simplistic.

## System layers

1. **World:** map, structure, atmosphere, light, depth.
2. **Orientation:** identity rail, scale cue, return path, current state.
3. **Interpretation:** copilot, confidence legend, provenance, explanation.
4. **Action:** focus, representation, compare, design, guided tours.
5. **Resolution:** score card, citation, uncertainty qualifier, next step.

## Rules

- One dominant object per scene.
- One primary action per state.
- Use geometry and motion before adding another panel.
- Keep all scientific qualifiers near the value they qualify.
- Prefer transitions that preserve continuity over overlays that obscure it.
- Components should expose semantic states rather than visual implementation details.

## States every component must consider

Idle, hovered, selected, focused, loading, streaming, resolving, resolved, interrupted, unavailable, reduced-motion, and error.

## Source of truth

Tokens live in [DESIGN_TOKENS.md](DESIGN_TOKENS.md). Interaction semantics live in [INTERACTION_SYSTEM.md](INTERACTION_SYSTEM.md). Rendering behavior remains subordinate to the domain contracts in [ARCHITECTURE.md](../../ARCHITECTURE.md).
