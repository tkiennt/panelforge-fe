# Editor review screens: basic feature set

Goal: one review layout for every Editor gate (submission in the centre, Notes / Checks tabs, Return / Approve bar), basic features first, no advanced tool clutter. Source rules: CF3 in `PanelForge_FA26SE251/docs/requirements/PanelForge_5_Core_Flows.md`, BR-06, BR-21, BR-16, BR-01.

## Done
- [x] Editor Desk queue with Gate 1 / Gate 2 by stage slug
- [x] Script review: line/scene notes become anchored change requests (`SceneId`, `ScriptLineId`, `QuotedText`)
- [x] Shared review pieces (`review-shared/`): CR status, per-submission drafts, `ReasonForm`, `DecisionBar`
- [x] Artwork review for Page/Panel work (`ReviewView`): current submission, side-by-side compare with the last decided submission, area marking as drafts, verify / reopen / drop, visual consistency triage, impact review
- [x] Removed from the Editor review: swipe, onion-skin, pixel diff, fullscreen, Preview Link modal (still on the Producer screen), demo "approve everything" buttons
- [x] Fixed `getAssignmentById` argument order in `ScriptReviewView` (script decisions were never available)

## Next
- [ ] Chapter-level Review (`ChapterReviewView`): move to the same layout (page list on the left), return work per target assignment with the shared notes tab, drop the local-only checklist and remaining `window.prompt`
- [ ] Editorial clearance before Producer release gate (BR-28 checklist)
