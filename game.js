const els = {
  status: document.getElementById("boot-status"),
  source: document.getElementById("source"),
  log: document.getElementById("log"),
  player: document.getElementById("player-cards"),
  dealer: document.getElementById("dealer-cards"),
  start: document.getElementById("btn-start"),
  hit: document.getElementById("btn-y"),
  stand: document.getElementById("btn-n"),
  again: document.getElementById("btn-again"),
};

let py;
let phase = "boot";

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle("is-error", isError);
}

function setPhase(next) {
  phase = next;
  els.start.disabled = next !== "ready";
  els.start.hidden = next !== "ready";
  els.hit.disabled = next !== "ask";
  els.stand.disabled = next !== "ask";
  els.again.disabled = next !== "done";
  els.again.hidden = next !== "done";
}

function pyJs(expr) {
  const value = py.runPython(expr);
  if (value && typeof value.toJs === "function") {
    const converted = value.toJs();
    if (typeof value.destroy === "function") value.destroy();
    return converted;
  }
  return value;
}

function renderCards(container, values, hideHole) {
  container.replaceChildren();
  values.forEach((value, index) => {
    const card = document.createElement("div");
    const hidden = hideHole && index === 1;
    card.className = hidden ? "card is-back" : "card";
    card.textContent = hidden ? "" : String(value);
    card.setAttribute("aria-label", hidden ? "Hidden card" : `Card ${value}`);
    container.append(card);
  });
}

function renderHands(revealDealer) {
  const user = pyJs("list(user_cards)");
  const dealer = pyJs("list(dealer_card)");
  renderCards(els.player, user, false);
  renderCards(els.dealer, dealer, !revealDealer);
}

function afterDealCheck() {
  py.runPython(`
player_score = calculate_score(user_cards)
dealer_score = calculate_score(dealer_card)
print(f'Your cards: {user_cards} and your score: {player_score}\\n')
print(f'Dealer cards: {dealer_card[0]} ')
`);
  const playerScore = pyJs("int(player_score)");
  const dealerScore = pyJs("int(dealer_score)");
  renderHands(false);
  if (playerScore === 0 || dealerScore === 0 || playerScore > 21) {
    finishRound();
    return;
  }
  py.runPython("print('Type y to get another card, type n to end game')");
  setPhase("ask");
}

function finishRound() {
  py.runPython(`
while dealer_score != 0 and dealer_score < 17:
    dealer_card.append(deal_cards())
    dealer_score = calculate_score(dealer_card)
print(f'Your final cards: {user_cards} and your final score: {player_score}\\n')
print(f'Dealer final cards: {dealer_card} and the final score: {dealer_score}\\n')
print(compare(player_score, dealer_score))
`);
  renderHands(true);
  py.runPython("print('\\n press n if you do not want to play again or any key to continue')");
  setPhase("done");
}

function startRound() {
  els.log.textContent = "";
  py.runPython(`
user_cards = []
dealer_card = []
dealer_score = -1
player_score = -1
print("BLACKJACK")
for _ in range(2):
    user_cards.append(deal_cards())
    dealer_card.append(deal_cards())
`);
  afterDealCheck();
}

function hit() {
  if (phase !== "ask") return;
  py.runPython("user_cards.append(deal_cards())");
  afterDealCheck();
}

function stand() {
  if (phase !== "ask") return;
  finishRound();
}

async function boot() {
  try {
    py = await loadPyodide();
    py.setStdout({
      batched(text) {
        els.log.textContent += text.endsWith("\n") ? text : `${text}\n`;
        els.log.scrollTop = els.log.scrollHeight;
      },
    });
    py.runPython(`
import sys, types
art = types.ModuleType("art")
def tprint(text="", *args, **kwargs):
    print(text)
art.tprint = tprint
sys.modules["art"] = art
`);
    const source = await fetch("Blackjack/b_jack.py").then((response) => {
      if (!response.ok) throw new Error("Could not fetch Blackjack/b_jack.py");
      return response.text();
    });
    els.source.textContent = source;
    py.FS.writeFile("b_jack.py", source);
    py.runPython("import b_jack");
    py.runPython("from b_jack import deal_cards, calculate_score, compare");
    setStatus("Python is ready. Play uses deal_cards, calculate_score, and compare from b_jack.py.");
    setPhase("ready");
  } catch (error) {
    setStatus(`Could not start Python in the browser: ${error.message}`, true);
    setPhase("boot");
  }
}

els.start.addEventListener("click", startRound);
els.hit.addEventListener("click", hit);
els.stand.addEventListener("click", stand);
els.again.addEventListener("click", startRound);

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const key = event.key.toLowerCase();
  if (key === "y") hit();
  if (key === "n") {
    if (phase === "ask") stand();
  }
  if (key === "enter") {
    if (phase === "ready" || phase === "done") startRound();
  }
});

boot();
