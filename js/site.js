(function () {

  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  const chips = document.querySelectorAll(".chip[data-filter]");
  const cards = document.querySelectorAll(".card[data-tags]");
  if (!chips.length || !cards.length) return;

  function setPressed(active) {
    chips.forEach((b) => b.setAttribute("aria-pressed", b === active ? "true" : "false"));
  }

  function applyFilter(tag) {
    cards.forEach((c) => {
      const tags = (c.getAttribute("data-tags") || "").split(/\s+/).filter(Boolean);
      const show = tag === "all" || tags.includes(tag);
      c.style.display = show ? "" : "none";
    });
  }

  chips.forEach((b) => {
    b.addEventListener("click", () => {
      setPressed(b);
      applyFilter(b.getAttribute("data-filter"));
    });
  });

  // Default
  applyFilter("all");
})();