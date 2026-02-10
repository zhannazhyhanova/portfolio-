const MAX_ITEMS = 50;
const ASSETS_DIR = "assets/";
const EXTENSIONS = ["png", "webp", "jpeg", "jpg"];

const SECTIONS = [
    { rootId: "gridNft", prefix: "nft-", titlePrefix: "NFT", defaultType: "Artwork" },
    { rootId: "gridMobile", prefix: "mob-", titlePrefix: "Mobile", defaultType: "Artwork" },
    { rootId: "gridPersonal", prefix: "per-", titlePrefix: "Personal", defaultType: "Artwork" },
];

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function makePlaceholderSvg(title = "Artwork") {
    const safe = escapeHtml(title);
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#0b0f14"/>
          <stop offset="1" stop-color="#111824"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="750" fill="url(#g)"/>
      <rect x="60" y="60" width="1080" height="630" rx="36"
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" stroke-width="3"/>
      <g fill="rgba(255,255,255,0.55)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace">
        <text x="110" y="170" font-size="34">Image not found</text>
        <text x="110" y="225" font-size="22" fill="rgba(255,255,255,0.38)">${safe}</text>
      </g>
    </svg>
  `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function findExistingImageUrl(baseName) {
    const candidates = EXTENSIONS.map((ext) => `${ASSETS_DIR}${baseName}.${ext}`);

    return new Promise((resolve) => {
        let i = 0;

        const tryNext = () => {
            if (i >= candidates.length) return resolve(null);

            const url = candidates[i++];
            const img = new Image();

            img.onload = () => resolve(url);
            img.onerror = () => tryNext();

            img.src = `${url}?v=${Date.now()}`;
        };

        tryNext();
    });
}

function itemHtml({ title, type, imgUrl }) {
    const cleanUrl = imgUrl.split("?")[0];

    return `
    <button class="item" type="button"
      data-title="${escapeHtml(title)}"
      data-type="${escapeHtml(type)}"
      data-img="${encodeURI(cleanUrl)}">
      <div class="item__media">
        <img class="item__img"
          src="${cleanUrl}"
          alt="${escapeHtml(title)}"
          loading="lazy"
          data-fallback="${makePlaceholderSvg(title)}">
      </div>
      <div class="item__body">
        <div class="item__title">${escapeHtml(title)}</div>
        <div class="item__meta">${escapeHtml(type)}</div>
      </div>
    </button>
  `;
}

async function buildSection(section) {
    const root = document.getElementById(section.rootId);
    if (!root) return;

    const found = [];

    for (let idx = 1; idx <= MAX_ITEMS; idx++) {
        const baseName = `${section.prefix}${idx}`;
        // eslint-disable-next-line no-await-in-loop
        const url = await findExistingImageUrl(baseName);
        if (!url) continue;

        found.push({
            title: `${section.titlePrefix} #${idx}`,
            type: section.defaultType,
            imgUrl: url,
        });
    }

    root.innerHTML = found.map(itemHtml).join("");
}

document.addEventListener(
    "error",
    (e) => {
        const img = e.target;
        if (!(img instanceof HTMLImageElement)) return;
        if (!img.classList.contains("item__img")) return;

        const fallback = img.getAttribute("data-fallback");
        if (!fallback) return;

        img.onerror = null;
        img.src = fallback;
    },
    true
);

// Modal
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const modalImg = document.getElementById("modalImg");

function openModal({ title, type, img }) {
    modalTitle.textContent = title;
    modalMeta.textContent = type;

    modalImg.src = img;
    modalImg.alt = title;

    modalImg.onerror = () => {
        modalImg.onerror = null;
        modalImg.src = makePlaceholderSvg(title);
    };

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    setTimeout(() => {
        modalImg.src = "";
        modalImg.alt = "";
    }, 120);
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".item");
    if (!btn) return;

    openModal({
        title: btn.dataset.title || "Artwork",
        type: btn.dataset.type || "",
        img: btn.dataset.img ? decodeURI(btn.dataset.img) : "",
    });
});

modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

// Mobile menu
const burgerBtn = document.getElementById("burgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

burgerBtn.addEventListener("click", () => {
    const isOpen = !mobileMenu.hasAttribute("hidden");
    if (isOpen) mobileMenu.setAttribute("hidden", "");
    else mobileMenu.removeAttribute("hidden");
});

mobileMenu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") mobileMenu.setAttribute("hidden", "");
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 640) mobileMenu.setAttribute("hidden", "");
});

// Init
(async function init() {
    for (const sec of SECTIONS) {
        // eslint-disable-next-line no-await-in-loop
        await buildSection(sec);
    }
})();
