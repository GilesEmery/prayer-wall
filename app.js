const API_BASE = "https://script.google.com/macros/s/AKfycbwHdUHET2S5jWrowlHP1G3YsV-UMdhzPqjp3yG1Q9FAvOe_oszZGpSSgzIIs3KGmX3j9g/exec";

const wall = document.getElementById("wall");
const emptyState = document.getElementById("empty");
const searchEl = document.getElementById("search");
const cta = document.getElementById("cta");

const backdrop = document.getElementById("modalBackdrop");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalMsg = document.getElementById("modalMsg");

const stepEmail = document.getElementById("stepEmail");
const stepCode = document.getElementById("stepCode");
const stepForm = document.getElementById("stepForm");

const emailEl = document.getElementById("email");
const codeEl = document.getElementById("code");
const sendCodeBtn = document.getElementById("sendCode");
const verifyBtn = document.getElementById("verifyCode");
const backToEmailBtn = document.getElementById("backToEmail");

const displayNameEl = document.getElementById("displayName");
const locationEl = document.getElementById("location");
const categoryEl = document.getElementById("category");
const titleEl = document.getElementById("title");
const prayerTextEl = document.getElementById("prayerText");
const submitPrayerBtn = document.getElementById("submitPrayer");

const anonToggle = document.getElementById("anonToggle");
let anonOn = false;

let feedRows = [];
let token = localStorage.getItem("pw_token") || "";
let lastEmail = localStorage.getItem("pw_email") || "";

function setMsg(text) {
  if (!text) { modalMsg.classList.add("hidden"); modalMsg.textContent = ""; return; }
  modalMsg.textContent = text;
  modalMsg.classList.remove("hidden");
}

function openModal() {
  backdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
  setMsg("");
}
function closeModal() {
  backdrop.classList.add("hidden");
  modal.classList.add("hidden");
  setMsg("");
}

function showStep(which) {
  stepEmail.classList.toggle("hidden", which !== "email");
  stepCode.classList.toggle("hidden", which !== "code");
  stepForm.classList.toggle("hidden", which !== "form");
  modalTitle.textContent = which === "form" ? "Share a prayer" : "Sign in";
}

function setAnonUI() {
  anonToggle.setAttribute("aria-pressed", anonOn ? "true" : "false");
  anonToggle.querySelector(".toggle-text").textContent = anonOn ? "On" : "Off";
}

async function apiGet(action) {
  const url = `${API_BASE}?action=${encodeURIComponent(action)}`;
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}
async function apiPost(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function tileClass(row) {
  const c = row.tile_color || "active";
  return `tile ${c}`;
}

function renderWall(rows) {
  const q = searchEl.value.trim().toLowerCase();
  let filtered = rows;

  if (q) {
    filtered = rows.filter(r => {
      const hay = [r.public_name, r.title, r.prayer_text, r.location, r.category, r.status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  emptyState.classList.toggle("hidden", filtered.length !== 0);

  const tiles = filtered.map(r => {
    const chips = [
      r.category ? `<span class="chip">${escapeHtml(r.category)}</span>` : "",
      r.location ? `<span class="chip">${escapeHtml(r.location)}</span>` : "",
      r.status ? `<span class="chip">${escapeHtml(r.status)}</span>` : ""
    ].filter(Boolean).join("");

    return `
      <article class="${tileClass(r)}" data-id="${escapeHtml(r.prayer_id)}">
        <div class="tile-title">${escapeHtml(r.title || "Prayer Request")}</div>
        <div class="tile-meta">
          <span>${escapeHtml(r.public_name || "Anonymous")}</span>
          ${chips}
        </div>
        <div class="tile-text">${escapeHtml(r.prayer_text || "")}</div>
      </article>
    `;
  }).join("");

  wall.innerHTML = tiles + tiles;
  wall.classList.add("scrolling");

  if (q) wall.classList.add("paused");
  else wall.classList.remove("paused");
}

async function loadFeed() {
  const data = await apiGet("feed");
  if (!data.ok) return;
  feedRows = data.rows || [];
  renderWall(feedRows);
}

searchEl.addEventListener("input", () => renderWall(feedRows));

cta.addEventListener("click", () => {
  openModal();
  if (token) showStep("form");
  else {
    showStep("email");
    emailEl.value = lastEmail || "";
  }
});

modalClose.addEventListener("click", closeModal);
backdrop.addEventListener("click", closeModal);

anonToggle.addEventListener("click", () => {
  anonOn = !anonOn;
  setAnonUI();
});
setAnonUI();

sendCodeBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  if (!email) return setMsg("Please enter your email.");
  setMsg("Sending code…");
  const resp = await apiPost({ action: "auth_start", email });
  if (!resp.ok) return setMsg(resp.error || "Could not send code.");
  lastEmail = email;
  localStorage.setItem("pw_email", email);
  setMsg("Code sent. Check your email.");
  showStep("code");
});

verifyBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const code = codeEl.value.trim();
  if (!email || !code) return setMsg("Email and code required.");
  setMsg("Verifying…");
  const resp = await apiPost({ action: "auth_verify", email, code });
  if (!resp.ok) return setMsg(resp.error || "Invalid code.");
  token = resp.token;
  localStorage.setItem("pw_token", token);
  setMsg("");
  showStep("form");
});

backToEmailBtn.addEventListener("click", () => {
  codeEl.value = "";
  showStep("email");
  setMsg("");
});

submitPrayerBtn.addEventListener("click", async () => {
  if (!token) return setMsg("Please sign in first.");
  const display_name = displayNameEl.value.trim();
  const location = locationEl.value.trim();
  const category = categoryEl.value.trim();
  const title = titleEl.value.trim();
  const prayer_text = prayerTextEl.value.trim();
  const is_anonymous = anonOn;

  if (!display_name) return setMsg("Display name is required.");
  if (!prayer_text) return setMsg("Prayer request is required.");

  setMsg("Sharing…");
  const resp = await apiPost({
    action: "prayer_create",
    token,
    display_name,
    is_anonymous,
    title,
    prayer_text,
    location,
    category
  });

  if (!resp.ok) return setMsg(resp.error || "Could not share prayer.");

  setMsg("Shared. Thank you.");
  titleEl.value = "";
  prayerTextEl.value = "";

  await loadFeed();
  closeModal();
});

loadFeed();
