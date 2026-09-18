import test from 'node:test';
import assert from 'node:assert/strict';
import {timelinePercent} from '../public/timing.mjs';
test('playback stops at its marker even when an animation frame is late',()=>{
  for(const duration of [0.1,0.5,2,8,15]){
    const marker=duration/15*100;
    assert.equal(timelinePercent(duration,duration,15),marker);
    assert.equal(timelinePercent(duration+0.25,duration,15),marker);
    assert.equal(timelinePercent(0,duration,15),0);
    assert.ok(timelinePercent(duration/2,duration,15)<marker);
  }
});
test('shortest and final difficulty timelines are bounded',()=>{
  assert.equal(timelinePercent(1,0.1,0.1),100);
  assert.equal(timelinePercent(-1,2,15),0);
  assert.equal(timelinePercent(1,2,0),0);
});
