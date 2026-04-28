// script.js - Interactive logic for The Voter Roadmap

// ── Checklist toggle ──────────────────────────────────────
const TOTAL_CHECKS = 4;
let checkedCount = 0;

function toggleCheck(card) {
  const isChecked = card.classList.toggle('checked');
  const icon = card.querySelector('.check-indicator .material-icons');

  if (isChecked) {
    icon.textContent = 'check_circle';
    checkedCount = Math.min(checkedCount + 1, TOTAL_CHECKS);
  } else {
    icon.textContent = 'check_circle_outline';
    checkedCount = Math.max(checkedCount - 1, 0);
  }

  const pct = (checkedCount / TOTAL_CHECKS) * 100;
  document.getElementById('checklist-fill').style.width = pct + '%';
  document.getElementById('checklist-label').textContent =
    `${checkedCount} of ${TOTAL_CHECKS} complete`;
}

// ── Navbar active link on scroll ─────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);

sections.forEach((section) => observer.observe(section));

// ── Section reveal and transition animation ────────────────
const animatedSections = document.querySelectorAll('.animate-section');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  { threshold: 0.18 }
);

animatedSections.forEach((section) => revealObserver.observe(section));

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetSelector = link.getAttribute('href');
    if (!targetSelector || !targetSelector.startsWith('#')) return;

    const target = document.querySelector(targetSelector);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.remove('section-focus-pulse');
    requestAnimationFrame(() => target.classList.add('section-focus-pulse'));
  });
});

// ── Get Started button ────────────────────────────────────
document.getElementById('get-started-btn').addEventListener('click', () => {
  const registrationCard = document.getElementById('registration');
  registrationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  registrationCard.classList.remove('section-focus-pulse');
  requestAnimationFrame(() => registrationCard.classList.add('section-focus-pulse'));
});

// ── Hero India PIN search (live internet data) ─────────────
const pinForm = document.getElementById('pin-form');
const pinInput = document.getElementById('pin-code');
const pinResult = document.getElementById('pin-result');

const MONTH_PATTERN =
  '(January|February|March|April|May|June|July|August|September|October|November|December)';

function extractElectionDate(text) {
  if (!text) return null;
  const cleanText = text.replace(/\s+/g, ' ');
  const fullDate = cleanText.match(new RegExp(`\\b\\d{1,2}\\s+${MONTH_PATTERN}\\s+\\d{4}\\b`, 'i'));
  if (fullDate) return fullDate[0];

  const monthYear = cleanText.match(new RegExp(`\\b${MONTH_PATTERN}\\s+\\d{4}\\b`, 'i'));
  if (monthYear) return monthYear[0];

  const numericDate = cleanText.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/);
  if (numericDate) return numericDate[0];

  return null;
}

async function fetchPinRegion(pinCode) {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
  if (!response.ok) {
    throw new Error('Unable to connect to India Post API.');
  }

  const data = await response.json();
  const record = data?.[0];
  const firstOffice = record?.PostOffice?.[0];
  if (!firstOffice || record?.Status !== 'Success') {
    throw new Error('PIN code not found in India Post records.');
  }

  return {
    district: firstOffice.District,
    state: firstOffice.State,
    name: firstOffice.Name
  };
}

async function fetchElectionDateForState(state) {
  const query = `${state} Legislative Assembly election next election date India`;
  const searchUrl =
    'https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&origin=*&srlimit=1&srsearch=' +
    encodeURIComponent(query);
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error('Unable to query election schedule source.');
  }

  const searchData = await searchResponse.json();
  const firstMatch = searchData?.query?.search?.[0];
  if (!firstMatch?.title) {
    return null;
  }

  const extractUrl =
    'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&format=json&origin=*&titles=' +
    encodeURIComponent(firstMatch.title);
  const extractResponse = await fetch(extractUrl);
  if (!extractResponse.ok) {
    throw new Error('Unable to read election details from source.');
  }

  const extractData = await extractResponse.json();
  const pages = extractData?.query?.pages || {};
  const page = Object.values(pages)[0];
  const electionDate = extractElectionDate(page?.extract || '');

  return {
    electionDate,
    sourceTitle: firstMatch.title,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(firstMatch.title.replace(/ /g, '_'))}`
  };
}

if (pinForm) {
  pinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pinCode = pinInput.value.trim();

    // India PIN codes are 6 digits and cannot start with 0.
    if (!/^[1-9]\d{5}$/.test(pinCode)) {
      pinResult.textContent = 'Please enter a valid 6-digit Indian PIN code.';
      return;
    }

    pinResult.textContent = 'Fetching region and election date from live sources...';

    try {
      const region = await fetchPinRegion(pinCode);
      const electionInfo = await fetchElectionDateForState(region.state);

      if (electionInfo?.electionDate) {
        pinResult.innerHTML = [
          `PIN ${pinCode} (${region.name}, ${region.district}, ${region.state}): `,
          `next known election date is <strong>${electionInfo.electionDate}</strong>. `,
          `<a href="${electionInfo.sourceUrl}" target="_blank" rel="noopener noreferrer">Source: ${electionInfo.sourceTitle}</a>`
        ].join('');
        return;
      }

      pinResult.innerHTML = [
        `PIN ${pinCode} (${region.name}, ${region.district}, ${region.state}): `,
        'no exact announced date was found yet in live public schedule text. ',
        'Please check the Election Commission portal for official updates: ',
        '<a href="https://eci.gov.in/" target="_blank" rel="noopener noreferrer">eci.gov.in</a>'
      ].join('');
    } catch (error) {
      pinResult.textContent = error.message || 'Unable to fetch election details right now.';
    }
  });
}

// ── Registration panel actions ─────────────────────────────
const journeyFeedback = document.getElementById('journey-feedback');

const ACTION_LINKS = {
  'check-status': 'https://voters.eci.gov.in/',
  'find-deadline': 'https://eci.gov.in/elections/election-schedules/',
  'register-online': 'https://voters.eci.gov.in/home/nvsp',
  'learn-candidates': 'https://affidavit.eci.gov.in/',
  'find-polling-booth': 'https://electoralsearch.eci.gov.in/',
  'track-results': 'https://results.eci.gov.in/'
};

const ACTION_MESSAGES = {
  'check-status': 'Opening ECI voter status portal...',
  'find-deadline': 'Opening ECI election schedule page...',
  'register-online': 'Opening official NVSP registration page...',
  'learn-candidates': 'Opening official candidate affidavit portal...',
  'find-polling-booth': 'Opening official polling station search...',
  'track-results': 'Opening live election results dashboard...'
};

document.querySelectorAll('.journey-action-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const url = ACTION_LINKS[action];
    if (!url) return;

    if (journeyFeedback) {
      journeyFeedback.textContent = ACTION_MESSAGES[action] || 'Opening resource...';
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
});

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function createElectionEventICS() {
  const now = new Date();
  const electionDate = new Date(Date.UTC(2026, 10, 5, 14, 0, 0));
  const endDate = new Date(Date.UTC(2026, 10, 5, 15, 0, 0));
  const uid = `election-reminder-${Date.now()}@yourvoteyourvoice`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Your Vote Your Voice//Election Reminder//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(electionDate)}`,
    `DTEND:${toICSDate(endDate)}`,
    'SUMMARY:Election Day Reminder',
    'DESCRIPTION:Remember to vote. Verify your polling location and required ID in advance.',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

const addCalendarBtn = document.getElementById('add-calendar-btn');
if (addCalendarBtn) {
  // Ensure the button is icon-only and uses the corner class (handles cached/static variants)
  addCalendarBtn.className = 'calendar-corner-btn';
  addCalendarBtn.innerHTML = '<span class="material-icons" aria-hidden="true">calendar_today</span>';

  addCalendarBtn.addEventListener('click', () => {
    const icsContent = createElectionEventICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = url;
    tempLink.download = 'election-day-reminder.ics';
    document.body.appendChild(tempLink);
    tempLink.click();
    tempLink.remove();
    URL.revokeObjectURL(url);

    if (journeyFeedback) {
      journeyFeedback.textContent = 'Calendar event downloaded: election-day-reminder.ics';
    }
  });
}

  // AI assistant removed by user request

      // assistant code removed

// ── India Election map: all states + broad city coverage ───
const INDIA_FALLBACK_STATE_CITIES = {
  Andhra_Pradesh: ['Visakhapatnam', 'Vijayawada', 'Guntur'],
  Arunachal_Pradesh: ['Itanagar', 'Naharlagun', 'Tawang'],
  Assam: ['Guwahati', 'Silchar', 'Dibrugarh'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur'],
  Chhattisgarh: ['Raipur', 'Bilaspur', 'Durg'],
  Goa: ['Panaji', 'Margao', 'Mapusa'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat'],
  Himachal_Pradesh: ['Shimla', 'Dharamshala', 'Mandi'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru'],
  Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode'],
  Madhya_Pradesh: ['Bhopal', 'Indore', 'Gwalior'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
  Manipur: ['Imphal', 'Thoubal', 'Churachandpur'],
  Meghalaya: ['Shillong', 'Tura', 'Jowai'],
  Mizoram: ['Aizawl', 'Lunglei', 'Champhai'],
  Nagaland: ['Kohima', 'Dimapur', 'Mokokchung'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur'],
  Sikkim: ['Gangtok', 'Namchi', 'Gyalshing'],
  Tamil_Nadu: ['Chennai', 'Coimbatore', 'Madurai'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad'],
  Tripura: ['Agartala', 'Udaipur', 'Dharmanagar'],
  Uttar_Pradesh: ['Lucknow', 'Kanpur', 'Varanasi'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Haldwani'],
  West_Bengal: ['Kolkata', 'Howrah', 'Siliguri'],
  Andaman_and_Nicobar_Islands: ['Port Blair', 'Diglipur', 'Rangat'],
  Chandigarh: ['Chandigarh'],
  Dadra_and_Nagar_Haveli_and_Daman_and_Diu: ['Daman', 'Diu', 'Silvassa'],
  Delhi: ['New Delhi', 'Dwarka', 'Rohini'],
  Jammu_and_Kashmir: ['Srinagar', 'Jammu', 'Anantnag'],
  Ladakh: ['Leh', 'Kargil'],
  Lakshadweep: ['Kavaratti', 'Amini'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe']
};

const ELECTION_RESOURCE_LINKS = [
  { label: 'ECI Official', url: 'https://eci.gov.in/' },
  { label: 'Voters Portal', url: 'https://voters.eci.gov.in/' },
  { label: 'Find Polling Station', url: 'https://electoralsearch.eci.gov.in/' },
  { label: 'Election Schedules', url: 'https://eci.gov.in/elections/election-schedules/' }
];

const stateSelect = document.getElementById('state-select');
const citySelect = document.getElementById('city-select');
const cityFilterInput = document.getElementById('city-filter');
const areaInput = document.getElementById('area-input');
const showElectionInfoBtn = document.getElementById('show-election-info-btn');
const resetElectionBtn = document.getElementById('reset-election-btn');
const electionResults = document.getElementById('election-results');
const electionMapFeedback = document.getElementById('election-map-feedback');
const cityCacheByState = new Map();
let allCitiesForSelectedState = [];

function normalizeStateKey(value) {
  return value.replace(/\s+/g, '_');
}

function buildOptions(selectElement, options, placeholder) {
  selectElement.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholder;
  selectElement.appendChild(defaultOption);

  options.forEach((option) => {
    const optionNode = document.createElement('option');
    optionNode.value = option;
    optionNode.textContent = option;
    selectElement.appendChild(optionNode);
  });
}

function setElectionFeedback(message, isLoading = false) {
  if (!electionMapFeedback) return;
  electionMapFeedback.textContent = message;
  electionMapFeedback.classList.toggle('is-loading', isLoading);
}

async function fetchIndiaStates() {
  const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: 'India' })
  });

  if (!response.ok) {
    throw new Error('Unable to load state list right now.');
  }

  const data = await response.json();
  const states = data?.data?.states?.map((item) => item.name).filter(Boolean) || [];
  if (!states.length) throw new Error('No state data available from provider.');

  return Array.from(new Set(states)).sort((a, b) => a.localeCompare(b));
}

async function fetchCitiesForState(state) {
  if (cityCacheByState.has(state)) {
    return cityCacheByState.get(state);
  }

  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India', state })
    });

    if (!response.ok) {
      throw new Error('City API unavailable');
    }

    const data = await response.json();
    const cities = Array.isArray(data?.data)
      ? data.data.filter(Boolean).sort((a, b) => a.localeCompare(b))
      : [];

    if (!cities.length) {
      throw new Error('No city data returned');
    }

    cityCacheByState.set(state, cities);
    return cities;
  } catch {
    const fallback = INDIA_FALLBACK_STATE_CITIES[normalizeStateKey(state)] || [];
    cityCacheByState.set(state, fallback);
    return fallback;
  }
}

function getElectionStoryline(state, city) {
  return [
    `District Election Office, ${city} under CEO ${state}`,
    'Electoral Registration Officer and BLO help network for voter updates'
  ];
}

function getDeadlineStoryline(city) {
  return [
    `Electoral roll revision notices for ${city} are released through district channels`,
    'Correction and transposition requests are accepted only in notified windows'
  ];
}

function getActionKits(area) {
  const localityTag = area ? ` - ${area}` : '';
  return [
    `Confirm voter record status${localityTag}`,
    'Verify final polling station assignment before poll day',
    'Keep valid photo identification and EPIC details ready',
    'Escalate unresolved issues through official helpline 1950'
  ];
}

function renderElectionInfo(state, city, area) {
  if (!electionResults) return;

  const areaNote = area
    ? `<div class="election-area-note"><strong>Area focus:</strong> ${area} - nearest ward/BLO center details may vary slightly. Use the resources below to confirm your exact polling station.</div>`
    : '';

  const officeItems = getElectionStoryline(state, city).map((item) => `<li>${item}</li>`).join('');
  const deadlineItems = getDeadlineStoryline(city).map((item) => `<li>${item}</li>`).join('');
  const resourceItems = ELECTION_RESOURCE_LINKS
    .map((item) => `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.label}</a>`)
    .join('');
  const actionKitItems = getActionKits(area).map((item) => `<li>${item}</li>`).join('');

  electionResults.classList.remove('is-empty');
  electionResults.innerHTML = `
    <div class="election-results-top">
      <span class="election-location-tag">
        <span class="material-icons">place</span>
        ${city}, ${state}
      </span>
      <span class="election-live-chip">OFFICIAL LOCAL BRIEFING</span>
    </div>
    <div class="election-result-grid">
      <article class="election-info-card">
        <h4><span class="material-icons">account_balance</span>Election Administrative Offices</h4>
        <p>Essential contact points.</p>
        <ul class="election-info-list">${officeItems}</ul>
      </article>
      <article class="election-info-card">
        <h4><span class="material-icons">event_available</span>Statutory Timeline and Deadlines</h4>
        <p>Only critical date guidance.</p>
        <ul class="election-info-list">${deadlineItems}</ul>
      </article>
      <article class="election-info-card">
        <h4><span class="material-icons">hub</span>Official Election Resources</h4>
        <p>Authoritative portals for verification, polling station lookup, and schedule notices.</p>
        <div class="election-resource-links">${resourceItems}</div>
      </article>
    </div>
    <div class="election-action-strip">
      <h5>Priority Voter Compliance Checklist</h5>
      <ul class="election-action-list">${actionKitItems}</ul>
    </div>
    ${areaNote}
  `;
}

if (stateSelect && citySelect && showElectionInfoBtn && resetElectionBtn) {
  setElectionFeedback('Loading all Indian states and union territories...', true);
  fetchIndiaStates()
    .then((states) => {
      buildOptions(stateSelect, states, 'Choose a state');
      setElectionFeedback(`${states.length} states/UTs loaded. Select your state to continue.`);
    })
    .catch(() => {
      const fallbackStates = Object.keys(INDIA_FALLBACK_STATE_CITIES)
        .map((key) => key.replace(/_/g, ' '))
        .sort((a, b) => a.localeCompare(b));
      buildOptions(stateSelect, fallbackStates, 'Choose a state');
      setElectionFeedback('Using offline state list. You can still continue normally.');
    });

  stateSelect.addEventListener('change', async () => {
    const selectedState = stateSelect.value;
    if (!selectedState) {
      citySelect.disabled = true;
      if (cityFilterInput) {
        cityFilterInput.value = '';
        cityFilterInput.disabled = true;
      }
      buildOptions(citySelect, [], 'Select state first');
      setElectionFeedback('Select a state to continue.');
      return;
    }

    setElectionFeedback(`Loading cities for ${selectedState}...`, true);
    const cities = await fetchCitiesForState(selectedState);
    allCitiesForSelectedState = cities;
    citySelect.disabled = false;
    buildOptions(citySelect, cities, cities.length ? `Choose a city (${cities.length} available)` : 'No cities found');
    if (cityFilterInput) {
      cityFilterInput.value = '';
      cityFilterInput.disabled = !cities.length;
    }
    setElectionFeedback(
      cities.length
        ? `${selectedState} ready. ${cities.length} cities loaded, now choose your city.`
        : `${selectedState} selected, but city list is limited for this source.`
    );
  });

  cityFilterInput?.addEventListener('input', () => {
    const query = cityFilterInput.value.trim().toLowerCase();
    const filtered = allCitiesForSelectedState.filter((city) => city.toLowerCase().includes(query));
    buildOptions(citySelect, filtered, filtered.length ? `Choose a city (${filtered.length} match)` : 'No matching city');
    citySelect.disabled = !filtered.length;
  });

  showElectionInfoBtn.addEventListener('click', () => {
    const selectedState = stateSelect.value;
    const selectedCity = citySelect.value;
    const area = areaInput?.value.trim() || '';

    if (!selectedState) {
      setElectionFeedback('Please select a state first.');
      stateSelect.focus();
      return;
    }

    if (!selectedCity) {
      setElectionFeedback('Please select a city after selecting your state.');
      citySelect.focus();
      return;
    }

    renderElectionInfo(selectedState, selectedCity, area);
    setElectionFeedback(
      area
        ? `Showing election details for ${selectedCity}, ${selectedState} (area: ${area}).`
        : `Showing election details for ${selectedCity}, ${selectedState}.`
    );
  });

  resetElectionBtn.addEventListener('click', () => {
    stateSelect.value = '';
    citySelect.disabled = true;
    buildOptions(citySelect, [], 'Select state first');
    allCitiesForSelectedState = [];
    if (cityFilterInput) {
      cityFilterInput.value = '';
      cityFilterInput.disabled = true;
    }
    if (areaInput) areaInput.value = '';
    setElectionFeedback('Reset complete. Start again by selecting a state.');
    if (electionResults) {
      electionResults.classList.add('is-empty');
      electionResults.innerHTML = `
        <div class="election-results-placeholder">
          <span class="material-icons">map</span>
          <h3>Ready when you are</h3>
          <p>Select your state and city to unlock tailored election info for your locality.</p>
        </div>
      `;
    }
  });
}
