const slides = Array.from(document.querySelectorAll('.slide'));
const previousButton = document.getElementById('prevSlide');
const nextButton = document.getElementById('nextSlide');
const fullscreenButton = document.getElementById('fullscreen');
const fullscreenHint = document.getElementById('fullscreenHint');
const fullscreenHintAction = document.getElementById('fullscreenHintAction');
const fullscreenHintClose = document.getElementById('fullscreenHintClose');
const fullscreenHintStorageKey = 'censopoprua.fullscreen-hint.v1';
const progressBar = document.getElementById('progressBar');
const slideCounter = document.getElementById('slideCounter');
const keyboardHint = document.querySelector('.keyboard-hint');
const navigationFooter = document.querySelector('.presentation-footer');
const presentationCanvas = document.querySelector('.presentation');
const responsiveLayout = window.matchMedia('(max-width: 1100px)');
const timelineMilestones = Array.from(document.querySelectorAll('.slide[data-slide="5"] .timeline-item'));
const coverGallery = document.querySelector('.cover-gallery');
const coverGalleryToggle = document.getElementById('coverGalleryToggle');
const reducedCoverMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
fullscreenButton.hidden = typeof document.documentElement.requestFullscreen !== 'function' || document.fullscreenEnabled === false;

let currentSlide = 0;
let touchStartX = 0;
let touchStartY = 0;
let trackingTouch = false;
let fullscreenHintTimer;

function updateCoverGalleryToggle() {
  const isPaused = coverGallery.classList.contains('is-paused');
  const label = isPaused ? 'Retomar alternância das fotos' : 'Pausar alternância das fotos';
  coverGalleryToggle.hidden = reducedCoverMotion.matches;
  coverGalleryToggle.setAttribute('aria-label', label);
  coverGalleryToggle.setAttribute('title', label);
  coverGalleryToggle.setAttribute('aria-pressed', String(isPaused));
  coverGalleryToggle.innerHTML = `<i data-lucide="${isPaused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

coverGalleryToggle.addEventListener('click', () => {
  coverGallery.classList.toggle('is-paused');
  updateCoverGalleryToggle();
});
coverGalleryToggle.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
});
reducedCoverMotion.addEventListener('change', updateCoverGalleryToggle);
updateCoverGalleryToggle();

function positionFullscreenHint() {
  if (fullscreenHint.hidden) return;
  const button = fullscreenButton.getBoundingClientRect();
  const center = button.left + button.width / 2;
  const width = fullscreenHint.offsetWidth;
  const left = Math.max(12, Math.min(center - width * 0.78, window.innerWidth - width - 12));
  fullscreenHint.style.left = `${left}px`;
  fullscreenHint.style.bottom = `${window.innerHeight - button.top + 14}px`;
  fullscreenHint.style.setProperty('--fullscreen-hint-arrow-x', `${center - left}px`);
}

function hideFullscreenHint() {
  window.clearTimeout(fullscreenHintTimer);
  const restoreFocus = fullscreenHint.contains(document.activeElement);
  fullscreenHint.hidden = true;
  fullscreenButton.classList.remove('fullscreen-discover');
  fullscreenButton.removeAttribute('aria-describedby');
  if (restoreFocus) fullscreenButton.focus({ preventScroll: true });
}

function showFullscreenHint() {
  if (fullscreenButton.hidden || document.fullscreenElement) return;
  try {
    if (window.localStorage.getItem(fullscreenHintStorageKey) === 'seen') return;
  } catch {
    // Storage may be unavailable in private browsing or local file previews.
  }
  fullscreenHint.hidden = false;
  fullscreenButton.classList.add('fullscreen-discover');
  fullscreenButton.setAttribute('aria-describedby', 'fullscreenHintText');
  positionFullscreenHint();
  try {
    window.localStorage.setItem(fullscreenHintStorageKey, 'seen');
  } catch {
    // The hint remains dismissible even when the browser cannot remember it.
  }
}

function fitPresentation() {
  document.documentElement.style.setProperty('--responsive-footer-height', `${Math.ceil(navigationFooter.getBoundingClientRect().height)}px`);
  if (responsiveLayout.matches) {
    document.documentElement.style.setProperty('--deck-scale', '1');
    positionFullscreenHint();
    return;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const slideWidth = Number.parseFloat(rootStyles.getPropertyValue('--slide-w'));
  const slideHeight = Number.parseFloat(rootStyles.getPropertyValue('--slide-h'));
  const safeFooter = Number.parseFloat(rootStyles.getPropertyValue('--slide-footer-safe'));
  const clearance = Number.parseFloat(rootStyles.getPropertyValue('--navigation-clearance'));
  const navigationSpace = navigationFooter.getBoundingClientRect().height + clearance;

  // Preserve the canvas center and reserve enough room below its lowest content.
  const footerScale = Math.max(1, window.innerHeight - 2 * navigationSpace)
    / (slideHeight - 2 * safeFooter);
  const scale = Math.min(window.innerWidth / slideWidth, window.innerHeight / slideHeight, footerScale);
  document.documentElement.style.setProperty('--deck-scale', scale.toFixed(5));
  positionFullscreenHint();
}

function restartAnimations(slide) {
  const isTerritorialSlide = slide.matches('.slide-map[data-slide="6"]');
  const isFieldSlide = slide.matches('.slide[data-slide="7"]');
  const isAnalysisSlide = slide.matches('.slide-analysis[data-slide="8"]');
  const isClosingSlide = slide.matches('.slide-closing[data-slide="9"]');
  if (isTerritorialSlide) slide.classList.remove('map-motion-ready');
  if (isFieldSlide) slide.classList.remove('field-motion-ready');
  if (isAnalysisSlide) slide.classList.remove('analysis-motion-ready');
  if (isClosingSlide) slide.classList.remove('closing-motion-ready');

  slide.querySelectorAll('.reveal').forEach((element) => {
    element.style.animation = 'none';
    void element.offsetWidth;
    element.style.animation = '';
  });

  if (isTerritorialSlide) {
    void slide.offsetWidth;
    slide.classList.add('map-motion-ready');
  }

  if (isFieldSlide) {
    void slide.offsetWidth;
    slide.classList.add('field-motion-ready');
  }

  if (isAnalysisSlide) {
    void slide.offsetWidth;
    slide.classList.add('analysis-motion-ready');
  }

  if (isClosingSlide) {
    void slide.offsetWidth;
    slide.classList.add('closing-motion-ready');
  }
}

function showSlide(index) {
  hideFullscreenHint();
  currentSlide = Math.max(0, Math.min(index, slides.length - 1));
  document.body.classList.toggle('cover-open', currentSlide === 0);
  presentationCanvas.scrollTop = 0;

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === currentSlide;
    slide.classList.toggle('active', isActive);
    slide.setAttribute('aria-hidden', String(!isActive));
    if (isActive) restartAnimations(slide);
  });

  const current = String(currentSlide + 1).padStart(2, '0');
  const total = String(slides.length).padStart(2, '0');
  slideCounter.textContent = `${current} / ${total}`;
  progressBar.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
  previousButton.disabled = currentSlide === 0;
  nextButton.disabled = currentSlide === slides.length - 1;
  window.history.replaceState(null, '', `#${currentSlide + 1}`);
}

function goNext() {
  if (currentSlide < slides.length - 1) showSlide(currentSlide + 1);
}

function goPrevious() {
  if (currentSlide > 0) showSlide(currentSlide - 1);
}

async function toggleFullscreen() {
  if (fullscreenButton.hidden) return;
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

previousButton.addEventListener('click', goPrevious);
nextButton.addEventListener('click', goNext);
fullscreenButton.addEventListener('click', toggleFullscreen);
fullscreenHintAction.addEventListener('click', toggleFullscreen);
fullscreenHintClose.addEventListener('click', hideFullscreenHint);

function activateTimelineMilestone(selectedMilestone) {
  timelineMilestones.forEach((milestone) => {
    const isSelected = milestone === selectedMilestone;
    milestone.classList.toggle('is-active', isSelected);
    if (isSelected) milestone.setAttribute('aria-current', 'step');
    else milestone.removeAttribute('aria-current');
  });
}

timelineMilestones.forEach((milestone, index) => {
  const description = Array.from(milestone.querySelectorAll('h3, p, .timeline-status'))
    .map((element) => element.textContent.trim()).join(' ');
  milestone.setAttribute('aria-label', `Etapa ${index + 1}: ${description} Clique para destacar esta etapa.`);

  milestone.addEventListener('click', () => activateTimelineMilestone(milestone));
  milestone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    activateTimelineMilestone(milestone);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !fullscreenHint.hidden) {
    hideFullscreenHint();
    return;
  }
  if (event.target.closest?.('.fullscreen-hint')) return;
  const nextKeys = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
  const previousKeys = ['ArrowLeft', 'ArrowUp', 'PageUp'];

  if (nextKeys.includes(event.key)) {
    event.preventDefault();
    goNext();
  } else if (previousKeys.includes(event.key)) {
    event.preventDefault();
    goPrevious();
  } else if (event.key === 'Home') {
    event.preventDefault();
    showSlide(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    showSlide(slides.length - 1);
  } else if (event.key.toLowerCase() === 'f') {
    toggleFullscreen();
  }

  keyboardHint.classList.add('hidden');
});

document.addEventListener('touchstart', (event) => {
  trackingTouch = event.touches.length === 1;
  if (!trackingTouch) return;
  touchStartX = event.changedTouches[0].clientX;
  touchStartY = event.changedTouches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (event) => {
  if (!trackingTouch || event.touches.length) return;
  trackingTouch = false;
  const distance = event.changedTouches[0].clientX - touchStartX;
  const verticalDistance = event.changedTouches[0].clientY - touchStartY;
  if (Math.abs(distance) < 60 || Math.abs(distance) < Math.abs(verticalDistance) * 1.35) return;
  if (distance < 0) goNext();
  else goPrevious();
}, { passive: true });

document.addEventListener('touchcancel', () => {
  trackingTouch = false;
}, { passive: true });

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) hideFullscreenHint();
  fullscreenButton.innerHTML = document.fullscreenElement
    ? '<i data-lucide="minimize"></i>'
    : '<i data-lucide="maximize"></i>';
  if (window.lucide) window.lucide.createIcons();
  fitPresentation();
});

window.addEventListener('resize', fitPresentation);
const navigationResizeObserver = new ResizeObserver(fitPresentation);
navigationResizeObserver.observe(navigationFooter);
window.addEventListener('hashchange', () => {
  const requestedSlide = Number.parseInt(window.location.hash.slice(1), 10) - 1;
  if (Number.isInteger(requestedSlide)) showSlide(requestedSlide);
});

window.addEventListener('load', () => {
  fitPresentation();
  if (window.lucide) window.lucide.createIcons();
  const requestedSlide = Number.parseInt(window.location.hash.slice(1), 10) - 1;
  showSlide(Number.isInteger(requestedSlide) ? requestedSlide : 0);
  const coverIntroDelay = currentSlide === 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 3400 : 1000;
  fullscreenHintTimer = window.setTimeout(showFullscreenHint, coverIntroDelay);
  window.setTimeout(() => keyboardHint.classList.add('hidden'), 4500);
});
