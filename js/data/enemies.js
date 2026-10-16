(function (HH) {
  'use strict';
  HH.data.enemies = {
    peasant: { id: 'peasant', name: 'Peasant Raider', hp: 3, speed: 1.0, steals: 1, reward: 4, armor: 0, radius: 10, flying: false, splitInto: null,
      colors: { body: '#C9A15B', helmet: '#9AA3AD', trim: '#7A5230' } },
    scout: { id: 'scout', name: 'Scout Rider', hp: 6, speed: 1.8, steals: 1, reward: 5, armor: 0, radius: 12, flying: false, splitInto: null,
      colors: { body: '#4F7BC4', helmet: '#B8C0C8', trim: '#8B5A2B' } },
    militia: { id: 'militia', name: 'Militia', hp: 12, speed: 1.0, steals: 1, reward: 6, armor: 0, radius: 11, flying: false,
      splitInto: { type: 'peasant', count: 2 },
      colors: { body: '#B5443B', helmet: '#8E99A4', trim: '#E8D27A' } },
    shieldbearer: { id: 'shieldbearer', name: 'Shieldbearer', hp: 18, speed: 0.9, steals: 1, reward: 9, armor: 0.5, radius: 12, flying: false, splitInto: null,
      colors: { body: '#5B6B7A', helmet: '#C3CBD3', trim: '#D9A93A' } }
  };
})(globalThis.HH);
