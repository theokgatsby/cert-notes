'use strict';

const MARBLES_PER_PERSON = 3;
const FINISH_POINTS = 30;
const PLACEMENT_POINTS = 70;
const COMPLETION_MULTIPLIER = 1.15;

let groupSize = 3;
const draft = Array.from({ length: 8 }, () => ({
  name: '',
  marbles: Array.from({ length: MARBLES_PER_PERSON }, () => ({ position: '', dnf: false }))
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

function updateMarbleInputs() {
  groupSize = Number(groupSizeInput.value);
  const totalMarbles = groupSize * MARBLES_PER_PERSON;
  marbleInputs.replaceChildren();

  for (let personIndex = 0; personIndex < groupSize; personIndex += 1) {
    const section = document.createElement('section');
    section.className = 'person-section';
    section.setAttribute('aria-label', `Person ${personIndex + 1}`);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control form-control-sm person-name';
    nameInput.placeholder = `Person ${personIndex + 1} name`;
    nameInput.value = draft[personIndex].name;
    nameInput.dataset.person = personIndex;
    nameInput.dataset.field = 'name';
    nameInput.setAttribute('aria-label', `Person ${personIndex + 1} name`);
    section.appendChild(nameInput);

    for (let marbleIndex = 0; marbleIndex < MARBLES_PER_PERSON; marbleIndex += 1) {
      const marble = draft[personIndex].marbles[marbleIndex];
      const positionId = `p${personIndex}m${marbleIndex}`;
      const dnfId = `${positionId}dnf`;
      const row = document.createElement('div');
      row.className = 'marble-row';

      const label = document.createElement('label');
      label.className = 'marble-label';
      label.htmlFor = positionId;
      label.textContent = `Marble ${marbleIndex + 1}`;

      const positionInput = document.createElement('input');
      positionInput.type = 'number';
      positionInput.id = positionId;
      positionInput.className = 'form-control form-control-sm';
      positionInput.placeholder = 'Position';
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
      row.append(label, positionInput, checkLabel);
      section.appendChild(row);
    }

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
  const totalMarbles = groupSize * MARBLES_PER_PERSON;
  const usedPositions = new Map();
  const people = [];

  for (let personIndex = 0; personIndex < groupSize; personIndex += 1) {
    const person = {
      personIndex,
      name: getPersonName(personIndex),
      finishes: 0,
      rawPoints: 0,
      points: 0,
      completionBonus: false
    };

    for (let marbleIndex = 0; marbleIndex < MARBLES_PER_PERSON; marbleIndex += 1) {
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
      person.rawPoints += placementScore(position, totalMarbles);
    }

    person.completionBonus = person.finishes === MARBLES_PER_PERSON;
    person.points = person.rawPoints * (person.completionBonus ? COMPLETION_MULTIPLIER : 1);
    people.push(person);
  }

  return people;
}

function allocatePayouts(people, totalGp) {
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
      bonus.textContent = 'ALL 3 +15%';
      name.appendChild(bonus);
    }

    const detail = document.createElement('div');
    detail.className = 'result-detail';
    const percentage = totalPoints > 0 ? (person.points / totalPoints) * 100 : 100 / groupSize;
    detail.textContent = totalPoints > 0
      ? `${person.finishes}/3 finished · ${person.points.toFixed(1)} pts · ${percentage.toFixed(1)}%`
      : `0/3 finished · all-DNF tie · ${percentage.toFixed(1)}%`;
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
