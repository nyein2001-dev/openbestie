(() => {
  const config = document.currentScript?.dataset;
  if (!config?.script) return;

  const trackedUrl = new URL(location.href);
  trackedUrl.hash = "";
  for (const [key, value] of [...trackedUrl.searchParams]) {
    if (!/^(utm_[a-z0-9_]{1,30}|ref|source)$/.test(key) || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)) {
      trackedUrl.searchParams.delete(key);
    }
  }

  const plausible =
    window.plausible ??
    ((...args) => {
      plausible.q ||= [];
      plausible.q.push(args);
    });
  window.plausible = plausible;
  plausible.init ||= (options) => {
    plausible.o = options;
  };
  plausible.init({
    transformRequest(payload) {
      payload.u = trackedUrl.href;
      if (typeof payload.r === "string") {
        try {
          payload.r = new URL(payload.r).origin;
        } catch {
          delete payload.r;
        }
      }
      return payload;
    },
  });

  const script = document.createElement("script");
  script.src = config.script;
  script.async = true;
  document.head.append(script);
  if (config.submitted === "yes") window.plausible("feedback_submit");

  let played = false;
  document.addEventListener(
    "playing",
    (event) => {
      if (!played && event.target instanceof HTMLVideoElement) {
        played = true;
        window.plausible("proof_play");
      }
    },
    true,
  );
  document.querySelectorAll("[data-checkout]").forEach((link) => {
    link.addEventListener("click", () => window.plausible("checkout_click"));
    link.addEventListener("auxclick", (event) => {
      if (event.button === 1) window.plausible("checkout_click");
    });
  });
})();
