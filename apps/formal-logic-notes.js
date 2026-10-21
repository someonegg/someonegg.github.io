'use strict';
(() => {
  const rules = {
    mp: {
      name: '肯定前件', premise: 'P', conclusion: 'Q', valid: true,
      example: '如果下雨，地面就湿；下雨了；所以地面湿了。',
      second: p => p, result: (p, q) => q,
      explanation: '没有反例：当前提 P → Q 和 P 都真时，Q 必须为真。其他赋值中即使结论为假，也不构成反例，因为至少有一个前提不成立。'
    },
    ac: {
      name: '肯定后件', premise: 'Q', conclusion: 'P', valid: false,
      example: '如果下雨，地面就湿；地面湿了；所以一定下雨了。',
      second: (p, q) => q, result: p => p,
      explanation: '反例在第三行：没有下雨，但洒水让地面湿了。两个前提都成立，结论“下雨了”却为假。这就足以证明该推理形式无效。'
    },
    da: {
      name: '否定前件', premise: '¬P', conclusion: '¬Q', valid: false,
      example: '如果下雨，地面就湿；没有下雨；所以地面一定不湿。',
      second: p => !p, result: (p, q) => !q,
      explanation: '反例仍在第三行：没有下雨，但洒水让地面湿了。两个前提都成立，结论“地面不湿”却为假。不下雨，并不能排除其他使地面湿的原因。'
    }
  };
  const assignments = [[true, true], [true, false], [false, true], [false, false]];
  const tabs = [...document.querySelectorAll('[data-rule]')];
  const word = value => value ? '真' : '假';

  function selectRule(key, focus = false) {
    const rule = rules[key];
    tabs.forEach(tab => {
      const selected = tab.dataset.rule === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    document.getElementById('rule-panel').setAttribute('aria-labelledby', `rule-${key}`);
    document.getElementById('rule-name').textContent = rule.name;
    document.getElementById('premise-two').textContent = rule.premise;
    document.getElementById('proof-conclusion').textContent = rule.conclusion;
    document.getElementById('premise-heading').replaceChildren('前提 2', document.createElement('br'), rule.premise);
    document.getElementById('conclusion-heading').replaceChildren('结论', document.createElement('br'), rule.conclusion);
    document.getElementById('rule-example').textContent = rule.example;
    const status = document.getElementById('validity');
    status.textContent = rule.valid ? '有效 · 无反例' : '无效 · 存在反例';
    status.classList.toggle('invalid', !rule.valid);
    const body = document.getElementById('truth-body');
    body.replaceChildren();
    assignments.forEach(([p, q]) => {
      const conditional = !p || q;
      const second = rule.second(p, q);
      const conclusion = rule.result(p, q);
      const premisesTrue = conditional && second;
      const counterexample = premisesTrue && !conclusion;
      const row = document.createElement('tr');
      row.classList.toggle('premises-true', premisesTrue);
      row.classList.toggle('counterexample', counterexample);
      const check = counterexample ? '反例' : premisesTrue ? '前提真，结论真' : '前提未全真';
      [word(p), word(q), word(conditional), word(second), word(conclusion), check].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      });
      body.append(row);
    });
    document.getElementById('counter-explanation').textContent = rule.explanation;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectRule(tab.dataset.rule));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectRule(tabs[next].dataset.rule, true);
      }
    });
  });
  selectRule('mp');

  const navLinks = [...document.querySelectorAll('.sidebar nav a')];
  function updateNav() {
    let current = navLinks[0];
    navLinks.forEach(link => {
      if (document.querySelector(link.hash).getBoundingClientRect().top <= 150) current = link;
    });
    navLinks.forEach(link => {
      const active = link === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateNav(); scheduled = false; });
  }, { passive: true });
  updateNav();
})();
