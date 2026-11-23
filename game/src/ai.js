// The Warden: the opponent's judgement, in one place.
//
// The Warden plays to take rounds, not to empty its hand. It banks a
// lead once you have passed, refuses to chase a round it cannot reach,
// spends the cheapest card that puts it ahead, sends a spy when it needs
// cards more than it fears the points, and aims a hex at your strongest
// card. Its moves are scored from the same power arithmetic the engine
// uses, so what it does can be read from the table and countered.

import { YOU, WARDEN, powerInRow, rowTotal } from './game.js';

/** What a card would add to its owner's row total if played now. */
function contributionIfPlayed(state, side, card) {
  const row = state.rows[side];
  const before = row.reduce((sum, held) => sum + powerInRow(row, held), 0);
  const trial = [...row, card];
  const after = trial.reduce((sum, held) => sum + powerInRow(trial, held), 0);
  return after - before;
}

/** The swing a hex adds on top of its card: up to 3 off the strongest enemy. */
function hexSwing(state, card) {
  const enemyRow = state.rows[YOU];
  if (enemyRow.length === 0) return 0;
  const strongest = Math.max(...enemyRow.map((enemy) => powerInRow(enemyRow, enemy)));
  return Math.min(3, Math.max(0, strongest - 1));
}

/** Score every card in the Warden's hand as a play right now. */
function scorePlays(state) {
  const hand = state.hands[WARDEN];
  return hand.map((card) => {
    if (card.ability === 'spy') {
      // A spy feeds the enemy row its power but buys two cards: worth it
      // while the hand is thin or the round is young and close.
      const cardsWanted = Math.max(0, 5 - hand.length);
      return { card, score: cardsWanted * 1.6 - card.power * 0.4, gain: -card.power };
    }
    const gain = contributionIfPlayed(state, WARDEN, card);
    const bonus = card.ability === 'hex' ? hexSwing(state, card) : 0;
    return { card, score: gain + bonus, gain };
  });
}

/**
 * The Warden's move: { type: 'play', instanceId } or { type: 'pass' }.
 * Purely a read of the state; the caller makes the move in the engine.
 */
export function chooseWardenMove(state) {
  const mine = rowTotal(state, WARDEN);
  const yours = rowTotal(state, YOU);
  const hand = state.hands[WARDEN];
  if (hand.length === 0) return { type: 'pass' };

  const plays = scorePlays(state);
  const byGain = [...plays].sort((a, b) => a.gain - b.gain);
  const bestGain = byGain[byGain.length - 1].gain;

  // You are done for the round: bank a lead, concede a lost cause.
  if (state.passed[YOU]) {
    if (mine > yours) return { type: 'pass' };
    const totalGain = plays.reduce((sum, play) => sum + Math.max(0, play.gain), 0);
    if (mine + totalGain <= yours) return { type: 'pass' };
    // Chase with the cheapest card that takes the lead, else the biggest.
    const winner = byGain.find((play) => mine + play.gain > yours);
    const chosen = winner ?? byGain[byGain.length - 1];
    return { type: 'play', instanceId: chosen.card.instanceId };
  }

  // Behind: take the lead with the cheapest card that manages it; if no
  // card does, play the strongest while the round is still reachable.
  if (mine < yours) {
    const winner = byGain.find((play) => mine + play.gain > yours);
    if (winner) return { type: 'play', instanceId: winner.card.instanceId };
    if (mine + bestGain >= yours - 2) {
      return { type: 'play', instanceId: byGain[byGain.length - 1].card.instanceId };
    }
    return { type: 'pass' };
  }

  // Ahead while you still play: a fat lead is banked by passing, a thin
  // one is guarded with the cheapest card; a spy is spent for cards when
  // the hand runs thin.
  if (mine > yours) {
    const spy = plays.find((play) => play.card.ability === 'spy');
    if (spy && hand.length <= 3 && mine - yours <= 6) {
      return { type: 'play', instanceId: spy.card.instanceId };
    }
    if (mine - yours >= 7) return { type: 'pass' };
    return { type: 'play', instanceId: byGain[0].card.instanceId };
  }

  // Level: open with the cheapest card that takes the lead.
  const opener = byGain.find((play) => play.gain > 0) ?? byGain[0];
  return { type: 'play', instanceId: opener.card.instanceId };
}
