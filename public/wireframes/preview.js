const revealTargets = [
  ".hub-card",
  ".panel",
  ".metric",
  ".event-row",
  ".attendee-block",
  ".scanner-frame"
];

document.documentElement.classList.add("js-ready");

const items = document.querySelectorAll(revealTargets.join(","));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  items.forEach((item) => {
    item.classList.add("reveal-item");
    observer.observe(item);
  });
} else {
  items.forEach((item) => item.classList.add("is-visible"));
}
