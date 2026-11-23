// Input wiring for Emberfall Duel: mouse and keyboard, delegated to a
// controller the main module provides. This file owns no state; it only
// turns clicks and keys into the controller's verbs.

export function wireInput(controller) {
  document.getElementById('hand').addEventListener('click', (event) => {
    const el = event.target.closest('.card');
    if (el && el.dataset.instanceId) controller.playCard(el.dataset.instanceId);
  });

  document.addEventListener('click', (event) => {
    if (event.target.id === 'pass-btn') controller.pass();
    if (event.target.id === 'begin-btn') controller.begin();
    if (event.target.id === 'again-btn') controller.again();
  });

  document.addEventListener('keydown', (event) => {
    controller.key(event.key);
  });
}
