// The screenshot scenes behind ?shot=title|table|win|loss&seed=N.
//
// Each scene drives the real engine — the title scene deals a real first
// round behind its overlay, the table scene plays real opening moves,
// and the win and loss scenes play whole duels with a strong policy on
// one side and a feeble one on the other — so every screenshot is the
// game itself at a moment it can really reach, and the same seed always
// builds the same scene.

import { YOU, WARDEN, createDuel, beginDuel, playCard, passTurn, rowTotal, powerInRow } from './game.js';

function playFromHand(state, side, predicate) {
  const card = state.hands[side].find(predicate);
  if (card) return playCard(state, side, card.instanceId);
  const any = state.hands[side][0];
  return any ? playCard(state, side, any.instanceId) : passTurn(state, side);
}

function highestPower(state, side) {
  return [...state.hands[side]].sort((a, b) => b.power - a.power)[0];
}

function lowestPower(state, side) {
  return [...state.hands[side]].sort((a, b) => a.power - b.power)[0];
}

/** The power a card would add to its owner's row if played now. */
function gainOf(state, side, card) {
  if (card.ability === 'spy') return -card.power;
  const row = state.rows[side];
  const before = row.reduce((sum, held) => sum + powerInRow(row, held), 0);
  const trial = [...row, card];
  return trial.reduce((sum, held) => sum + powerInRow(trial, held), 0) - before;
}

function strongestPlay(state, side) {
  const hand = state.hands[side];
  if (hand.length === 0) return passTurn(state, side);
  if (state.passed[side === YOU ? WARDEN : YOU] && rowTotal(state, side) > rowTotal(state, side === YOU ? WARDEN : YOU)) {
    return passTurn(state, side);
  }
  const best = [...hand].sort((a, b) => gainOf(state, side, b) - gainOf(state, side, a))[0];
  return playCard(state, side, best.instanceId);
}

function feeblestPlay(state, side) {
  const hand = state.hands[side];
  if (hand.length === 0) return passTurn(state, side);
  const foe = side === YOU ? WARDEN : YOU;
  if (rowTotal(state, foe) - rowTotal(state, side) >= 4 || hand.length <= 2) return passTurn(state, side);
  const worst = [...hand].sort((a, b) => gainOf(state, side, a) - gainOf(state, side, b))[0];
  return playCard(state, side, worst.instanceId);
}

/** Play a whole duel: `strongSide` plays well, the other side plays badly. */
function directDuel(state, strongSide) {
  let guard = 0;
  while (state.phase === 'play' && guard++ < 400) {
    const side = state.turn;
    if (side === strongSide) strongestPlay(state, side);
    else feeblestPlay(state, side);
  }
}

/** A mid-round table: six opening plies, chosen to show the mechanics. */
function tableScene(state) {
  const yourPlays = [
    (s) => playFromHand(s, YOU, (c) => c.power >= 7),
    (s) => playFromHand(s, YOU, (c) => c.ability === 'bond' || c.ability === 'rally') || playFromHand(s, YOU, () => true),
    (s) => {
      const best = highestPower(s, YOU);
      return best ? playCard(s, YOU, best.instanceId) : passTurn(s, YOU);
    },
  ];
  const wardenPlays = [
    (s) => playFromHand(s, WARDEN, (c) => c.ability === 'spy'),
    (s) => playFromHand(s, WARDEN, (c) => c.ability === 'hex'),
    (s) => {
      const mid = [...s.hands[WARDEN]].sort((a, b) => a.power - b.power)[Math.floor(s.hands[WARDEN].length / 2)];
      return mid ? playCard(s, WARDEN, mid.instanceId) : passTurn(s, WARDEN);
    },
  ];
  for (let ply = 0; ply < 6 && state.phase === 'play' && state.round === 1; ply += 1) {
    if (state.turn === YOU) yourPlays.shift()(state);
    else wardenPlays.shift()(state);
  }
  state.narration = 'Your move. The Warden watches, and waits.';
}

/** Build the named scene's state. */
export function buildScene(name, seed) {
  const state = createDuel(seed);
  beginDuel(state);
  if (name === 'table') tableScene(state);
  if (name === 'win') directDuel(state, YOU);
  if (name === 'loss') directDuel(state, WARDEN);
  return state;
}
