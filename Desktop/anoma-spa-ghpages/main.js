// Base path for GH Pages
const BASE = window.__BASE__ || "/anoma-spa-ghpages/";

// --- Tiny client-side router (History API)
const routes = {
  "": {
    title: "Anoma — Головна",
    description: "Демо застосунку Anoma Intent з мультисторінками.",
    html: `
      <section>
        <h1>Ласкаво просимо 👋</h1>
        <p>Це мінімальна SPA-структура, дружня до GitHub Pages: роутинг, темна тема, метадані й PWA.</p>
        <div class="card">
          <h2>Що всередині?</h2>
          <ul>
            <li>Клієнтський роутер з History API</li>
            <li>Адаптивна темна/світла тема</li>
            <li>Динамічні &lt;title&gt; і meta description</li>
            <li>Open Graph / Twitter Cards / JSON-LD</li>
            <li>Service Worker і офлайн-кеш</li>
          </ul>
          <p class="theme-note">Порада: спробуй перемикач теми у правому верхньому куті.</p>
        </div>
      </section>`
  },
  "about": {
    title: "Anoma — Про нас",
    description: "Інформація про проект Anoma Intent App.",
    html: `
      <section>
        <h1>Про нас</h1>
        <p>Ця сторінка демонструє мультисторінковий SPA-підхід на GitHub Pages.</p>
        <div class="card"><p>Змініть контент під свій проект.</p></div>
      </section>`
  },
  "demo": {
    title: "Anoma — Демо",
    description: "Демонстрація можливостей SPA.",
    html: `
      <section>
        <h1>Демо</h1>
        <p>Тут можна показати інтерактив, приклади інтентів тощо.</p>
        <img src="https://picsum.photos/960/360" alt="Демо-зображення" loading="lazy" decoding="async">
      </section>`
  },
  "privacy": {
    title: "Anoma — Політика конфіденційності",
    description: "Приклад сторінки політики конфіденційності.",
    html: `
      <section>
        <h1>Політика конфіденційності</h1>
        <p>Оновіть цей текст згідно ваших вимог.</p>
      </section>`
  }
};

function pathToKey(pathname) {
  let path = pathname.replace(BASE, "");
  if (path.startsWith("/")) path = path.slice(1);
  if (path.endsWith("/")) path = path.slice(0, -1);
  return path || "";
}

function setActiveLink(pathKey) {
  document.querySelectorAll('nav a[data-link]').forEach(a => {
    const key = pathToKey(new URL(a.href).pathname);
    a.removeAttribute("aria-current");
    if (key === pathKey) a.setAttribute("aria-current", "page");
  });
}

function updateMeta({ title, description }) {
  if (title) document.title = title;
  if (description) {
    let m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", description);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogTitle && title) ogTitle.setAttribute("content", title);
  if (ogDesc && description) ogDesc.setAttribute("content", description);
}

function renderRoute() {
  const key = pathToKey(location.pathname);
  const route = routes[key] || routes[""];
  document.getElementById("app").innerHTML = route.html;
  updateMeta(route);
  setActiveLink(key);
  document.getElementById("app").focus();
}

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[data-link]');
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  history.pushState({}, "", url.pathname);
  renderRoute();
});

window.addEventListener("popstate", renderRoute);

// Theme handling
const themeToggle = document.getElementById("themeToggle");
const THEME_KEY = "theme";
const root = document.documentElement;

function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "system";
  root.dataset.theme = saved;
  if (saved === "light") {
    root.classList.add("light");
  } else if (saved === "dark") {
    root.classList.remove("light");
  } else {
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    root.classList.toggle("light", mql.matches);
  }
}

themeToggle?.addEventListener("click", () => {
  const current = localStorage.getItem(THEME_KEY) || "system";
  const next = current === "system" ? "dark" : current === "dark" ? "light" : "system";
  localStorage.setItem(THEME_KEY, next);
  applyTheme();
});

applyTheme();
document.getElementById("year").textContent = new Date().getFullYear();
renderRoute();
