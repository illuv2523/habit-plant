const STORAGE_KEY = "habit-plant-v1";
const XP_GOAL = 100;
const BASE_XP = 10;
const BONUSES = [0, 5, 10, 15];

const PLANTS = [
  { id: "cactus", name: "Кактус", unlockAt: 0, blurb: "Неприхотливый житель пустыни" },
  { id: "monstera", name: "Монстера", unlockAt: 0, blurb: "Крупные резные листья" },
  { id: "sunflower", name: "Подсолнух", unlockAt: 0, blurb: "Тянется к свету" },
  { id: "sakura", name: "Сакура", unlockAt: 1, blurb: "Нежное весеннее цветение" },
  { id: "bonsai", name: "Бонсай", unlockAt: 2, blurb: "Терпение в миниатюре" },
  { id: "magic", name: "Волшебное Древо", unlockAt: 3, blurb: "Редкое сияющее дерево" }
];

const ACHIEVEMENTS = [
  { id: "first-habit", name: "Первая привычка", desc: "Создайте первую привычку" },
  { id: "first-complete", name: "Первый росток", desc: "Отметьте привычку впервые" },
  { id: "first-plant", name: "Первое растение", desc: "Вырастите растение до конца" },
  { id: "streak-7", name: "Серия 7 дней", desc: "Закройте все привычки дня семь дней подряд" },
  { id: "collector", name: "Коллекционер", desc: "Вырастите 3 разных растения" },
  { id: "master", name: "Мастер оранжереи", desc: "Вырастите все 6 растений" }
];

const STAGE_NAMES = ["Семечко", "Росток", "Молодое", "Цветение", "Взрослое"];
const DAYS = [
  { id: 1, label: "Пн" },
  { id: 2, label: "Вт" },
  { id: 3, label: "Ср" },
  { id: 4, label: "Чт" },
  { id: 5, label: "Пт" },
  { id: 6, label: "Сб" },
  { id: 0, label: "Вс" }
];

const $ = (sel) => document.querySelector(sel);
let state = loadState();
let currentTab = "home";

function defaultState() {
  return {
    theme: "light",
    habits: [],
    activePlant: null,
    pendingXp: 0,
    collection: [],
    achievements: {},
    perfectDays: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    const base = defaultState();
    base.theme = data.theme === "dark" ? "dark" : "light";
    base.habits = Array.isArray(data.habits) ? data.habits.map(sanitizeHabit).filter(Boolean) : [];
    base.activePlant = sanitizeActive(data.activePlant);
    base.pendingXp = Math.max(0, Number(data.pendingXp) || 0);
    base.collection = Array.isArray(data.collection)
      ? data.collection.filter((item) => item && plantById(item.plantId) && item.completedAt)
      : [];
    base.achievements = data.achievements && typeof data.achievements === "object" ? data.achievements : {};
    base.perfectDays = Array.isArray(data.perfectDays) ? data.perfectDays.filter((d) => typeof d === "string") : [];
    return base;
  } catch {
    return defaultState();
  }
}

function sanitizeHabit(habit) {
  if (!habit || typeof habit.name !== "string") return null;
  const name = habit.name.trim().slice(0, 40);
  if (!name) return null;
  const regularity = ["daily", "weekdays", "weekends", "custom"].includes(habit.regularity)
    ? habit.regularity
    : "daily";
  const days = Array.isArray(habit.days) ? habit.days.map(Number).filter((d) => d >= 0 && d <= 6) : [];
  const bonus = BONUSES.includes(Number(habit.bonus)) ? Number(habit.bonus) : 0;
  return {
    id: String(habit.id || uid()),
    name,
    regularity,
    days,
    bonus,
    createdAt: Number(habit.createdAt) || Date.now(),
    completions: Array.isArray(habit.completions) ? habit.completions.filter((d) => typeof d === "string") : []
  };
}

function sanitizeActive(plant) {
  if (!plant || !plantById(plant.plantId)) return null;
  return {
    plantId: plant.plantId,
    xp: Math.max(0, Math.min(XP_GOAL - 1, Number(plant.xp) || 0)),
    plantedAt: plant.plantedAt || today()
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function plantById(id) {
  return PLANTS.find((plant) => plant.id === id);
}

function today() {
  return dateKey(new Date());
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(key) {
  return parseKey(key).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stageIndex(xp) {
  if (xp >= 80) return 4;
  if (xp >= 60) return 3;
  if (xp >= 40) return 2;
  if (xp >= 20) return 1;
  return 0;
}

function xpReward(habit) {
  return BASE_XP + Number(habit.bonus || 0);
}

function distinctGrown() {
  return new Set(state.collection.map((item) => item.plantId)).size;
}

function isUnlocked(plant) {
  return distinctGrown() >= plant.unlockAt;
}

function isScheduled(habit, date) {
  const day = date.getDay();
  if (habit.regularity === "daily") return true;
  if (habit.regularity === "weekdays") return day >= 1 && day <= 5;
  if (habit.regularity === "weekends") return day === 0 || day === 6;
  return (habit.days || []).includes(day);
}

function regularityLabel(habit) {
  if (habit.regularity === "daily") return "Каждый день";
  if (habit.regularity === "weekdays") return "По будням";
  if (habit.regularity === "weekends") return "По выходным";
  const names = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 0: "Вс" };
  const labels = [1, 2, 3, 4, 5, 6, 0].filter((d) => habit.days.includes(d)).map((d) => names[d]);
  return labels.join(", ") || "Выбранные дни";
}

function daysPhrase(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} дня`;
  return `${count} дней`;
}

function grownPhrase(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} выращенного растения`;
  return `${count} выращенных растений`;
}

function scheduledOn(date) {
  return state.habits.filter((habit) => isScheduled(habit, date));
}

function isPerfect(key) {
  const list = scheduledOn(parseKey(key));
  return list.length > 0 && list.every((habit) => habit.completions.includes(key));
}

function refreshPerfect(key) {
  const perfect = isPerfect(key);
  const has = state.perfectDays.includes(key);
  if (perfect && !has) state.perfectDays.push(key);
  if (!perfect && has) state.perfectDays = state.perfectDays.filter((day) => day !== key);
}

function streakCount() {
  let cursor = new Date();
  if (!state.perfectDays.includes(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let count = 0;
  while (state.perfectDays.includes(dateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function sceneHtml(type, stage, mini) {
  const safeStage = Math.min(5, Math.max(1, stage));
  return `
    <div class="scene ${mini ? "scene--mini" : ""}">
      <div class="flora flora--${type} flora--s${safeStage}" aria-hidden="true">
        ${floraParts(type)}
      </div>
      <div class="pot"><div class="soil"></div></div>
    </div>`;
}

function floraParts(type) {
  if (type === "cactus") {
    return `<span class="cactus-body"></span><span class="cactus-arm cactus-arm--l"></span><span class="cactus-arm cactus-arm--r"></span><span class="cactus-flower"></span><span class="seed"></span>`;
  }
  if (type === "monstera") {
    return `<span class="m-stem"></span><span class="m-leaf m-leaf--1"></span><span class="m-leaf m-leaf--2"></span><span class="m-leaf m-leaf--3"></span><span class="m-leaf m-leaf--4"></span><span class="seed"></span>`;
  }
  if (type === "sunflower") {
    return `<span class="sf-stem"></span><span class="sf-leaf sf-leaf--l"></span><span class="sf-leaf sf-leaf--r"></span><span class="sf-petals"></span><span class="sf-head"></span><span class="seed"></span>`;
  }
  if (type === "sakura") {
    return `<span class="sk-trunk"></span><span class="sk-branch sk-branch--l"></span><span class="sk-branch sk-branch--r"></span><span class="sk-crown"></span><span class="sk-bloom"></span><span class="sk-bloom sk-bloom--b"></span><span class="seed"></span>`;
  }
  if (type === "bonsai") {
    return `<span class="bn-trunk"></span><span class="bn-canopy bn-canopy--a"></span><span class="bn-canopy bn-canopy--b"></span><span class="bn-canopy bn-canopy--c"></span><span class="seed"></span>`;
  }
  return `<span class="mg-trunk"></span><span class="mg-canopy mg-canopy--a"></span><span class="mg-canopy mg-canopy--b"></span><span class="mg-canopy mg-canopy--c"></span><span class="mg-spark mg-spark--1"></span><span class="mg-spark mg-spark--2"></span><span class="mg-spark mg-spark--3"></span><span class="mg-spark mg-spark--4"></span><span class="seed seed--magic"></span>`;
}

function emptyScene() {
  return `<div class="scene"><div class="pot"><div class="soil"></div></div></div>`;
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const dark = state.theme === "dark";
  const button = $(".theme-btn");
  button.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  $(".theme-label").textContent = dark ? "Светлая" : "Тёмная";
}

function render() {
  applyTheme();
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === currentTab;
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  $("#view-home").hidden = currentTab !== "home";
  $("#view-greenhouse").hidden = currentTab !== "greenhouse";
  $("#today-label").textContent = formatDate(today());
  $("#plant-widget").innerHTML = renderPlantWidget();
  $("#habit-list").innerHTML = renderHabits();
  $("#collection-count").textContent = `${distinctGrown()} из ${PLANTS.length} видов`;
  $("#plant-grid").innerHTML = PLANTS.map(renderGreenhouseCard).join("");
  $("#achievement-grid").innerHTML = ACHIEVEMENTS.map(renderAchievement).join("");
}

function renderPlantWidget() {
  const streak = streakCount();
  const streakHtml = streak > 0 ? `<p class="streak-note">Серия: ${daysPhrase(streak)}</p>` : "";
  if (!state.activePlant) {
    const pending = state.pendingXp > 0
      ? `<p class="pending-note">Накоплено ${state.pendingXp} XP. Они перейдут растению при посадке.</p>`
      : "";
    return `
      <p class="plant-kicker">Текущее растение</p>
      <h2>Горшок ждёт</h2>
      <p class="stage-name">Выберите, что выращивать</p>
      ${emptyScene()}
      ${pending}
      ${streakHtml}
      <div class="plant-actions">
        <button type="button" class="btn btn-primary" data-action="open-plants">Выбрать растение</button>
      </div>`;
  }
  const plant = plantById(state.activePlant.plantId);
  const xp = state.activePlant.xp;
  const stage = stageIndex(xp);
  const width = Math.max(0, Math.min(100, xp));
  return `
    <p class="plant-kicker">Стадия ${stage + 1} из 5</p>
    <h2>${escapeHtml(plant.name)}</h2>
    <p class="stage-name">${STAGE_NAMES[stage]}</p>
    ${sceneHtml(plant.id, stage + 1, false)}
    <div class="xp-block">
      <div class="xp-labels"><span>Опыт</span><span>${xp} / ${XP_GOAL} XP</span></div>
      <div class="xp-track" role="progressbar" aria-valuenow="${xp}" aria-valuemin="0" aria-valuemax="${XP_GOAL}" aria-label="Опыт растения">
        <div class="xp-fill" style="width:${width}%"></div>
        <span class="tick" style="left:20%"></span>
        <span class="tick" style="left:40%"></span>
        <span class="tick" style="left:60%"></span>
        <span class="tick" style="left:80%"></span>
      </div>
    </div>
    ${streakHtml}`;
}

function renderHabits() {
  const date = new Date();
  const key = today();
  const todayHabits = state.habits.filter((habit) => isScheduled(habit, date));
  const later = state.habits.filter((habit) => !isScheduled(habit, date));
  if (state.habits.length === 0) {
    return `<li class="empty-habits"><p>На сегодня привычек нет.</p><p>Создайте первую — и растение начнёт расти.</p></li>`;
  }
  const todayHtml = todayHabits.length
    ? todayHabits.map((habit) => habitRow(habit, key, true)).join("")
    : `<li class="empty-habits"><p>Сегодня эти привычки отдыхают.</p><p>Отметить их можно в свой день.</p></li>`;
  const laterHtml = later.length
    ? `<li class="section-label">Не на сегодня</li>${later.map((habit) => habitRow(habit, key, false)).join("")}`
    : "";
  return todayHtml + laterHtml;
}

function habitRow(habit, key, checkable) {
  const done = habit.completions.includes(key);
  const check = checkable
    ? `<label class="check"><input type="checkbox" data-action="toggle-habit" data-id="${habit.id}" ${done ? "checked" : ""} /></label>`
    : "";
  return `
    <li class="habit ${done ? "is-done" : ""}">
      ${check}
      <div class="habit-body">
        <p class="habit-name">${escapeHtml(habit.name)}</p>
        <p class="habit-meta">${escapeHtml(regularityLabel(habit))} · +${xpReward(habit)} XP</p>
      </div>
      <button type="button" class="icon-btn" data-action="delete-habit" data-id="${habit.id}" aria-label="Удалить привычку ${escapeHtml(habit.name)}">×</button>
    </li>`;
}

function cardStage(plant) {
  if (state.activePlant && state.activePlant.plantId === plant.id) {
    return stageIndex(state.activePlant.xp) + 1;
  }
  const grown = state.collection.some((item) => item.plantId === plant.id);
  if (grown) return 5;
  if (!isUnlocked(plant)) return 2;
  return 4;
}

function renderGreenhouseCard(plant) {
  const history = state.collection.filter((item) => item.plantId === plant.id);
  const grown = history.length > 0;
  const unlocked = isUnlocked(plant);
  const active = state.activePlant && state.activePlant.plantId === plant.id;
  const classes = ["g-card", grown ? "is-grown" : "", !unlocked ? "is-locked" : "", active ? "is-active" : ""].filter(Boolean);
  let status = "Можно посадить";
  if (active) status = "Растёт сейчас";
  else if (grown) status = "Выращено";
  else if (!unlocked) status = `Закрыто · после ${grownPhrase(plant.unlockAt)}`;
  const historyHtml = history.length
    ? `<ul class="history">${history.slice().reverse().map((item) => `<li>${escapeHtml(formatDate(item.completedAt))}</li>`).join("")}</ul>`
    : "";
  let action = "";
  if (active) action = `<button type="button" class="btn btn-ghost" disabled>Уже растёт</button>`;
  else if (!unlocked) action = "";
  else action = `<button type="button" class="btn btn-primary" data-action="plant" data-id="${plant.id}">${grown ? "Посадить снова" : "Посадить"}</button>`;
  return `
    <article class="${classes.join(" ")}">
      <div class="card-art">${sceneHtml(plant.id, cardStage(plant), true)}</div>
      <div class="g-card-body">
        <h3>${escapeHtml(plant.name)}</h3>
        <p class="status"><strong>${status}</strong></p>
        <p class="blurb">${escapeHtml(plant.blurb)}</p>
        ${historyHtml}
        ${action}
      </div>
    </article>`;
}

function renderAchievement(item) {
  const earned = state.achievements[item.id];
  return `
    <article class="a-card ${earned ? "is-earned" : ""}">
      <span class="badge">${earned ? "Получено" : "Закрыто"}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.desc)}</p>
      ${earned ? `<p>${escapeHtml(formatDate(earned))}</p>` : ""}
    </article>`;
}

function toast(message, kind) {
  const el = document.createElement("div");
  el.className = `toast toast--${kind || "ok"}`;
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function grantAchievements() {
  const checks = {
    "first-habit": state.habits.length >= 1,
    "first-complete": state.habits.some((habit) => habit.completions.length > 0),
    "first-plant": state.collection.length >= 1,
    "streak-7": streakCount() >= 7,
    collector: distinctGrown() >= 3,
    master: distinctGrown() >= PLANTS.length
  };
  const fresh = [];
  const key = today();
  ACHIEVEMENTS.forEach((item) => {
    if (checks[item.id] && !state.achievements[item.id]) {
      state.achievements[item.id] = key;
      fresh.push(item);
    }
  });
  return fresh;
}

function announceAchievements(list) {
  list.forEach((item) => toast(`Достижение: ${item.name}`, "win"));
}

function addXp(amount) {
  if (!state.activePlant) {
    state.pendingXp += amount;
    return { pending: true, gained: amount };
  }
  const before = stageIndex(state.activePlant.xp);
  state.activePlant.xp += amount;
  if (state.activePlant.xp >= XP_GOAL) {
    const overflow = state.activePlant.xp - XP_GOAL;
    const plantId = state.activePlant.plantId;
    state.collection.push({ plantId, completedAt: today() });
    state.activePlant = null;
    state.pendingXp += overflow;
    return { completed: true, plantId, overflow, gained: amount };
  }
  const after = stageIndex(state.activePlant.xp);
  return { gained: amount, stageUp: after > before, stage: after };
}

function refundXp(amount) {
  if (state.activePlant) {
    state.activePlant.xp = Math.max(0, state.activePlant.xp - amount);
    return amount;
  }
  const take = Math.min(state.pendingXp, amount);
  state.pendingXp -= take;
  return take;
}

function afterGain(result, options) {
  const quiet = options && options.quiet;
  refreshPerfect(today());
  const unlocked = grantAchievements();
  save();
  render();
  if (result.completed) {
    const plant = plantById(result.plantId);
    toast(`«${plant.name}» выросло и сохранено в оранжерее!`, "win");
    if (result.overflow > 0) toast(`Лишние ${result.overflow} XP ждут следующее растение`);
    openPlantModal(result.plantId);
  } else if (result.stageUp) {
    toast(`Новая стадия: ${STAGE_NAMES[result.stage]}`, "stage");
  } else if (result.pending) {
    toast(`+${result.gained} XP копятся до посадки`);
  } else if (!quiet && result.gained) {
    toast(`+${result.gained} XP`);
  }
  announceAchievements(unlocked);
}

function toggleHabit(id, checked) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;
  const key = today();
  const done = habit.completions.includes(key);
  if (checked && !done) {
    habit.completions.push(key);
    afterGain(addXp(xpReward(habit)));
    return;
  }
  if (!checked && done) {
    habit.completions = habit.completions.filter((day) => day !== key);
    const returned = refundXp(xpReward(habit));
    refreshPerfect(key);
    save();
    render();
    toast(returned > 0 ? "Отметка снята, опыт возвращён" : "Растение уже выросло — опыт остаётся в коллекции");
  }
}

function deleteHabit(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;
  const key = today();
  if (habit.completions.includes(key)) refundXp(xpReward(habit));
  state.habits = state.habits.filter((item) => item.id !== id);
  refreshPerfect(key);
  save();
  render();
  toast("Привычка удалена");
}

function plantSpecies(id) {
  if (state.activePlant) {
    toast("Сначала вырастите текущее растение");
    return;
  }
  const plant = plantById(id);
  if (!plant || !isUnlocked(plant)) {
    toast(plant ? `Откроется после ${grownPhrase(plant.unlockAt)}` : "Растение не найдено");
    return;
  }
  state.activePlant = { plantId: id, xp: 0, plantedAt: today() };
  const pending = state.pendingXp;
  state.pendingXp = 0;
  closeModals();
  if (pending > 0) {
    const result = addXp(pending);
    toast(`${plant.name} посажено`);
    afterGain(result, { quiet: true });
    return;
  }
  save();
  render();
  toast(`${plant.name} посажено`);
}

function openHabitModal() {
  const form = $("#habit-form");
  form.reset();
  $("#day-picker").hidden = true;
  document.querySelectorAll(".day-chip").forEach((chip) => {
    chip.classList.remove("is-on");
    chip.setAttribute("aria-pressed", "false");
  });
  $("#modal-habit").hidden = false;
  form.elements.name.focus();
}

function openPlantModal(celebrateId) {
  const celebrate = celebrateId ? plantById(celebrateId) : null;
  const intro = celebrate
    ? `<div class="congrats">
        ${sceneHtml(celebrate.id, 5, false)}
        <h2 id="plant-modal-title">Поздравляем!</h2>
        <p>Растение «${escapeHtml(celebrate.name)}» полностью выросло.</p>
        <p class="muted">${escapeHtml(formatDate(today()))} · статус «Выращено»</p>
      </div>
      <h3>Выберите следующее растение</h3>`
    : `<h2 id="plant-modal-title">Выберите растение</h2>
       <p class="muted">Открытые виды можно посадить сразу. Закрытые ждут новых урожаев.</p>`;
  const cards = PLANTS.map((plant) => {
    const unlocked = isUnlocked(plant);
    const grown = state.collection.some((item) => item.plantId === plant.id);
    const note = !unlocked
      ? `После ${grownPhrase(plant.unlockAt)}`
      : grown
        ? "Выращено · можно снова"
        : "Можно посадить";
    return `
      <button type="button" class="picker-card ${grown ? "is-grown" : ""}" data-action="plant" data-id="${plant.id}" ${unlocked ? "" : "disabled"}>
        <strong>${escapeHtml(plant.name)}</strong>
        <p class="blurb">${escapeHtml(plant.blurb)}</p>
        <p class="status">${note}</p>
      </button>`;
  }).join("");
  $("#plant-modal-body").innerHTML = `${intro}<div class="picker-grid">${cards}</div>`;
  $("#modal-plant").hidden = false;
}

function closeModals() {
  $("#modal-habit").hidden = true;
  $("#modal-plant").hidden = true;
}

function renderDayPicker() {
  $("#day-row").innerHTML = DAYS.map((day) =>
    `<button type="button" class="day-chip" data-action="day" data-day="${day.id}" aria-pressed="false">${day.label}</button>`
  ).join("");
}

function bind() {
  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "toggle-habit") return;
    if (action === "tab") {
      currentTab = el.dataset.tab;
      render();
    } else if (action === "theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save();
      applyTheme();
    } else if (action === "open-habit") {
      openHabitModal();
    } else if (action === "open-plants") {
      openPlantModal(null);
    } else if (action === "close-modal") {
      closeModals();
    } else if (action === "day") {
      const on = el.classList.toggle("is-on");
      el.setAttribute("aria-pressed", String(on));
    } else if (action === "delete-habit") {
      deleteHabit(el.dataset.id);
    } else if (action === "plant") {
      plantSpecies(el.dataset.id);
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input.matches("[data-action='toggle-habit']")) {
      toggleHabit(input.dataset.id, input.checked);
    }
    if (input.id === "regularity") {
      $("#day-picker").hidden = input.value !== "custom";
    }
  });

  $("#habit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const regularity = String(data.get("regularity") || "daily");
    const days = [...document.querySelectorAll(".day-chip.is-on")].map((chip) => Number(chip.dataset.day));
    if (regularity === "custom" && days.length === 0) {
      toast("Выберите хотя бы один день");
      return;
    }
    const bonus = BONUSES.includes(Number(data.get("bonus"))) ? Number(data.get("bonus")) : 0;
    state.habits.push({
      id: uid(),
      name: name.slice(0, 40),
      regularity,
      days,
      bonus,
      createdAt: Date.now(),
      completions: []
    });
    const unlocked = grantAchievements();
    save();
    closeModals();
    render();
    toast("Привычка создана");
    announceAchievements(unlocked);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
  });
}

renderDayPicker();
if (grantAchievements().length) save();
render();
bind();
