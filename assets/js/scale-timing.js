// Measure and Scale keep a 1.2-second cadence; Allocate holds each step 30% longer.
export const SCALE_STEP_INTERVAL = 1200;
export const ALLOCATION_STEP_INTERVAL = SCALE_STEP_INTERVAL * 1.3;
export const NORM_ROW_INTERVAL = SCALE_STEP_INTERVAL;
export const ALLOCATION_REVEAL_DURATION = 700;
// Draw each connector before revealing and transforming its destination tensor.
export const SCALE_TRANSFORM_TIMING = {
  firstArrow: SCALE_STEP_INTERVAL,
  arrowDuration: SCALE_STEP_INTERVAL,
  normalize: SCALE_STEP_INTERVAL * 2,
  normalizeDuration: SCALE_STEP_INTERVAL,
  secondArrow: SCALE_STEP_INTERVAL * 3,
  scale: SCALE_STEP_INTERVAL * 4,
  scaleDuration: SCALE_STEP_INTERVAL,
};
const selectionStart = 2500;
export const ENSEMBLE_TRANSITION_TIMING = {
  selectionStart,
  selectionDuration: SCALE_STEP_INTERVAL,
  frameDuration: 800,
  arrowStart: selectionStart + SCALE_STEP_INTERVAL,
  arrowDuration: SCALE_STEP_INTERVAL,
};
export const VOTE_START = ENSEMBLE_TRANSITION_TIMING.arrowStart + ENSEMBLE_TRANSITION_TIMING.arrowDuration;

// Scroll selects a scene. Its timeline then runs independently of scroll.
export const SCALE_TIMELINES = {
  allocate: { duration: ALLOCATION_STEP_INTERVAL * 5 + 300, events: Array.from({ length: 5 }, (_, i) => ({
    at: i * ALLOCATION_STEP_INTERVAL, phase: i + 1, line: i === 4 ? ['require', '4'] : 'require',
  })) },
  sample: { duration: 2800, events: [{ at: 0, phase: 1, line: '2' }] },
  measure: { duration: NORM_ROW_INTERVAL * 3 + 300, events: [
    { at: 0, phase: 1, line: '3' },
    { at: NORM_ROW_INTERVAL, phase: 2, line: '3' },
    { at: NORM_ROW_INTERVAL * 2, phase: 3, line: '3' },
  ] },
  scale: { duration: SCALE_STEP_INTERVAL * 5 + 300, events: [
    { at: 0, phase: 1, line: '4' },
    { at: SCALE_TRANSFORM_TIMING.firstArrow, phase: 2, line: '4' },
    { at: SCALE_TRANSFORM_TIMING.normalize, phase: 3, line: '4' },
    { at: SCALE_TRANSFORM_TIMING.secondArrow, phase: 4, line: '4' },
    { at: SCALE_TRANSFORM_TIMING.scale, phase: 5, line: '4' },
  ] },
  unchanged: { duration: VOTE_START + 5100, events: [
    { at: 0, phase: 1, line: '5' },
    { at: 1200, phase: 2, line: '6' },
    { at: ENSEMBLE_TRANSITION_TIMING.selectionStart, phase: 3, line: '8' },
    { at: ENSEMBLE_TRANSITION_TIMING.arrowStart, phase: 4, line: '8' },
    { at: VOTE_START, phase: 5, line: '10' },
    { at: VOTE_START + 3400, phase: 6, line: '11' },
  ] },
};

// Algorithm links enter at the start of the corresponding operation.
export const ALGORITHM_TARGETS = {
  require: { kind: 'allocate', at: 0, label: 'Fix before search: play Allocate' },
  1: { kind: 'sample', at: 0, label: 'Line 1: play candidate sampling' },
  2: { kind: 'sample', at: 0, label: 'Line 2: play candidate sampling' },
  3: { kind: 'measure', at: 0, label: 'Line 3: play norm measurement' },
  4: { kind: 'scale', at: 0, label: 'Line 4: play normalization and scaling' },
  5: { kind: 'unchanged', at: 0, label: 'Line 5: play candidate construction' },
  6: { kind: 'unchanged', at: SCALE_TIMELINES.unchanged.events[1].at, label: 'Line 6: play candidate evaluation' },
  7: { kind: 'unchanged', at: selectionStart, label: 'Line 7: play TopK selection' },
  8: { kind: 'unchanged', at: selectionStart, label: 'Line 8: play TopK selection' },
  9: { kind: 'unchanged', at: VOTE_START, label: 'Line 9: play answer generation' },
  10: { kind: 'unchanged', at: VOTE_START, label: 'Line 10: play answer generation' },
  11: { kind: 'unchanged', at: SCALE_TIMELINES.unchanged.events.at(-1).at, label: 'Line 11: play plurality voting' },
  12: { kind: 'unchanged', at: SCALE_TIMELINES.unchanged.events.at(-1).at, label: 'Line 12: play plurality voting' },
  13: { kind: 'unchanged', at: SCALE_TIMELINES.unchanged.events.at(-1).at, label: 'Line 13: play the final prediction' },
};
