// The card catalogue of Emberfall Duel.
//
// Four suits, told apart by colour and by the shape of their sigil:
//   ember — ember-orange, a flame diamond
//   tide  — deep-sea blue, a droplet
//   thorn — briar green, a leaf
//   star  — violet, a four-pointed star
//
// Every card has a printed power. Some carry one of four abilities:
//   bond  — counts double while another card of its suit stands in its row
//   rally — every other card in its row gains +1 power
//   hex   — on arrival, the strongest enemy card loses 3 power (never below 1)
//   spy   — deserts to the enemy row, and its owner draws two cards
//
// Both duelists build from this same catalogue; a deck is one copy of it.

export const SUITS = {
  ember: { key: 'ember', label: 'Ember', colour: '#e4572e' },
  tide: { key: 'tide', label: 'Tide', colour: '#2e7fc2' },
  thorn: { key: 'thorn', label: 'Thorn', colour: '#3f9e4d' },
  star: { key: 'star', label: 'Star', colour: '#8a4fc9' },
};

export const ABILITIES = {
  bond: { key: 'bond', label: 'Bond', text: 'Doubles while a suit-mate stands in its row.' },
  rally: { key: 'rally', label: 'Rally', text: 'Other cards in its row gain +1 power.' },
  hex: { key: 'hex', label: 'Hex', text: 'On arrival: the strongest enemy card loses 3 power.' },
  spy: { key: 'spy', label: 'Spy', text: 'Joins the enemy row. Its owner draws two cards.' },
};

// [suit, power, ability or null, name]
const CATALOGUE_ROWS = [
  ['ember', 8, null, 'Ember Drake'],
  ['ember', 6, 'bond', 'Ember Twins'],
  ['ember', 5, null, 'Ember Imp'],
  ['ember', 4, 'rally', 'Ember Herald'],
  ['ember', 3, null, 'Ember Sprite'],
  ['tide', 7, null, 'Tide Serpent'],
  ['tide', 6, 'hex', 'Tide Witch'],
  ['tide', 5, 'bond', 'Tide Sisters'],
  ['tide', 4, null, 'Tide Crab'],
  ['tide', 2, null, 'Tide Eel'],
  ['thorn', 8, null, 'Thorn Bear'],
  ['thorn', 7, 'hex', 'Thorn Hag'],
  ['thorn', 5, null, 'Thorn Fox'],
  ['thorn', 4, 'bond', 'Thorn Pack'],
  ['thorn', 3, null, 'Thorn Wasp'],
  ['star', 6, null, 'Star Owl'],
  ['star', 5, 'spy', 'Star Changeling'],
  ['star', 7, 'spy', 'Star Double'],
  ['star', 4, null, 'Star Moth'],
  ['star', 3, 'rally', 'Star Cantor'],
  ['star', 2, null, 'Star Newt'],
];

/** The catalogue as card definitions, in a fixed order. */
export const CATALOGUE = CATALOGUE_ROWS.map(([suit, power, ability, name], index) => ({
  id: `card-${index}`,
  suit,
  power,
  ability,
  name,
}));

/** A fresh, unshuffled deck: one instance of every catalogue card. */
export function buildDeck(owner) {
  return CATALOGUE.map((definition, index) => ({
    instanceId: `${owner}-${definition.id}-${index}`,
    definitionId: definition.id,
    suit: definition.suit,
    name: definition.name,
    power: definition.power,
    ability: definition.ability,
    owner,
    debuff: 0,
  }));
}

/** The hand size both duelists draw up to at the start of a round. */
export const HAND_SIZE = 7;

/** How many crowns win the duel outright, and the most rounds played. */
export const CROWNS_TO_WIN = 2;
export const MAX_ROUNDS = 3;
