import { babyEvents } from './baby.js';
import { childEvents } from './child.js';
import { juniorEvents } from './junior.js';
import { highEvents } from './high.js';
import { collegeEvents } from './college.js';
import { adultEvents } from './adult.js';
import { middleEvents } from './middle.js';
import { seniorEvents } from './senior.js';

export const events = [
  ...babyEvents, ...childEvents, ...juniorEvents, ...highEvents,
  ...collegeEvents, ...adultEvents, ...middleEvents, ...seniorEvents,
];
export const stages = ['baby', 'child', 'junior', 'high', 'college', 'adult', 'middle', 'senior'];
export default events;
