import test from 'node:test';
import assert from 'node:assert/strict';
import {timelinePercent} from '../public/timing.mjs';
test('playback stops at the end of each current clue, even when an animation frame is late',()=>{
  for(const duration of [0.1,0.5,2,8,15]){
    assert.equal(timelinePercent(duration,duration,duration),100);
    assert.equal(timelinePercent(duration+0.25,duration,duration),100);
    assert.equal(timelinePercent(0,duration,duration),0);
    assert.equal(timelinePercent(duration/2,duration,duration),50);
  }
});
test('shortest and final difficulty timelines are bounded',()=>{
  assert.equal(timelinePercent(1,0.1,0.1),100);
  assert.equal(timelinePercent(-1,2,15),0);
  assert.equal(timelinePercent(1,2,0),0);
});
