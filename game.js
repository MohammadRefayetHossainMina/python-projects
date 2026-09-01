const SUITS = [
  { suit: "spades", symbol: "♠", color: "black" },
  { suit: "hearts", symbol: "♥", color: "red" },
  { suit: "diamonds", symbol: "♦", color: "red" },
  { suit: "clubs", symbol: "♣", color: "black" },
];

const RANKS = [
  { rank: "A", value: 11 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 10 },
  { rank: "Q", value: 10 },
  { rank: "K", value: 10 },
];

const STARTING_BANKROLL = 1000;
const MIN_BET = 10;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const els = {
  dealerCards: document.getElementById("dealer-cards"),
  playerCards: document.getElementById("player-cards"),
  dealerScore: document.getElementById("dealer-score"),
  playerScore: document.getElementById("player-score"),
  banner: document.getElementById("banner"),
  betAmount: document.getElementById("bet-amount"),
  bankroll: document.getElementById("bankroll"),
  shoeCount: document.getElementById("shoe-count"),
  wins: document.getElementById("stat-wins"),
  losses: document.getElementById("stat-losses"),
  pushes: document.getElementById("stat-pushes"),
  blackjacks: document.getElementById("stat-bj"),
  hit: document.querySelector('[data-action="hit"]'),
  stand: document.querySelector('[data-action="stand"]'),
  double: document.querySelector('[data-action="double"]'),
  deal: document.querySelector('[data-action="deal"]'),
  next: document.querySelector('[data-action="next"]'),
  chips: [...document.querySelectorAll("[data-chip]")],
};

const state = {
  phase: "betting",
  busy: false,
  shoe: [],
  player: [],
  dealer: [],
  bet: 0,
  bankroll: STARTING_BANKROLL,
  hideHole: true,
  message: "Place a bet, then deal.",
  tone: "",
  stats: { wins: 0, losses: 0, pushes: 0, blackjacks: 0 },
};

function money(n) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createShoe(decks = 6) {
  const cards = [];
  for (let d = 0; d < decks; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ ...suit, ...rank, id: `${d}-${suit.suit}-${rank.rank}` });
      }
    }
  }
  return shuffle(cards);
}

function drawCard() {
  if (state.shoe.length < 30) {
    state.shoe = createShoe();
    state.message = "Shoe reshuffled.";
  }
  return state.shoe.pop();
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += card.value;
    if (card.rank === "A") aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return {
    total,
    isBlackjack: hand.length === 2 && total === 21,
    isBust: total > 21,
  };
}

function makeCard(card, faceDown) {
  const el = document.createElement("article");
  el.className = `card ${card.color}${faceDown ? " is-back" : ""}`;
  el.dataset.rank = card.rank;
  el.setAttribute("aria-label", faceDown ? "Hidden card" : `${card.rank} of ${card.suit}`);
  if (faceDown) return el;

  const top = document.createElement("span");
  top.className = "idx";
  top.innerHTML = `${card.rank}<small>${card.symbol}</small>`;

  const pip = document.createElement("span");
  pip.className = "pip";
  pip.textContent = card.symbol;

  const bot = document.createElement("span");
  bot.className = "idx bot";
  bot.innerHTML = `${card.rank}<small>${card.symbol}</small>`;

  el.append(top, pip, bot);
  return el;
}

function render() {
  const player = handValue(state.player);
  const dealer = handValue(state.dealer);
  const dealerShown = state.hideHole ? state.dealer.slice(0, 1) : state.dealer;
  const dealerShownValue = dealerShown.length ? handValue(dealerShown).total : 0;

  els.playerCards.replaceChildren(...state.player.map((card) => makeCard(card, false)));
  els.dealerCards.replaceChildren(
    ...state.dealer.map((card, i) => makeCard(card, state.hideHole && i === 1)),
  );

  els.playerScore.textContent = state.player.length ? String(player.total) : "0";
  els.dealerScore.textContent = state.dealer.length
    ? state.hideHole
      ? String(dealerShownValue)
      : String(dealer.total)
    : "0";

  els.banner.textContent = state.message;
  els.banner.className = `banner ${state.tone}`;
  els.betAmount.textContent = money(state.bet);
  els.bankroll.textContent = money(state.bankroll);
  els.shoeCount.textContent = String(state.shoe.length);
  els.wins.textContent = String(state.stats.wins);
  els.losses.textContent = String(state.stats.losses);
  els.pushes.textContent = String(state.stats.pushes);
  els.blackjacks.textContent = String(state.stats.blackjacks);

  const betting = state.phase === "betting" && !state.busy;
  const playing = state.phase === "player" && !state.busy;
  const canDouble = playing && state.player.length === 2 && state.bankroll >= state.bet;

  els.hit.disabled = !playing;
  els.stand.disabled = !playing;
  els.double.disabled = !canDouble;
  els.hit.hidden = state.phase !== "player";
  els.stand.hidden = state.phase !== "player";
  els.double.hidden = state.phase !== "player";
  els.deal.disabled = !(betting && state.bet >= MIN_BET);
  els.deal.hidden = state.phase !== "betting";
  els.next.hidden = state.phase !== "result";
  els.chips.forEach((chip) => {
    const value = Number(chip.dataset.chip);
    chip.disabled = !(betting && state.bankroll >= value);
  });
  document.querySelector('[data-action="clear"]').disabled = !betting;
}

function setMessage(text, tone = "") {
  state.message = text;
  state.tone = tone;
}

function finish(kind, text, payout) {
  state.phase = "result";
  state.hideHole = false;
  state.busy = false;
  state.bankroll += payout;
  if (kind === "win") state.stats.wins += 1;
  if (kind === "lose") state.stats.losses += 1;
  if (kind === "push") state.stats.pushes += 1;
  setMessage(text, kind === "push" ? "push" : kind);
  render();
}

async function playDealerThenSettle() {
  state.phase = "dealer";
  state.hideHole = false;
  setMessage("Dealer plays.");
  render();
  await wait(350);

  let dealer = handValue(state.dealer);
  while (dealer.total < 17) {
    state.dealer.push(drawCard());
    dealer = handValue(state.dealer);
    render();
    await wait(320);
  }

  const player = handValue(state.player);
  if (dealer.isBust) {
    finish("win", `Dealer busts with ${dealer.total}. You win ${money(state.bet)}.`, state.bet * 2);
    return;
  }
  if (player.total > dealer.total) {
    finish("win", `${player.total} beats ${dealer.total}. You win ${money(state.bet)}.`, state.bet * 2);
    return;
  }
  if (player.total < dealer.total) {
    finish("lose", `Dealer ${dealer.total} beats ${player.total}.`, 0);
    return;
  }
  finish("push", `Push at ${player.total}. Bet returned.`, state.bet);
}

function settleNaturals() {
  const player = handValue(state.player);
  const dealer = handValue(state.dealer);
  if (player.isBlackjack && dealer.isBlackjack) {
    finish("push", "Both have blackjack. Push.", state.bet);
    return true;
  }
  if (player.isBlackjack) {
    state.stats.blackjacks += 1;
    const payout = state.bet + Math.floor(state.bet * 1.5);
    finish("win", `Blackjack! Paid ${money(Math.floor(state.bet * 1.5))}.`, payout);
    return true;
  }
  if (dealer.isBlackjack) {
    finish("lose", "Dealer has blackjack.", 0);
    return true;
  }
  return false;
}

async function deal() {
  if (state.busy || state.phase !== "betting" || state.bet < MIN_BET) return;
  if (state.bankroll < 0) return;

  state.busy = true;
  state.openingBet = state.bet;
  state.player = [];
  state.dealer = [];
  state.hideHole = true;
  state.phase = "player";
  setMessage("Dealing…");
  render();

  state.player.push(drawCard());
  render();
  await wait(180);
  state.dealer.push(drawCard());
  render();
  await wait(180);
  state.player.push(drawCard());
  render();
  await wait(180);
  state.dealer.push(drawCard());
  render();

  if (settleNaturals()) return;

  state.busy = false;
  setMessage("Hit, stand, or double.");
  render();

  if (handValue(state.player).isBust) {
    finish("lose", "Bust.", 0);
  }
}

function hit() {
  if (state.busy || state.phase !== "player") return;
  state.player.push(drawCard());
  const player = handValue(state.player);
  if (player.isBust) {
    state.hideHole = false;
    finish("lose", `Bust at ${player.total}.`, 0);
    return;
  }
  setMessage(`You have ${player.total}.`);
  render();
}

async function stand() {
  if (state.busy || state.phase !== "player") return;
  state.busy = true;
  await playDealerThenSettle();
}

async function doubleDown() {
  if (state.busy || state.phase !== "player") return;
  if (state.player.length !== 2 || state.bankroll < state.bet) return;
  state.busy = true;
  state.bankroll -= state.bet;
  state.bet *= 2;
  state.player.push(drawCard());
  render();
  const player = handValue(state.player);
  await wait(280);
  if (player.isBust) {
    finish("lose", `Bust at ${player.total}.`, 0);
    return;
  }
  await playDealerThenSettle();
}

function addChip(value) {
  if (state.phase !== "betting" || state.busy) return;
  if (value > state.bankroll) return;
  state.bankroll -= value;
  state.bet += value;
  setMessage(`Bet ${money(state.bet)}. Deal when you are ready.`);
  render();
}

function clearBet() {
  if (state.phase !== "betting" || state.busy) return;
  state.bankroll += state.bet;
  state.bet = 0;
  setMessage("Place a bet, then deal.");
  render();
}

function placeBet(value) {
  const amount = Math.min(value, state.bankroll);
  if (amount < MIN_BET) return false;
  state.bankroll -= amount;
  state.bet = amount;
  return true;
}

function nextHand() {
  if (state.phase !== "result") return;
  const lastBet = state.openingBet || state.bet;
  state.player = [];
  state.dealer = [];
  state.hideHole = true;
  state.bet = 0;
  state.phase = "betting";
  if (placeBet(lastBet)) {
    setMessage(`Same bet ${money(state.bet)}. Deal when you are ready.`);
  } else if (state.bankroll < MIN_BET) {
    setMessage("Bankroll is too low for another hand. Reset to keep playing.");
  } else {
    setMessage("Place a bet, then deal.");
  }
  render();
}

function resetBankroll() {
  state.phase = "betting";
  state.busy = false;
  state.player = [];
  state.dealer = [];
  state.bet = 0;
  state.bankroll = STARTING_BANKROLL;
  state.hideHole = true;
  setMessage("Bankroll reset to $1,000.");
  render();
}

document.querySelector(".table-wrap").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  const chip = button.dataset.chip;
  if (chip) addChip(Number(chip));
  if (action === "deal") deal();
  if (action === "hit") hit();
  if (action === "stand") stand();
  if (action === "double") doubleDown();
  if (action === "next") nextHand();
  if (action === "clear") clearBet();
});

document.querySelector('[data-action="reset"]').addEventListener("click", resetBankroll);

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const key = event.key.toLowerCase();
  if (key === "enter") {
    if (state.phase === "result") nextHand();
    else deal();
  }
  if (key === "h") hit();
  if (key === "s") stand();
  if (key === "d") doubleDown();
  if (key === "c") clearBet();
});

state.shoe = createShoe();
placeBet(50);
setMessage(`Bet ${money(state.bet)}. Deal when you are ready.`);
render();
