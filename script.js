function calculateTotalWidth() {
  const imagesWidth = DOM.imageWrappers.reduce((total, wrapper) => total + wrapper.offsetWidth, 0);
  return imagesWidth + window.innerWidth;
}

const CONFIG = {
  scrollSensitivity: 30,
  animationDuration: 0.5,
  flipAnimationDuration: 0.8,
  maxPercentage: 100,
  totalWidth: 0,
};

const State = {
  mouseDownAt: 0,
  prevPercentage: 0,
  currentPercentage: 0,
  isDragging: false,
  isAnimating: false,
  currentLayout: 'layout-1',
};

const DOM = {
  track: document.querySelector('#big-track'),
  imageWrappers: Array.from(document.querySelectorAll(".img-wrapper")),
  images: null,
};

const lenis = new Lenis();

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

gsap.registerPlugin(Flip);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const TrackController = {
  updatePosition(percentage) {
    const maxTranslate = CONFIG.totalWidth - window.innerWidth;
    const translateX = (percentage / 100) * maxTranslate;
  
    DOM.imageWrappers.forEach(wrapper => {
      gsap.to(wrapper, {
        duration: CONFIG.animationDuration,
        x: translateX,
        ease: "power2.out"
      });
  
      const image = wrapper.querySelector('img');
      const imagePosition = 50 - (translateX / maxTranslate) * 50;
  
      gsap.to(image, {
        duration: CONFIG.animationDuration,
        objectPosition: `${imagePosition}% center`,
        ease: "power2.out"
      });
    });
  },

  handleDragStart(e) {
    State.mouseDownAt = e.clientX || e.touches[0].clientX;
    State.isDragging = false;
  },

  handleDragEnd() {
    State.mouseDownAt = 0;
    State.prevPercentage = State.currentPercentage;
    State.isDragging = false;
  },

  handleDragMove(e) {
    if (State.mouseDownAt === 0 || State.currentLayout !== 'layout-1') return;
  
    const mouseDelta = parseFloat(State.mouseDownAt) - (e.clientX || e.touches[0].clientX);
    const maxDelta = CONFIG.totalWidth - window.innerWidth;
    
    if (Math.abs(mouseDelta) > 5) {
      State.isDragging = true;
    }
  
    const percentage = (mouseDelta / maxDelta) * -100;
    const nextPercentageUnconstrained = State.prevPercentage + percentage;
    State.currentPercentage = clamp(nextPercentageUnconstrained, -100, 0);
  
    this.updatePosition(State.currentPercentage);
  },
  
  handleScroll(e) {
    if (State.currentLayout !== 'layout-1') return;
    const delta = e.deltaY;
    const maxDelta = CONFIG.totalWidth - window.innerWidth;
    const percentage = (delta / maxDelta) * -CONFIG.scrollSensitivity;
    const nextPercentageUnconstrained = State.currentPercentage + percentage;
    State.currentPercentage = clamp(nextPercentageUnconstrained, -100, 0);
  
    this.updatePosition(State.currentPercentage);
  },

  handleLayoutNavigation(e) {
    const layout0Wrapper = e.target.closest('.img-wrapper.layout-0');
  
    if (!layout0Wrapper) return;
  
    const clickX = e.clientX;
    const screenWidth = window.innerWidth;
    const isRightHalf = clickX > screenWidth / 2;
  
    const allWrappers = Array.from(document.querySelectorAll('.track-wrapper .img-wrapper'));
    const currentIndex = allWrappers.indexOf(layout0Wrapper);
    let nextIndex;
  
    if (isRightHalf) {
      nextIndex = (currentIndex + 1) % allWrappers.length;
    } else {
      nextIndex = (currentIndex - 1 + allWrappers.length) % allWrappers.length;
    }
  
    const state = Flip.getState(allWrappers, {props: "class"});

    allWrappers.forEach((wrapper, index) => {
      if (index === nextIndex) {
        wrapper.classList.remove('layout-2');
        wrapper.classList.add('layout-0');
      } else {
        wrapper.classList.remove('layout-0');
        wrapper.classList.add('layout-2');
      }
    });
  
    Flip.from(state, {
      duration: CONFIG.flipAnimationDuration,
      ease: "power2.out",
      simple: true
    });
  },

  toggleLayout(e) {
    const clickedWrapper = e.currentTarget;
    if (clickedWrapper.classList.contains('img-wrapper')) {
      const state = Flip.getState(DOM.imageWrappers, {props: "class"});
      clickedWrapper.classList.remove("layout-1", "layout-2");
      clickedWrapper.classList.add("layout-0");
  
      DOM.imageWrappers.forEach(wrapper => {
        if (wrapper !== clickedWrapper) {
          wrapper.classList.remove("layout-0", "layout-1");
          wrapper.classList.add("layout-2");
        }
      });
  
      DOM.imageWrappers.forEach(wrapper => {
        gsap.set(wrapper, { x: 0 });
      });
  
      Flip.from(state, {
        duration: CONFIG.flipAnimationDuration,
        ease: "power2.out",
        targets: clickedWrapper,
        simple: true
      });
  
      const layout2Wrappers = DOM.imageWrappers.filter(wrapper => wrapper.classList.contains('layout-2'));
      Flip.from(state, {
        duration: CONFIG.flipAnimationDuration,
        ease: "power2.out",
        targets: layout2Wrappers,
        stagger: {
          each: 0.03,
          from: "start",
          axis: "x"
        },
        simple: true
      });
  
      State.currentLayout = 'layout-0';
    }
  },  
}  

function handleResize() {
  CONFIG.totalWidth = calculateTotalWidth();
  TrackController.updatePosition(State.currentPercentage);
}

function bindEvents() {
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousedown', TrackController.handleDragStart.bind(TrackController));
  window.addEventListener('touchstart', TrackController.handleDragStart.bind(TrackController), { passive: false });
  window.addEventListener('mouseup', TrackController.handleDragEnd.bind(TrackController));
  window.addEventListener('touchend', TrackController.handleDragEnd.bind(TrackController));
  window.addEventListener('mousemove', TrackController.handleDragMove.bind(TrackController));
  window.addEventListener('touchmove', TrackController.handleDragMove.bind(TrackController), { passive: false });
  window.addEventListener('wheel', TrackController.handleScroll.bind(TrackController), { passive: false });
  DOM.imageWrappers.forEach(wrapper => {
    wrapper.addEventListener("click", TrackController.toggleLayout.bind(TrackController));
  });
  document.body.addEventListener('click', (e) => {
    if (DOM.imageWrappers.some(wrapper => wrapper.classList.contains('layout-0'))) {
      TrackController.handleLayoutNavigation(e);
    }
  });
}

function init() {
  DOM.imageWrappers.forEach(wrapper => {
    wrapper.classList.remove('layout-0', 'layout-2');
  });
  handleResize();
  bindEvents();
  requestAnimationFrame(raf);
}

document.addEventListener('DOMContentLoaded', init);
init();