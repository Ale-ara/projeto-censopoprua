const slides = Array.from(document.querySelectorAll('.slide'));
const previousButton = document.getElementById('prevSlide');
const nextButton = document.getElementById('nextSlide');
const fullscreenButton = document.getElementById('fullscreen');
const progressBar = document.getElementById('progressBar');
const slideCounter = document.getElementById('slideCounter');
const keyboardHint = document.querySelector('.keyboard-hint');
const navigationFooter = document.querySelector('.presentation-footer');
const presentationCanvas = document.querySelector('.presentation');
const responsiveLayout = window.matchMedia('(max-width: 1100px)');
const timelineMilestones = Array.from(document.querySelectorAll('.slide[data-slide="5"] .timeline-item'));
fullscreenButton.hidden = typeof document.documentElement.requestFullscreen !== 'function' || document.fullscreenEnabled === false;

let currentSlide = 0;
let touchStartX = 0;
let touchStartY = 0;
let trackingTouch = false;

function fitPresentation() {
  document.documentElement.style.setProperty('--responsive-footer-height', `${Math.ceil(navigationFooter.getBoundingClientRect().height)}px`);
  if (responsiveLayout.matches) {
    document.documentElement.style.setProperty('--deck-scale', '1');
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
  currentSlide = Math.max(0, Math.min(index, slides.length - 1));
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

function activateTimelineMilestone(selectedMilestone) {
  timelineMilestones.forEach((milestone) => {
    const isSelected = milestone === selectedMilestone;
    milestone.classList.toggle('is-active', isSelected);
    if (isSelected) milestone.setAttribute('aria-current', 'step');
    else milestone.removeAttribute('aria-current');
  });
}

timelineMilestones.forEach((milestone) => {
  const date = milestone.querySelector('.timeline-date')?.textContent?.trim() || '';
  const title = milestone.querySelector('h3')?.textContent?.trim() || '';
  milestone.setAttribute('aria-label', `${date}: ${title}. Clique para destacar esta etapa.`);

  milestone.addEventListener('click', () => activateTimelineMilestone(milestone));
  milestone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    activateTimelineMilestone(milestone);
  });
});

document.addEventListener('keydown', (event) => {
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
  window.setTimeout(() => keyboardHint.classList.add('hidden'), 4500);
});
