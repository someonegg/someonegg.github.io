(function (root) {
  'use strict';
  const levels = [
    {
      id: 'shelter', name: '给它一个屋顶', concept: '支撑',
      hint: '线会保持形状，但会下落。让防线的两端落在平台上。',
      dog: { x: 300, y: 794 }, hives: [{ x: 130, y: 250, count: 5 }],
      platforms: [{ x: 300, y: 830, w: 360, h: 28 }],
      inkLimit: 500, inkTarget: 270, dangerY: 1040
    },
    {
      id: 'side', name: '守住侧面的入口', concept: '侧面防护',
      hint: '两处蜂群都会寻找左侧入口。借助顶棚和右墙，把入口的挡板撑稳。',
      dog: { x: 300, y: 794 }, hives: [{ x: 80, y: 765, count: 3 }, { x: 80, y: 380, count: 3 }],
      platforms: [{ x: 300, y: 830, w: 270, h: 28 }, { x: 310, y: 756, w: 200, h: 28 }, { x: 400, y: 793, w: 20, h: 46 }],
      inkLimit: 280, inkTarget: 140, dangerY: 1040
    },
    {
      id: 'basket', name: '小心下方的蜜蜂', concept: '悬挂承托',
      hint: '脚下没有地面，蜜蜂还在下方。上方平台的两端能成为支点。',
      dog: { x: 300, y: 745 }, hives: [{ x: 300, y: 890, count: 7 }],
      platforms: [{ x: 300, y: 695, w: 140, h: 24 }],
      inkLimit: 720, inkTarget: 530, dangerY: 1040
    },
    {
      id: 'bridge', name: '先接住，再保护', concept: '缺口承托',
      hint: '小狗脚下没有平台。先搭一座有支撑的桥，再考虑头顶。',
      dog: { x: 300, y: 768 }, hives: [{ x: 100, y: 300, count: 6 }],
      platforms: [{ x: 190, y: 830, w: 120, h: 28 }, { x: 410, y: 830, w: 120, h: 28 }],
      inkLimit: 780, inkTarget: 530, dangerY: 1040
    },
    {
      id: 'balance', name: '错落的平台', concept: '综合运用',
      hint: '小狗偏在右侧，两边支点也不一样高。观察防线落下后，哪一边会先碰到平台。',
      dog: { x: 340, y: 732 }, hives: [{ x: 90, y: 325, count: 5 }, { x: 510, y: 365, count: 5 }],
      platforms: [{ x: 200, y: 850, w: 110, h: 28 }, { x: 430, y: 785, w: 110, h: 28 }],
      inkLimit: 860, inkTarget: 610, dangerY: 1040
    }
  ];
  if (typeof module === 'object' && module.exports) module.exports = levels;
  else root.SAVE_THE_DOGE_LEVELS = levels;
})(typeof globalThis !== 'undefined' ? globalThis : this);
