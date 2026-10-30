(() => {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const runningAnimations = new Set();

  // Native anchors and disclosures keep working if JavaScript is unavailable.
  function animate(element, frames, options) {
    if (motionPreference.matches || typeof element.animate !== 'function') return;
    const animation = element.animate(frames, options);
    runningAnimations.add(animation);
    const forget = () => runningAnimations.delete(animation);
    animation.addEventListener('finish', forget, { once: true });
    animation.addEventListener('cancel', forget, { once: true });
    return animation;
  }

  // One disclosure controller serves every stage, toolkit and education card.
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const sceneStates = new Map();

  function settleScene(scene) {
    const state = sceneStates.get(scene);
    if (!state) return;
    state.animation?.cancel();
    state.animation = null;
    scene.open = state.wantOpen;
    scene.dataset.state = state.wantOpen ? 'open' : 'closed';
    delete scene.dataset.transitioning;
    state.panel.style.removeProperty('height');
    state.panel.inert = !state.wantOpen;
    state.panel.setAttribute('aria-hidden', String(!state.wantOpen));
    state.summary.setAttribute('aria-expanded', String(state.wantOpen));
    if (state.returnFocus) {
      state.returnFocus = false;
      const bounds = state.summary.getBoundingClientRect();
      const headerHeight = document.querySelector('.header').offsetHeight;
      if (bounds.top < headerHeight || bounds.bottom > window.innerHeight) {
        state.summary.scrollIntoView({ block: 'nearest', behavior: motionPreference.matches ? 'instant' : 'smooth' });
      }
    }
  }

  function activateScene(scene, wantOpen, returnFocus = false) {
    const state = sceneStates.get(scene);
    const currentHeight = scene.open ? state.panel.getBoundingClientRect().height : 0;
    const currentOpacity = scene.open ? Number(getComputedStyle(state.panel).opacity) : 0;
    state.animation?.cancel();
    state.animation = null;
    state.wantOpen = wantOpen;
    state.returnFocus = returnFocus;
    if (!wantOpen && (returnFocus || state.panel.contains(document.activeElement))) {
      state.summary.focus({ preventScroll: true });
    }
    state.panel.inert = !wantOpen;
    state.panel.setAttribute('aria-hidden', String(!wantOpen));
    state.summary.setAttribute('aria-expanded', String(wantOpen));
    if (motionPreference.matches || typeof state.panel.animate !== 'function' || scene.hidden) {
      settleScene(scene);
      return;
    }
    // Keep native details open until the closing transition actually finishes.
    scene.open = true;
    scene.dataset.state = wantOpen ? 'opening' : 'closing';
    scene.dataset.transitioning = '';
    state.panel.style.height = `${currentHeight}px`;
    const targetHeight = wantOpen ? state.content.getBoundingClientRect().height : 0;
    const animation = animate(state.panel, [
      { height: `${currentHeight}px`, opacity: currentOpacity },
      { height: `${targetHeight}px`, opacity: wantOpen ? 1 : 0 }
    ], { duration: wantOpen ? 340 : 280, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
    state.animation = animation;
    animation.addEventListener('finish', () => {
      if (state.animation === animation) settleScene(scene);
    }, { once: true });
  }

  scenes.forEach((scene, index) => {
    const summary = scene.querySelector(':scope > summary');
    const panel = scene.querySelector(':scope > .scene-panel');
    panel.id = `scene-panel-${index + 1}`;
    summary.setAttribute('aria-controls', panel.id);
    sceneStates.set(scene, { summary, panel, content: panel.querySelector('.scene-content'), wantOpen: scene.open, animation: null, returnFocus: false });
    scene.dataset.enhanced = '';
    settleScene(scene);
    summary.addEventListener('click', event => {
      event.preventDefault();
      activateScene(scene, !sceneStates.get(scene).wantOpen);
    });
    scene.querySelector('.scene-return').addEventListener('click', () => activateScene(scene, false, true));
    scene.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !sceneStates.get(scene).wantOpen) return;
      event.preventDefault();
      event.stopPropagation();
      activateScene(scene, false, true);
    });
    // Also honor native toggles, for example a browser's find-in-page action.
    scene.addEventListener('toggle', () => {
      const state = sceneStates.get(scene);
      if (!state.animation && scene.open !== state.wantOpen) {
        state.wantOpen = scene.open;
        settleScene(scene);
      }
    });
  });
  window.addEventListener('resize', () => {
    scenes.forEach(scene => {
      if (sceneStates.get(scene).animation) settleScene(scene);
    });
  }, { passive: true });

  // Only the nearest visible card is lit. Reads precede writes in one frame.
  let nearbyScene = null;
  let proximityFrame = 0;
  const visibleScenes = new Set(scenes);
  if ('IntersectionObserver' in window) {
    visibleScenes.clear();
    const proximityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleScenes.add(entry.target);
        else visibleScenes.delete(entry.target);
      });
    }, { rootMargin: '88px' });
    scenes.forEach(scene => proximityObserver.observe(scene));
  }
  function resetProximity() {
    window.cancelAnimationFrame(proximityFrame);
    proximityFrame = 0;
    if (!nearbyScene) return;
    delete nearbyScene.dataset.near;
    ['--proximity', '--light-x', '--light-y'].forEach(property => nearbyScene.style.removeProperty(property));
    nearbyScene = null;
  }
  document.addEventListener('pointermove', event => {
    if (motionPreference.matches || !finePointer.matches || event.pointerType === 'touch' || proximityFrame) return;
    proximityFrame = window.requestAnimationFrame(() => {
      proximityFrame = 0;
      let candidate = null;
      let nearest = 88;
      let bounds;
      visibleScenes.forEach(scene => {
        if (scene.hidden) return;
        const rect = scene.getBoundingClientRect();
        const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        const distance = Math.hypot(dx, dy);
        if (distance < nearest) { nearest = distance; candidate = scene; bounds = rect; }
      });
      if (candidate !== nearbyScene) resetProximity();
      if (!candidate) return;
      nearbyScene = candidate;
      candidate.dataset.near = '';
      candidate.style.setProperty('--proximity', (1 - nearest / 88).toFixed(3));
      candidate.style.setProperty('--light-x', `${Math.round(event.clientX - bounds.left)}px`);
      candidate.style.setProperty('--light-y', `${Math.round(event.clientY - bounds.top)}px`);
    });
  }, { passive: true });
  document.addEventListener('pointerleave', resetProximity);
  window.addEventListener('scroll', resetProximity, { passive: true });
  window.addEventListener('blur', resetProximity);

  const filters = [...document.querySelectorAll('[data-filter]')];
  const jobs = [...document.querySelectorAll('.job')];
  const resultCount = document.querySelector('.result-count');
  const filterStatus = document.querySelector('#filter-status');

  filters.forEach(button => {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      filters.forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      let count = 0;
      jobs.forEach(job => {
        job.hidden = button.dataset.filter !== 'all' && job.dataset.category !== button.dataset.filter;
        if (job.hidden) settleScene(job);
        if (!job.hidden) count += 1;
      });
      const label = count === 1 ? 'experiencia' : 'experiencias';
      resultCount.textContent = `${String(count).padStart(2, '0')} ${label.toUpperCase()}`;
      filterStatus.textContent = `${count} ${label} ${count === 1 ? 'visible' : 'visibles'}.`;
      animate(document.querySelector('.jobs'), [{ opacity: .5 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    });
  });

  // Animate once on entry. There is no hidden-content class or scroll loop.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animate(entry.target, [
          { opacity: .35, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' });
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
  }

  const header = document.querySelector('.header');
  const progress = document.querySelector('.reading-progress');
  const navLinks = [...document.querySelectorAll('nav a')];
  const navSections = navLinks.map(link => document.querySelector(link.hash));
  let scrollFrame = 0;

  function updateNavigation() {
    scrollFrame = 0;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const readingPoint = header.offsetHeight + Math.min(window.innerHeight * .22, 200);
    let currentIndex = -1;
    navSections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= readingPoint) currentIndex = index;
    });
    if (maxScroll > 0 && scrollY >= maxScroll - 4) currentIndex = navLinks.length - 1;
    const scrolled = String(scrollY > 16);
    if (header.dataset.scrolled !== scrolled) header.dataset.scrolled = scrolled;
    progress.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0})`;
    navLinks.forEach((link, index) => {
      if (index === currentIndex && !link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'location');
      else if (index !== currentIndex && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    });
  }

  function scheduleNavigation() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateNavigation);
  }
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', scheduleNavigation, { passive: true });
  window.addEventListener('load', scheduleNavigation, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleNavigation).observe(document.body);
  updateNavigation();

  // Small pointer-driven depth, only on devices that support precise hovering.
  const sculpture = document.querySelector('.sculpture');
  let pointerFrame = 0;
  function resetSculpture() {
    window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    sculpture.style.removeProperty('--tilt-x');
    sculpture.style.removeProperty('--tilt-y');
  }
  sculpture.addEventListener('pointermove', event => {
    if (motionPreference.matches || !finePointer.matches || pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      const bounds = sculpture.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      sculpture.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
      sculpture.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
    });
  });
  sculpture.addEventListener('pointerleave', resetSculpture);
  window.addEventListener('blur', resetSculpture);
  motionPreference.addEventListener('change', () => {
    resetSculpture();
    if (motionPreference.matches) {
      resetProximity();
      scenes.forEach(settleScene);
      runningAnimations.forEach(animation => animation.cancel());
    }
  });
  finePointer.addEventListener('change', () => { resetSculpture(); resetProximity(); });
})();
