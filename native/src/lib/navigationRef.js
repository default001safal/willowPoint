// Imperative navigation helpers so any component can open records, search, or Cue.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function openRecord(layer) {
  if (navigationRef.isReady()) navigationRef.navigate('Record', layer);
}

export function openSearch(initial = {}) {
  if (navigationRef.isReady()) navigationRef.navigate('Search', { initial });
}

export function askCue(question) {
  queueCueQuestion(question);
  if (navigationRef.isReady()) navigationRef.navigate('CueTab', { screen: 'CueAnswer' });
}

// Cross-tab pending question queue (CueChatProvider subscribes).
let listener = null;
export function queueCueQuestion(question) {
  if (listener) listener(question);
  else pendingQueue.push(question);
}
const pendingQueue = [];
export function attachCueQueue(fn) {
  listener = fn;
  while (pendingQueue.length) fn(pendingQueue.shift());
  return () => { if (listener === fn) listener = null; };
}
