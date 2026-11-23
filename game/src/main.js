// Emberfall Duel — the page's entry point.
//
// Two ways in: a live game (the default), run by the controller below,
// and the screenshot scenes (?shot=title|table|win|loss&seed=N), which
// build one real moment of the game and hold it still for its picture.

import { YOU, WARDEN, canAct, createDuel, beginDuel, passTurn, playCard } from './game.js';
import { chooseWardenMove } from './ai.js';
import { hideOverlays, hideRoundBanner, render, renderEnd, renderTitle, showRoundBanner } from './render.js';
import { wireInput } from './input.js';
import { buildScene } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  const state = buildScene(shot, Number(params.get('seed') ?? 1));
  render(state, { canPass: shot === 'table' });
  if (shot === 'title') renderTitle(state);
  if (shot === 'win' || shot === 'loss') renderEnd(state);
} else {
  startLiveGame();
}

function startLiveGame() {
  let state = createDuel((Date.now() % 2147483646) + 1);
  let selectedIndex = 0;
  let busy = false;

  render(state, {});
  renderTitle(state);

  function ui() {
    const selected = state.hands.you[selectedIndex];
    return { selectedId: selected ? selected.instanceId : null, canPass: !busy && canAct(state, YOU) };
  }

  function draw() {
    render(state, ui());
  }

  function roundBannerText(roundNo) {
    const result = state.roundResult;
    if (!result) return '';
    if (result.winner === YOU) return `Round ${roundNo} is yours — ${result.you} to ${result.warden}.`;
    if (result.winner === WARDEN) return `Round ${roundNo} to the Warden — ${result.warden} to ${result.you}.`;
    return `Round ${roundNo} is tied — no crown.`;
  }

  // After any move: announce a finished round, end the duel when it is
  // over, and give the Warden its turn when the turn has come to it.
  function afterMove(previousRound) {
    draw();
    if (state.phase === 'duel-over') {
      showRoundBanner(roundBannerText(previousRound));
      window.setTimeout(() => {
        hideRoundBanner();
        renderEnd(state);
      }, 1700);
      return;
    }
    if (state.round !== previousRound) {
      showRoundBanner(roundBannerText(previousRound));
      window.setTimeout(hideRoundBanner, 1700);
      draw();
    }
    wardenTurn();
  }

  function wardenTurn() {
    if (state.phase !== 'play' || state.turn !== WARDEN || !canAct(state, WARDEN)) return;
    busy = true;
    draw();
    window.setTimeout(() => {
      const previousRound = state.round;
      const move = chooseWardenMove(state);
      if (move.type === 'pass') passTurn(state, WARDEN);
      else playCard(state, WARDEN, move.instanceId);
      busy = false;
      afterMove(previousRound);
    }, 640);
  }

  const controller = {
    playCard(instanceId) {
      if (busy || !canAct(state, YOU)) return;
      const previousRound = state.round;
      if (playCard(state, YOU, instanceId)) {
        selectedIndex = 0;
        afterMove(previousRound);
      }
    },
    pass() {
      if (busy || !canAct(state, YOU)) return;
      const previousRound = state.round;
      if (passTurn(state, YOU)) afterMove(previousRound);
    },
    begin() {
      hideOverlays();
      beginDuel(state);
      draw();
      wardenTurn();
    },
    again() {
      state = createDuel((Date.now() % 2147483646) + 1);
      hideOverlays();
      beginDuel(state);
      selectedIndex = 0;
      draw();
      wardenTurn();
    },
    key(keyName) {
      if (state.phase !== 'play') {
        if (keyName === 'Enter' || keyName === ' ') {
          if (!document.getElementById('title-screen').classList.contains('hidden')) controller.begin();
          else if (!document.getElementById('end-screen').classList.contains('hidden')) controller.again();
        }
        return;
      }
      const handSize = state.hands.you.length;
      if (keyName === 'ArrowRight') selectedIndex = Math.min(handSize - 1, selectedIndex + 1);
      else if (keyName === 'ArrowLeft') selectedIndex = Math.max(0, selectedIndex - 1);
      else if (/^[1-9]$/.test(keyName)) selectedIndex = Math.min(handSize - 1, Number(keyName) - 1);
      else if (keyName === 'Enter' || keyName === ' ') {
        const card = state.hands.you[selectedIndex];
        if (card) {
          controller.playCard(card.instanceId);
          return;
        }
      } else if (keyName === 'p' || keyName === 'P') {
        controller.pass();
        return;
      } else {
        return;
      }
      draw();
    },
  };

  wireInput(controller);
}
