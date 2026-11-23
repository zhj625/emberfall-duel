// Rendering for Emberfall Duel: every visible thing is built here from
// the engine's state. No game rules live in this file; it reads totals
// and effective powers from the engine and draws them.

import { ABILITIES, SUITS } from './cards.js';
import { YOU, WARDEN, powerInRow, rowTotal } from './game.js';

const SIGIL_ART = {
  ember: (colour) =>
    `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 2c5 11 15 17 15 29a15 15 0 1 1-30 0c0-12 10-18 15-29z" fill="${colour}"/><path d="M32 34c3 4 5 6 5 9a5 5 0 1 1-10 0c0-3 2-5 5-9z" fill="#f8eed6"/></svg>`,
  tide: (colour) =>
    `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3c7 12 15 20 15 30a15 15 0 1 1-30 0c0-10 8-18 15-30z" fill="${colour}"/><path d="M18 42q7-5 14 0t14 0" fill="none" stroke="#f8eed6" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  thorn: (colour) =>
    `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M52 6C30 10 15 25 12 52c27-3 42-18 40-46z" fill="${colour}"/><path d="M17 47C27 33 38 21 49 11" fill="none" stroke="#f8eed6" stroke-width="3.2" stroke-linecap="round"/></svg>`,
  star: (colour) =>
    `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 2l7 23 23 7-23 7-7 23-7-23-23-7 23-7z" fill="${colour}"/></svg>`,
};

export function sigilSvg(suit) {
  return SIGIL_ART[suit](SUITS[suit].colour);
}

function crownSvg(won) {
  return `<svg viewBox="0 0 64 64" class="${won ? 'won' : 'lost'}" aria-hidden="true"><path d="M6 44L2 16l16 10L32 6l14 20 16-10-4 28zM6 48h52v7H6z" fill="currentColor"/></svg>`;
}

function crownsHtml(count) {
  return `<span class="crowns">${crownSvg(count >= 1)}${crownSvg(count >= 2)}</span>`;
}

/**
 * One card's element. In a row it shows the power it counts for now
 * (with a green or red delta when the table has changed it); in a hand
 * it shows its printed power.
 */
export function cardElement(card, { effective = null, faceDown = false } = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.instanceId = card.instanceId;
  el.style.setProperty('--suit', SUITS[card.suit].colour);
  if (faceDown) {
    el.classList.add('card-back');
    el.innerHTML = `<div class="sigil-big">${sigilSvg('star')}</div>`;
    return el;
  }
  const shown = effective ?? card.power;
  const delta = shown - card.power;
  const deltaHtml = delta !== 0
    ? `<span class="delta ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '+' : '−'}${Math.abs(delta)}</span>`
    : '';
  if (card.debuff > 0) el.classList.add('withered');
  el.innerHTML = `
    <div class="top">
      <span class="power">${shown}${deltaHtml}</span>
      <span class="sigil-small">${sigilSvg(card.suit)}</span>
    </div>
    <div class="sigil-big">${sigilSvg(card.suit)}</div>
    <div class="card-name">${card.name}</div>
    ${card.ability ? `<div class="ability">${ABILITIES[card.ability].label}</div>` : ''}`;
  el.title = card.ability
    ? `${card.name} — ${SUITS[card.suit].label} ${card.power}. ${ABILITIES[card.ability].text}`
    : `${card.name} — ${SUITS[card.suit].label} ${card.power}.`;
  return el;
}

function bannerHtml(state, side) {
  const isWarden = side === WARDEN;
  const name = isWarden ? 'The Warden' : 'You';
  const sub = isWarden ? 'Keeper of the table' : 'Challenger';
  const initial = isWarden ? 'W' : 'Y';
  const toMove = state.phase === 'play' && state.turn === side && !state.passed[side];
  const status = state.passed[side]
    ? '<span class="chip passed">Passed</span>'
    : toMove
      ? '<span class="chip hot">To move</span>'
      : '<span class="chip">Waiting</span>';
  const handInfo = isWarden
    ? `<span class="mini-hand"><span class="backs">${'<i></i>'.repeat(Math.min(7, state.hands[side].length))}</span><span>${state.hands[side].length} in hand</span></span>`
    : `<span class="chip">${state.decks[side].length} in deck</span>`;
  return `
    <span class="avatar ${isWarden ? 'warden' : ''}">${initial}</span>
    <span class="who"><span class="name">${name}</span><span class="sub">${sub}</span></span>
    ${crownsHtml(state.crowns[side])}
    <span class="spacer"></span>
    ${handInfo}
    ${status}`;
}

let previousTotals = { you: null, warden: null };

function scoreStripHtml(state) {
  const youTotal = rowTotal(state, YOU);
  const wardenTotal = rowTotal(state, WARDEN);
  const bumpYou = previousTotals.you !== null && previousTotals.you !== youTotal ? ' bump' : '';
  const bumpWarden = previousTotals.warden !== null && previousTotals.warden !== wardenTotal ? ' bump' : '';
  previousTotals = { you: youTotal, warden: wardenTotal };
  return `
    <span class="total player-side"><span class="tag">You</span><span class="num${bumpYou}">${youTotal}</span></span>
    <span id="round-badge"><span class="round">Round ${state.round} of 3</span><br><span class="vs">— row totals —</span></span>
    <span class="total warden-side"><span class="num${bumpWarden}">${wardenTotal}</span><span class="tag">Warden</span></span>`;
}

function rowInto(container, state, side, label, emptyNote) {
  container.innerHTML = '';
  const tag = document.createElement('span');
  tag.className = 'row-label';
  tag.textContent = label;
  container.appendChild(tag);
  const row = state.rows[side];
  if (row.length === 0) {
    const note = document.createElement('span');
    note.className = 'empty-note';
    note.textContent = emptyNote;
    container.appendChild(note);
    return;
  }
  for (const card of row) {
    const el = cardElement(card, { effective: powerInRow(row, card) });
    if (state.lastPlay && state.lastPlay.instanceId === card.instanceId) el.classList.add('just-played');
    container.appendChild(el);
  }
}

/** Draw the whole table from the state. `ui` carries the selected hand card. */
export function render(state, ui = {}) {
  document.getElementById('warden-banner').innerHTML = bannerHtml(state, WARDEN);
  document.getElementById('player-banner').innerHTML = `
    <span class="avatar">Y</span>
    <span class="who"><span class="name">You</span><span class="sub">Challenger</span></span>
    ${crownsHtml(state.crowns.you)}
    <span id="narration">${state.narration}</span>
    <button class="btn" id="pass-btn" ${ui.canPass ? '' : 'disabled'}>Pass</button>`;

  rowInto(document.getElementById('warden-row'), state, WARDEN, "The Warden's row", 'The Warden has played nothing yet.');
  rowInto(document.getElementById('player-row'), state, YOU, 'Your row', 'Your row is empty — play a card.');
  document.getElementById('score-strip').innerHTML = scoreStripHtml(state);

  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  if (state.phase === 'play' && state.hands.you.length === 0) {
    hand.innerHTML = '<span class="turn-hint">Your hand is spent for this round.</span>';
  } else if (state.phase === 'play' && state.passed.you) {
    hand.innerHTML = '<span class="turn-hint">You have passed. The round plays out without you.</span>';
  } else {
    for (const card of state.hands.you) {
      const el = cardElement(card);
      el.classList.add('in-hand');
      if (ui.selectedId === card.instanceId) el.classList.add('selected');
      hand.appendChild(el);
    }
  }
}

/** Fill and show the title screen. */
export function renderTitle(state) {
  const screen = document.getElementById('title-screen');
  screen.innerHTML = `
    <div class="panel">
      <div class="sigil-row">${sigilSvg('ember')}${sigilSvg('tide')}${sigilSvg('thorn')}${sigilSvg('star')}</div>
      <h1 class="game-title">EMBERFALL</h1>
      <p class="game-subtitle">A duel of crowns and sigils, at one small table.</p>
      <div class="rules">
        <p>Each round, you and <b>the Warden</b> draw seven cards and take turns
        playing one — or <b>passing</b>, which sits you out for the round.
        The higher row total when both have passed takes a <b>crown</b>; first to two crowns wins.</p>
        <p>Cards conspire: <b>Bond</b> doubles beside a suit-mate, <b>Rally</b> lifts its row,
        <b>Hex</b> withers the strongest enemy, and a <b>Spy</b> joins the enemy row
        but lets its owner draw two. Passing early can steal a round the Warden thinks is won.</p>
      </div>
      <button class="btn big" id="begin-btn">Begin the duel</button>
    </div>`;
  screen.classList.remove('hidden');
}

/** Fill and show the end screen for a finished duel. */
export function renderEnd(state) {
  const screen = document.getElementById('end-screen');
  const won = state.winner === YOU;
  const rounds = state.roundTotals.map((t, i) => `Round ${i + 1}: ${t.you}–${t.warden}`).join(' · ');
  screen.innerHTML = `
    <div class="panel">
      ${won ? '<div class="burst"></div>' : ''}
      <div class="sigil-row">${sigilSvg(won ? 'star' : 'tide')}</div>
      <h1 class="end-title ${won ? 'win' : 'loss'}">${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="game-subtitle">${won ? 'Two crowns, and the table is yours.' : 'The Warden keeps the table — this time.'}</p>
      <div class="end-stats">
        Crowns — You ${state.crowns.you} · The Warden ${state.crowns.warden}<br>
        <span class="dim">${rounds}</span>
      </div>
      <button class="btn big" id="again-btn">Play again</button>
    </div>`;
  screen.classList.remove('hidden');
}

/** Flash a message across the table (a round result, most often). */
export function showRoundBanner(text) {
  const banner = document.getElementById('round-banner');
  banner.textContent = text;
  banner.classList.remove('hidden');
}

export function hideRoundBanner() {
  document.getElementById('round-banner').classList.add('hidden');
}

export function hideOverlays() {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('end-screen').classList.add('hidden');
}
