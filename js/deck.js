/* The slide engine. Two decks use it and nothing else does.

   Slides are authored as <section class="slide"> in the deck's own HTML, because
   the content is the point and a deck whose slides live in a JavaScript array is
   a deck nobody will edit ten minutes before a lesson.

   The stage is a fixed 1280x720 box scaled to fit whatever it is projected onto.
   That is the only way to know what the type will look like from the back of a
   hall: a slide laid out in viewport units is a different slide on every machine,
   and this one has to be legible on a projector nobody has measured. */

const STAGE_W = 1280;
const STAGE_H = 720;

export function mountDeck(root, { onSlide = null } = {}) {
  const slides = [...root.querySelectorAll('.slide')];
  if (slides.length === 0) throw new Error('a deck needs at least one slide');

  slides.forEach((slide, i) => {
    slide.id = slide.id || `slide-${i + 1}`;
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Slide ${i + 1} of ${slides.length}`);
  });

  /* Steps are the reveals inside a slide. A deck that cannot hold something back
     cannot make a point land, and both of these decks are built round a reveal. */
  const stepsOf = (slide) => [...slide.querySelectorAll('[data-step]')]
    .sort((a, b) => Number(a.dataset.step) - Number(b.dataset.step));

  let index = 0;
  let step = 0;
  let blanked = false;

  const counter = root.querySelector('[data-deck-counter]');
  const stage = root.querySelector('.stage');

  function paint() {
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    const current = slides[index];
    stepsOf(current).forEach((node, i) => {
      node.classList.toggle('shown', i < step);
    });
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    root.classList.toggle('blanked', blanked);
    /* The hash keeps a place across a reload, which matters when a projector
       drops out mid-lesson and nobody wants to press right arrow forty times. */
    if (window.location.hash !== `#${current.id}`) {
      window.history.replaceState(null, '', `#${current.id}`);
    }
    onSlide?.({ index, slide: current, total: slides.length });
  }

  function go(to, { atEnd = false } = {}) {
    index = Math.max(0, Math.min(slides.length - 1, to));
    step = atEnd ? stepsOf(slides[index]).length : 0;
    paint();
  }

  function next() {
    const total = stepsOf(slides[index]).length;
    if (step < total) { step += 1; paint(); return; }
    if (index < slides.length - 1) go(index + 1);
  }

  function back() {
    if (step > 0) { step -= 1; paint(); return; }
    if (index > 0) go(index - 1, { atEnd: true });
  }

  /* The stage is scaled rather than reflowed, so what is checked on one screen is
     what appears on another. */
  function fit() {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.transform = `scale(${scale})`;
    root.style.setProperty('--stage-scale', String(scale));
  }

  window.addEventListener('resize', fit);
  fit();

  document.addEventListener('keydown', (event) => {
    /* `matches` is optional here because the target is not always an element.
       A keydown with focus on the document itself lands with target === document,
       which has no matches(), and the thrown TypeError takes the whole deck's
       keyboard with it - arrows, blank and all - in front of a room. */
    if (event.target?.matches?.('input, textarea')) return;
    switch (event.key) {
      case 'ArrowRight': case 'PageDown': case ' ': next(); break;
      case 'ArrowLeft': case 'PageUp': back(); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1, { atEnd: true }); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else root.requestFullscreen?.();
        break;
      /* Blank the screen. Every presenter wants this and no deck ever has it. */
      case 'b': case 'B': case '.': blanked = !blanked; paint(); break;
      case 'Escape': if (blanked) { blanked = false; paint(); } else return; break;
      default: return;
    }
    event.preventDefault();
  });

  for (const button of root.querySelectorAll('[data-deck-next]')) {
    button.addEventListener('click', next);
  }
  for (const button of root.querySelectorAll('[data-deck-back]')) {
    button.addEventListener('click', back);
  }

  const fromHash = slides.findIndex((s) => `#${s.id}` === window.location.hash);
  go(fromHash === -1 ? 0 : fromHash);

  return { next, back, go, slides };
}
