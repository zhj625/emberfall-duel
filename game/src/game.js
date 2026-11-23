// The duel engine of Emberfall Duel: state, rules and scoring.
// Pure logic with no DOM in it, so it can be driven by the page, by the
// screenshot scenes, or by a headless self-play test alike.
//
// A duel is at most three rounds. Each round both duelists draw a fresh
// hand of seven from their own shuffled deck, then take turns playing one
// card or passing; a duelist who has passed sits out the rest of the
// round. When both have passed, the higher row total takes a crown.
// Two crowns win the duel; if crowns are level after three rounds, the
// higher combined power over all rounds wins.

import { buildDeck, HAND_SIZE, CROWNS_TO_WIN, MAX_ROUNDS } from './cards.js';
import { mulberry32, shuffled } from './random.js';

export const YOU = 'you';
export const WARDEN = 'warden';

export function otherSide(side) {
  return side === YOU ? WARDEN : YOU;
}

export function displayName(side) {
  return side === YOU ? 'You' : 'The Warden';
}

/** A new duel, ready at its title screen; call beginDuel to deal round 1. */
export function createDuel(seed) {
  return {
    rng: mulberry32(seed),
    phase: 'title', // title | play | duel-over
    round: 1,
    crowns: { you: 0, warden: 0 },
    roundTotals: [],
    roundStarter: YOU,
    turn: YOU,
    passed: { you: false, warden: false },
    hands: { you: [], warden: [] },
    rows: { you: [], warden: [] },
    decks: { you: [], warden: [] },
    narration: 'The table is set. First to two crowns takes the duel.',
    lastPlay: null, // { side, instanceId } of the card most recently played
    roundResult: null, // { you, warden, winner } of the round just finished
    winner: null,
  };
}

/** Deal a round: fresh shuffled decks, fresh hands, empty rows. */
export function startRound(state) {
  for (const side of [YOU, WARDEN]) {
    const deck = shuffled(state.rng, buildDeck(side));
    state.hands[side] = deck.slice(0, HAND_SIZE);
    state.decks[side] = deck.slice(HAND_SIZE);
    state.rows[side] = [];
    state.passed[side] = false;
  }
  state.turn = state.roundStarter;
  state.lastPlay = null;
  state.narration = `Round ${state.round}. ${displayName(state.roundStarter)} lead${state.roundStarter === YOU ? '' : 's'} off.`;
}

/** Leave the title screen and deal the first round. */
export function beginDuel(state) {
  state.phase = 'play';
  startRound(state);
}

/** The power a card counts for in a given row, by the row's own cards. */
export function powerInRow(row, card) {
  let power = card.power - card.debuff;
  for (const ally of row) {
    if (ally !== card && ally.ability === 'rally') power += 1;
  }
  if (card.ability === 'bond' && row.some((ally) => ally !== card && ally.suit === card.suit)) {
    power *= 2;
  }
  return Math.max(1, power);
}

/** The power a card counts for right now, in the row it stands in. */
export function effectivePower(state, side, card) {
  return powerInRow(state.rows[side], card);
}

/** The total power of one duelist's row. */
export function rowTotal(state, side) {
  return state.rows[side].reduce((sum, card) => sum + effectivePower(state, side, card), 0);
}

/** Draw up to `count` cards from a duelist's deck into their hand. */
function drawCards(state, side, count) {
  const drawn = state.decks[side].splice(0, count);
  state.hands[side].push(...drawn);
  return drawn.length;
}

/** The card instance a play would move, or null when the play is illegal. */
export function findPlayable(state, side, instanceId) {
  if (state.phase !== 'play' || state.turn !== side || state.passed[side]) return null;
  return state.hands[side].find((card) => card.instanceId === instanceId) ?? null;
}

/**
 * Play a card from `side`'s hand. A spy joins the enemy row; a hex lands
 * on the strongest enemy card; a spy's owner draws two cards. Returns
 * true when the play was legal and happened.
 */
export function playCard(state, side, instanceId) {
  const card = findPlayable(state, side, instanceId);
  if (!card) return false;
  state.hands[side] = state.hands[side].filter((held) => held !== card);
  const homeRow = card.ability === 'spy' ? otherSide(side) : side;
  state.rows[homeRow].push(card);
  state.lastPlay = { side: homeRow, instanceId: card.instanceId };
  state.narration = `${displayName(side)} play${side === YOU ? '' : 's'} ${card.name} (${card.power}).`;

  if (card.ability === 'hex') {
    const enemyRow = state.rows[otherSide(side)];
    if (enemyRow.length > 0) {
      let strongest = enemyRow[0];
      for (const enemy of enemyRow) {
        if (effectivePower(state, otherSide(side), enemy) > effectivePower(state, otherSide(side), strongest)) {
          strongest = enemy;
        }
      }
      strongest.debuff += 3;
      state.narration += ` Its hex withers ${strongest.name}.`;
    }
  }
  if (card.ability === 'spy') {
    const drawn = drawCards(state, side, 2);
    if (drawn > 0) state.narration += ` The spy's owner draws ${drawn === 1 ? 'a card' : 'two cards'}.`;
  }

  state.turn = otherSide(side);
  settle(state);
  return true;
}

/** Pass: sit out the rest of the round. */
export function passTurn(state, side) {
  if (state.phase !== 'play' || state.turn !== side || state.passed[side]) return false;
  state.passed[side] = true;
  state.narration = `${displayName(side)} pass${side === YOU ? '' : 'es'}.`;
  state.turn = otherSide(side);
  settle(state);
  return true;
}

// After any move: a duelist with an empty hand is done for the round,
// the round ends once both are done, and the turn never rests with a
// duelist who cannot act.
function settle(state) {
  for (const side of [YOU, WARDEN]) {
    if (!state.passed[side] && state.hands[side].length === 0) state.passed[side] = true;
  }
  if (state.passed[YOU] && state.passed[WARDEN]) {
    endRound(state);
    return;
  }
  if (state.passed[state.turn] || state.hands[state.turn].length === 0) {
    state.turn = otherSide(state.turn);
  }
}

function endRound(state) {
  const totals = { you: rowTotal(state, YOU), warden: rowTotal(state, WARDEN) };
  state.roundTotals.push(totals);
  let roundWinner = null;
  if (totals.you > totals.warden) roundWinner = YOU;
  if (totals.warden > totals.you) roundWinner = WARDEN;
  if (roundWinner) state.crowns[roundWinner] += 1;
  state.roundResult = { ...totals, winner: roundWinner };
  state.narration = roundWinner
    ? `Round ${state.round} to ${displayName(roundWinner)}, ${totals.you} to ${totals.warden}.`
    : `Round ${state.round} is tied, ${totals.you} to ${totals.warden}. No crown.`;

  const decided =
    state.crowns.you >= CROWNS_TO_WIN ||
    state.crowns.warden >= CROWNS_TO_WIN ||
    state.round >= MAX_ROUNDS;
  if (decided) {
    state.phase = 'duel-over';
    state.winner = duelWinner(state);
    state.narration =
      state.winner === YOU ? 'The duel is yours. The table goes quiet.' : 'The Warden takes the duel.';
    return;
  }
  state.round += 1;
  state.roundStarter = roundWinner ? otherSide(roundWinner) : otherSide(state.roundStarter);
  startRound(state);
}

function duelWinner(state) {
  if (state.crowns.you !== state.crowns.warden) {
    return state.crowns.you > state.crowns.warden ? YOU : WARDEN;
  }
  const combined = state.roundTotals.reduce(
    (sum, totals) => ({ you: sum.you + totals.you, warden: sum.warden + totals.warden }),
    { you: 0, warden: 0 },
  );
  return combined.warden > combined.you ? WARDEN : YOU;
}

/** True when it is `side`'s turn and they still have a move to make. */
export function canAct(state, side) {
  return state.phase === 'play' && state.turn === side && !state.passed[side] && state.hands[side].length > 0;
}
