/* Shared lifecycle for decorative loops and project videos. Sources stay detached
   until visible; distant tiles release their decoder and buffer after 12 seconds. */
(() => {
  const videos = new Map();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const autoAllowed = () => !motion.matches && !connection?.saveData;
  const release = (video, state) => {
    clearTimeout(state.timer);
    state.timer = null;
    video.pause();
    if (video.hasAttribute('src')) {
      video.removeAttribute('src');
      video.load();
    }
  };
  const attach = video => {
    if (!video.hasAttribute('src')) {
      video.src = video.dataset.videoSrc;
      video.load();
    }
  };
  function update(video, state) {
    const visible = state.visible && !document.hidden && video.isConnected;
    if (visible && autoAllowed()) {
      clearTimeout(state.timer);
      state.timer = null;
      attach(video);
      if (video.paused && !state.pending) {
        state.pending = true;
        video.play().catch(() => {
          // Keep the poster and expose native playback when autoplay is denied.
          if (state.visible && !document.hidden) video.controls = true;
        }).finally(() => { state.pending = false; });
      }
    } else {
      video.pause();
      if (!state.timer && video.hasAttribute('src')) {
        state.timer = setTimeout(() => release(video, state), 12000);
      }
    }
    // Project pages remain manually playable with reduced motion or data saver.
    if (video.dataset.manual !== undefined) video.controls = true;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = videos.get(entry.target);
      if (!state) continue;
      state.visible = entry.isIntersecting && entry.intersectionRatio > 0;
      update(entry.target, state);
    }
  }, { threshold: [0, 0.01] });
  function scan() {
    for (const [video, state] of videos) {
      if (!video.isConnected) {
        release(video, state);
        observer.unobserve(video);
        videos.delete(video);
      }
    }
    document.querySelectorAll('video[data-video-src]').forEach(video => {
      if (videos.has(video)) return;
      video.muted = true;
      video.preload = 'none';
      const state = { visible: false, pending: false, timer: null };
      videos.set(video, state);
      if (video.dataset.manual !== undefined) {
        video.controls = true;
        // Attach synchronously on a user gesture so native controls can play.
        const prepare = () => attach(video);
        video.addEventListener('pointerdown', prepare);
        video.addEventListener('keydown', prepare);
      }
      video.addEventListener('error', () => {
        // The poster remains available if a codec or network request fails.
        video.controls = true;
      });
      observer.observe(video);
    });
  }
  function refresh() {
    document.documentElement.classList.toggle('media-paused', document.hidden);
    for (const [video, state] of videos) update(video, state);
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener('change', refresh);
  connection?.addEventListener('change', refresh);
  window.addEventListener('pagehide', () => {
    for (const [video, state] of videos) release(video, state);
  });
  window.addEventListener('pageshow', refresh);
  scan();
  refresh();
})();
