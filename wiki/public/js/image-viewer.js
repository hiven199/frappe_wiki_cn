(function () {
  const viewer = document.getElementById("image-viewer");
  const stage = document.getElementById("image-viewer-stage");
  const viewerImg = document.getElementById("image-viewer-img");
  const zoomLabel = document.getElementById("image-viewer-zoom");
  const closeButton = document.getElementById("image-viewer-close");
  const toolbar = document.getElementById("image-viewer-toolbar");
  if (!viewer || !stage || !viewerImg || !zoomLabel || !toolbar) return;

  const MIN_SCALE = 0.05;
  const MAX_SCALE = 4;
  const ZOOM_FACTOR = 1.2;
  const FIT_PADDING_X = 64;
  const FIT_PADDING_Y = 96;

  let scale = 1;
  let fitScale = 1;
  let panX = 0;
  let panY = 0;
  let lastFocused = null;
  let active = false;
  let dragging = false;
  let movedWhileDragging = false;
  const pointers = new Map();
  let pinchDistance = 0;

  function isOpen() {
    return active && viewer.classList.contains("active");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function stageRect() {
    return stage.getBoundingClientRect();
  }

  function constrainPan() {
    if (!viewerImg.naturalWidth || !viewerImg.naturalHeight) return;
    const rect = stageRect();
    const scaledWidth = viewerImg.naturalWidth * scale;
    const scaledHeight = viewerImg.naturalHeight * scale;
    const maxX = Math.max(0, (scaledWidth - rect.width) / 2);
    const maxY = Math.max(0, (scaledHeight - rect.height) / 2);
    panX = clamp(panX, -maxX, maxX);
    panY = clamp(panY, -maxY, maxY);
  }

  function renderTransform() {
    constrainPan();
    viewerImg.style.transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    stage.style.cursor = scale > fitScale + 0.001 ? (dragging ? "grabbing" : "grab") : "zoom-in";
  }

  function calculateFitScale() {
    if (!viewerImg.naturalWidth || !viewerImg.naturalHeight) return 1;
    const rect = stageRect();
    const availableWidth = Math.max(1, rect.width - FIT_PADDING_X);
    const availableHeight = Math.max(1, rect.height - FIT_PADDING_Y);
    return Math.min(
      1,
      availableWidth / viewerImg.naturalWidth,
      availableHeight / viewerImg.naturalHeight,
    );
  }

  function fitToScreen() {
    fitScale = clamp(calculateFitScale(), MIN_SCALE, 1);
    scale = fitScale;
    panX = 0;
    panY = 0;
    renderTransform();
  }

  function actualSize() {
    scale = clamp(1, MIN_SCALE, MAX_SCALE);
    panX = 0;
    panY = 0;
    renderTransform();
  }

  function zoomTo(nextScale, clientX, clientY) {
    const oldScale = scale;
    const target = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (Math.abs(target - oldScale) < 0.0001) return;

    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const rect = stageRect();
      const imageCenterX = rect.left + rect.width / 2 + panX;
      const imageCenterY = rect.top + rect.height / 2 + panY;
      const dx = clientX - imageCenterX;
      const dy = clientY - imageCenterY;
      const ratio = target / oldScale;
      panX += dx * (1 - ratio);
      panY += dy * (1 - ratio);
    }

    scale = target;
    if (scale <= fitScale + 0.001) {
      panX = 0;
      panY = 0;
    }
    renderTransform();
  }

  function zoomBy(factor, clientX, clientY) {
    zoomTo(scale * factor, clientX, clientY);
  }

  function resetPointerState() {
    pointers.clear();
    dragging = false;
    movedWhileDragging = false;
    pinchDistance = 0;
    stage.style.cursor = scale > fitScale + 0.001 ? "grab" : "zoom-in";
  }

  function open(sourceImg) {
    lastFocused = document.activeElement;
    active = true;
    viewer.classList.add("active");
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-viewer-open");
    resetPointerState();

    viewerImg.alt = sourceImg.alt || "";
    const source = sourceImg.currentSrc || sourceImg.src;
    if (viewerImg.src !== source) {
      viewerImg.src = source;
    }

    if (viewerImg.complete && viewerImg.naturalWidth) {
      requestAnimationFrame(fitToScreen);
    }
    requestAnimationFrame(() => closeButton?.focus());
  }

  function close() {
    if (!isOpen()) return;
    active = false;
    viewer.classList.remove("active");
    viewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-viewer-open");
    resetPointerState();
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  function attachListeners() {
    document.querySelectorAll("#wiki-content img").forEach((img) => {
      if (img.dataset.viewerBound) return;
      img.dataset.viewerBound = "true";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => open(img));
    });
  }

  function pointerDistance() {
    const values = Array.from(pointers.values());
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  function pointerMidpoint() {
    const values = Array.from(pointers.values());
    if (values.length < 2) return null;
    return {
      x: (values[0].x + values[1].x) / 2,
      y: (values[0].y + values[1].y) / 2,
    };
  }

  viewerImg.addEventListener("load", () => {
    if (isOpen()) fitToScreen();
  });

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-image-viewer-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    switch (button.dataset.imageViewerAction) {
      case "zoom-out":
        zoomBy(1 / ZOOM_FACTOR);
        break;
      case "zoom-in":
        zoomBy(ZOOM_FACTOR);
        break;
      case "actual":
        actualSize();
        break;
      case "fit":
        fitToScreen();
        break;
      case "close":
        close();
        break;
    }
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      if (!isOpen()) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      zoomBy(factor, event.clientX, event.clientY);
    },
    { passive: false },
  );

  stage.addEventListener("dblclick", (event) => {
    if (!isOpen()) return;
    event.preventDefault();
    if (Math.abs(scale - fitScale) < 0.01) {
      zoomTo(1, event.clientX, event.clientY);
    } else {
      fitToScreen();
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!isOpen()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    stage.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedWhileDragging = false;

    if (pointers.size === 1) {
      dragging = scale > fitScale + 0.001;
      stage.style.cursor = dragging ? "grabbing" : "zoom-in";
    } else if (pointers.size === 2) {
      dragging = false;
      pinchDistance = pointerDistance();
    }
  });

  stage.addEventListener("pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const distance = pointerDistance();
      const midpoint = pointerMidpoint();
      if (pinchDistance > 0 && distance > 0 && midpoint) {
        zoomBy(distance / pinchDistance, midpoint.x, midpoint.y);
      }
      pinchDistance = distance;
      movedWhileDragging = true;
      return;
    }

    if (!dragging) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 0) movedWhileDragging = true;
    panX += dx;
    panY += dy;
    renderTransform();
  });

  function releasePointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    stage.releasePointerCapture?.(event.pointerId);
    pinchDistance = pointers.size >= 2 ? pointerDistance() : 0;
    dragging = pointers.size === 1 && scale > fitScale + 0.001;
    if (pointers.size === 0) {
      stage.style.cursor = scale > fitScale + 0.001 ? "grab" : "zoom-in";
    }
  }

  stage.addEventListener("pointerup", releasePointer);
  stage.addEventListener("pointercancel", releasePointer);

  document.addEventListener("keydown", (event) => {
    if (!isOpen()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(ZOOM_FACTOR);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomBy(1 / ZOOM_FACTOR);
    } else if (event.key === "0") {
      event.preventDefault();
      fitToScreen();
    } else if (event.key === "1") {
      event.preventDefault();
      actualSize();
    }
  });

  window.addEventListener("resize", () => {
    if (isOpen()) fitToScreen();
  });

  viewer.addEventListener("transitionend", () => {
    if (!viewer.classList.contains("active")) {
      viewerImg.src = "";
      viewerImg.removeAttribute("style");
      zoomLabel.textContent = "100%";
      scale = 1;
      fitScale = 1;
      panX = 0;
      panY = 0;
    }
  });

  // Wire up images on initial load.
  attachListeners();

  // Re-wire after SPA navigation replaces #wiki-content innerHTML.
  const content = document.getElementById("wiki-content");
  if (content) {
    new MutationObserver(attachListeners).observe(content, {
      childList: true,
      subtree: true,
    });
  }
})();