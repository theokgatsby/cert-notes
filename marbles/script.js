'use strict';

const MARBLES_PER_PERSON = 3;
const MAX_MARBLES_PER_PERSON = 4;
const BEST_MARBLE_COUNT = 3;
const FINISH_POINTS = 30;
const PLACEMENT_POINTS = 70;
const COMPLETION_MULTIPLIER = 1.15;

let groupSize = 3;
const draft = Array.from({ length: 8 }, () => ({
  name: '',
  receivedPurple: false,
  marbles: Array.from({ length: MAX_MARBLES_PER_PERSON }, () => ({ position: '', dnf: false }))
}));

const groupSizeInput = document.getElementById('groupSize');
const marbleInputs = document.getElementById('marbleInputs');
const splitForm = document.getElementById('splitForm');
const resultsContainer = document.getElementById('resultsContainer');

function getPersonName(personIndex) {
  return draft[personIndex].name.trim() || `Person ${personIndex + 1}`;
}

function updateDraft(event) {
  const target = event.target;
  const personIndex = Number(target.dataset.person);

  if (!Number.isInteger(personIndex)) return;

  if (target.dataset.field === 'name') {
    draft[personIndex].name = target.value;
    return;
  }

  if (target.dataset.field === 'purple') {
    draft[personIndex].receivedPurple = target.checked;
    updateMarbleInputs();
    return;
  }

  const marbleIndex = Number(target.dataset.marble);
  if (!Number.isInteger(marbleIndex)) return;

  if (target.dataset.field === 'position') {
    draft[personIndex].marbles[marbleIndex].position = target.value;
  } else if (target.dataset.field === 'dnf') {
    draft[personIndex].marbles[marbleIndex].dnf = target.checked;
    const positionInput = document.getElementById(`p${personIndex}m${marbleIndex}`);
    positionInput.disabled = target.checked;
    positionInput.setAttribute('aria-disabled', String(target.checked));
  }
}

function getMarbleCount(personIndex) {
  return draft[personIndex].receivedPurple ? MAX_MARBLES_PER_PERSON : MARBLES_PER_PERSON;
}

function getTotalMarbles() {
  let total = 0;
  for (let personIndex = 0; personIndex < groupSize; personIndex += 1) {
    total += getMarbleCount(personIndex);
  }
  return total;
}

function updateMarbleInputs() {
  groupSize = Number(groupSizeInput.value);
  const totalMarbles = getTotalMarbles();
  marbleInputs.replaceChildren();

  for (let personIndex = 0; personIndex < groupSize; personIndex += 1) {
    const section = document.createElement('section');
    section.className = 'person-section';
    section.setAttribute('aria-label', `Person ${personIndex + 1}`);

    const nameRow = document.createElement('div');
    nameRow.className = 'person-name-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control form-control-sm person-name';
    nameInput.placeholder = `Person ${personIndex + 1} name`;
    nameInput.value = draft[personIndex].name;
    nameInput.dataset.person = personIndex;
    nameInput.dataset.field = 'name';
    nameInput.setAttribute('aria-label', `Person ${personIndex + 1} name`);

    const purpleId = `p${personIndex}purple`;
    const purpleLabel = document.createElement('label');
    purpleLabel.className = 'purple-check';
    purpleLabel.htmlFor = purpleId;

    const purpleInput = document.createElement('input');
    purpleInput.type = 'checkbox';
    purpleInput.id = purpleId;
    purpleInput.className = 'form-check-input mt-0';
    purpleInput.checked = draft[personIndex].receivedPurple;
    purpleInput.dataset.person = personIndex;
    purpleInput.dataset.field = 'purple';

    purpleLabel.append(purpleInput, document.createTextNode(' Received purple'));
    nameRow.append(nameInput, purpleLabel);
    section.appendChild(nameRow);

    const marbleCount = getMarbleCount(personIndex);
    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'marble-cards';

    for (let marbleIndex = 0; marbleIndex < marbleCount; marbleIndex += 1) {
      const marble = draft[personIndex].marbles[marbleIndex];
      const positionId = `p${personIndex}m${marbleIndex}`;
      const dnfId = `${positionId}dnf`;
      const card = document.createElement('div');
      card.className = 'marble-card';

      const label = document.createElement('label');
      label.className = 'marble-label';
      label.htmlFor = positionId;
      label.textContent = `Marble ${marbleIndex + 1}`;

      const positionInput = document.createElement('input');
      positionInput.type = 'number';
      positionInput.id = positionId;
      positionInput.className = 'form-control form-control-sm marble-position';
      positionInput.placeholder = 'Pos';
      positionInput.min = '1';
      positionInput.max = String(totalMarbles);
      positionInput.step = '1';
      positionInput.inputMode = 'numeric';
      positionInput.value = marble.position;
      positionInput.disabled = marble.dnf;
      positionInput.dataset.person = personIndex;
      positionInput.dataset.marble = marbleIndex;
      positionInput.dataset.field = 'position';
      positionInput.setAttribute('aria-disabled', String(marble.dnf));

      const checkLabel = document.createElement('label');
      checkLabel.className = 'marble-check';
      checkLabel.htmlFor = dnfId;

      const dnfInput = document.createElement('input');
      dnfInput.type = 'checkbox';
      dnfInput.id = dnfId;
      dnfInput.className = 'form-check-input mt-0';
      dnfInput.checked = marble.dnf;
      dnfInput.dataset.person = personIndex;
      dnfInput.dataset.marble = marbleIndex;
      dnfInput.dataset.field = 'dnf';

      checkLabel.append(dnfInput, document.createTextNode(' DNF'));
      card.append(label, positionInput, checkLabel);
      cardsWrap.appendChild(card);
    }

    section.appendChild(cardsWrap);
    marbleInputs.appendChild(section);
  }

  clearError();
  resultsContainer.hidden = true;
}

function placementScore(position, totalMarbles) {
  if (totalMarbles <= 1) return FINISH_POINTS + PLACEMENT_POINTS;
  const placementShare = (totalMarbles - position) / (totalMarbles - 1);
  return FINISH_POINTS + PLACEMENT_POINTS * placementShare;
}

function collectRaceResults() {
  const totalMarbles = getTotalMarbles();
  const usedPositions = new Map();
  const people = [];

  for (let personIndex = 0; personIndex < groupSize; personIndex += 1) {
    const marbleCount = getMarbleCount(personIndex);
    const person = {
      personIndex,
      name: getPersonName(personIndex),
      receivedPurple: draft[personIndex].receivedPurple,
      marbleCount,
      finishes: 0,
      rawPoints: 0,
      points: 0,
      completionBonus: false,
      positions: []
    };

    const scores = [];

    for (let marbleIndex = 0; marbleIndex < marbleCount; marbleIndex += 1) {
      const marble = draft[personIndex].marbles[marbleIndex];
      if (marble.dnf) continue;

      if (marble.position.trim() === '') {
        throw new Error(`${person.name}, Marble ${marbleIndex + 1}: enter a position or mark DNF.`);
      }

      const position = Number(marble.position);
      if (!Number.isInteger(position) || position < 1 || position > totalMarbles) {
        throw new Error(`${person.name}, Marble ${marbleIndex + 1}: position must be a whole number from 1 to ${totalMarbles}.`);
      }

      if (usedPositions.has(position)) {
        throw new Error(`Position ${position} is entered twice (${usedPositions.get(position)} and ${person.name}, Marble ${marbleIndex + 1}).`);
      }

      usedPositions.set(position, `${person.name}, Marble ${marbleIndex + 1}`);
      person.finishes += 1;
      person.positions.push(position);
      scores.push(placementScore(position, totalMarbles));
    }

    // Only the best BEST_MARBLE_COUNT marbles count; the worst is dropped for anyone with extras (e.g. purple bonus marble).
    scores.sort((a, b) => b - a);
    person.rawPoints = scores.slice(0, BEST_MARBLE_COUNT).reduce((sum, score) => sum + score, 0);

    person.completionBonus = person.finishes >= BEST_MARBLE_COUNT;
    person.points = person.rawPoints * (person.completionBonus ? COMPLETION_MULTIPLIER : 1);
    people.push(person);
  }

  return people;
}

function findSweepWinner(people) {
  return people.find(person =>
    person.receivedPurple &&
    person.marbleCount === MAX_MARBLES_PER_PERSON &&
    person.finishes === MAX_MARBLES_PER_PERSON &&
    person.positions.slice().sort((a, b) => a - b).every((position, index) => position === index + 1)
  );
}

function allocatePayouts(people, totalGp) {
  const sweepWinner = findSweepWinner(people);
  if (sweepWinner) {
    return people.map(person => ({
      ...person,
      gp: person.personIndex === sweepWinner.personIndex ? totalGp : 0,
      sweep: person.personIndex === sweepWinner.personIndex
    }));
  }

  const totalPoints = people.reduce((sum, person) => sum + person.points, 0);
  if (totalPoints === 0) {
    return allocateByWeight(
      people.map(person => ({ ...person, allocationWeight: 1 })),
      totalGp,
      people.length
    );
  }

  return allocateByWeight(
    people.map(person => ({ ...person, allocationWeight: person.points })),
    totalGp,
    totalPoints
  );
}

// Largest-remainder allocation makes the displayed whole-GP payouts add up exactly.
function allocateByWeight(people, totalGp, totalWeight) {
  const allocations = people.map(person => {
    const exactGp = totalGp * person.allocationWeight / totalWeight;
    const gp = Math.floor(exactGp);
    return { ...person, gp, remainder: exactGp - gp };
  });

  const gpLeft = totalGp - allocations.reduce((sum, person) => sum + person.gp, 0);
  const remainderOrder = [...allocations].sort((a, b) =>
    b.remainder - a.remainder || a.personIndex - b.personIndex
  );

  for (let index = 0; index < gpLeft; index += 1) {
    remainderOrder[index].gp += 1;
  }

  return allocations;
}

function formatGp(gp) {
  if (gp >= 1_000_000) {
    return `${(gp / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M GP`;
  }
  return `${gp.toLocaleString()} GP`;
}

function displayResults(results, totalGp) {
  const resultsList = document.getElementById('resultsList');
  const totalPoints = results.reduce((sum, person) => sum + person.points, 0);
  resultsList.replaceChildren();

  results.forEach(person => {
    const item = document.createElement('div');
    item.className = 'result-item';
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = person.name;

    if (person.completionBonus) {
      const bonus = document.createElement('span');
      bonus.className = 'bonus-pill';
      bonus.textContent = 'BEST 3 +15%';
      name.appendChild(bonus);
    }

    if (person.receivedPurple) {
      const purpleBonus = document.createElement('span');
      purpleBonus.className = 'bonus-pill purple-pill';
      purpleBonus.textContent = 'PURPLE';
      name.appendChild(purpleBonus);
    }

    if (person.sweep) {
      const sweepBonus = document.createElement('span');
      sweepBonus.className = 'bonus-pill sweep-pill';
      sweepBonus.textContent = 'SWEEP — TAKES ALL';
      name.appendChild(sweepBonus);
    }

    const detail = document.createElement('div');
    detail.className = 'result-detail';
    const percentage = totalGp > 0 ? (person.gp / totalGp) * 100 : 100 / groupSize;
    detail.textContent = person.sweep
      ? `${person.finishes}/${person.marbleCount} finished · swept places 1-4 · ${percentage.toFixed(1)}%`
      : totalPoints > 0
      ? `${person.finishes}/${person.marbleCount} finished · ${person.points.toFixed(1)} pts · ${percentage.toFixed(1)}%`
      : `0/${person.marbleCount} finished · all-DNF tie · ${percentage.toFixed(1)}%`;
    info.append(name, detail);

    const payout = document.createElement('div');
    payout.className = 'result-gp';
    payout.textContent = formatGp(person.gp);
    item.append(info, payout);
    resultsList.appendChild(item);
  });

  document.getElementById('payoutTotal').textContent = formatGp(totalGp);
  resultsContainer.hidden = false;
  resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function calculate(event) {
  event.preventDefault();
  clearError();

  const dropValue = Number(document.getElementById('dropValue').value);
  if (!Number.isFinite(dropValue) || dropValue <= 0) {
    showError('Drop value must be greater than 0.');
    return;
  }

  try {
    const people = collectRaceResults();
    const totalGp = Math.round(dropValue * 1_000_000);
    displayResults(allocatePayouts(people, totalGp), totalGp);
  } catch (error) {
    showError(error.message);
  }
}

function showError(message) {
  document.getElementById('errorContainer').textContent = message;
  resultsContainer.hidden = true;
}

function clearError() {
  document.getElementById('errorContainer').textContent = '';
}

groupSizeInput.addEventListener('change', updateMarbleInputs);
marbleInputs.addEventListener('input', updateDraft);
marbleInputs.addEventListener('change', updateDraft);
splitForm.addEventListener('submit', calculate);
updateMarbleInputs();

window.marbleScoring = { placementScore, allocatePayouts };
