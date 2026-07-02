// ===== Celestial background shader (muted olive, non-distracting) =====
(function initCelestialBg() {
  const mount = document.getElementById("cb-bg");
  if (!mount || typeof THREE === "undefined") return;

  const scene    = new THREE.Scene();
  const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // powerPreference hint lets the browser pick integrated GPU on dual-GPU machines
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" });
  // Cap at 1× — nebula is blurry by nature, high DPI wastes fill-rate
  renderer.setPixelRatio(1);
  mount.appendChild(renderer.domElement);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Muted olive-green nebula — same hue family as #3e5230, very dark
  const fragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform vec2  u_resolution;
    uniform float u_time;
    uniform vec2  u_mouse;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }
    float fbm(vec2 st) {
      float v = 0.0; float a = 0.5;
      for (int i = 0; i < 3; i++) { v += a * noise(st); st *= 2.0; a *= 0.5; }
      return v;
    }
    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.y, u_resolution.x);
      uv *= 1.4;

      // Very subtle mouse warp
      vec2 m = (u_mouse / u_resolution - 0.5) * 0.12;
      uv += m;

      float f = fbm(uv + vec2(u_time * 0.06, u_time * 0.03));
      float t = fbm(uv + f * 0.5 + vec2(u_time * 0.03, u_time * 0.015));
      float nebula = pow(t, 1.8);

      vec3 base  = hsl2rgb(vec3(0.278, 0.30, 0.06));
      vec3 glow  = hsl2rgb(vec3(0.292, 0.45, 0.38));
      vec3 color = mix(base, glow, nebula);

      // Sparse dim stars
      float sv = random(vUv * 900.0);
      if (sv > 0.9982) {
        color += vec3((sv - 0.9982) / 0.0018 * 0.55);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_time:       { value: 0.0 },
      u_resolution: { value: new THREE.Vector2() },
      u_mouse:      { value: new THREE.Vector2() },
    },
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    renderer.setSize(w, h);
    material.uniforms.u_resolution.value.set(w, h);
  }

  // Expose stop so exitToSite can kill the loop after the intro ends
  // Start mid-cycle so the nebula opens on a bright, cloudy frame
  material.uniforms.u_time.value = 4.2;

  let raf;
  let stopped = false;
  const TARGET_FPS = 20;
  const FRAME_MS   = 1000 / TARGET_FPS;
  let lastFrameTime = 0;

  function animate(now) {
    if (stopped) return;
    raf = requestAnimationFrame(animate);
    if (now - lastFrameTime < FRAME_MS) return;
    lastFrameTime = now;
    material.uniforms.u_time.value += 0.012;
    renderer.render(scene, camera);
  }

  window.addEventListener("mousemove", (e) => {
    const r = mount.getBoundingClientRect();
    material.uniforms.u_mouse.value.set(
      e.clientX - r.left,
      mount.clientHeight - (e.clientY - r.top)
    );
  }, { passive: true });

  window.addEventListener("resize", resize);
  resize();
  raf = requestAnimationFrame(animate);

})();

// Mobile nav toggle
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

// ===== Find a Box panel toggle =====
const findBoxBtn = document.getElementById("find-box-btn");
const findBoxPanel = document.getElementById("find-box-panel");
if (findBoxBtn && findBoxPanel) {
  findBoxBtn.addEventListener("click", () => {
    const isOpen = !findBoxPanel.hidden;
    if (isOpen) {
      findBoxPanel.hidden = true;
      findBoxBtn.textContent = "Find a Box";
    } else {
      findBoxPanel.hidden = false;
      findBoxBtn.textContent = "Hide Map";
      findBoxPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
}

// ===== Volunteer modal =====
const volunteerBtn  = document.getElementById("volunteer-btn");
const volunteerModal = document.getElementById("volunteer-modal");
const modalClose    = document.getElementById("modal-close");
const volunteerForm = document.getElementById("volunteer-form");

function openModal() {
  volunteerModal.hidden = false;
  document.body.style.overflow = "hidden";
  modalClose.focus();
}
function closeModal() {
  volunteerModal.hidden = true;
  document.body.style.overflow = "";
}

if (volunteerBtn)  volunteerBtn.addEventListener("click", openModal);
if (modalClose)    modalClose.addEventListener("click", closeModal);
if (volunteerModal) {
  volunteerModal.addEventListener("click", (e) => {
    if (e.target === volunteerModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !volunteerModal.hidden) closeModal();
  });
}

if (volunteerForm) {
  volunteerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name    = document.getElementById("v-name").value.trim();
    const email   = document.getElementById("v-email").value.trim();
    const message = document.getElementById("v-message").value.trim();
    const subject = encodeURIComponent("Volunteer Interest — " + name);
    const body    = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\n\n" + (message || "(no message)")
    );
    window.location.href = "mailto:admin@secondspine.org?subject=" + subject + "&body=" + body;
    closeModal();
  });
}

// ===== Partnership / Contact modal =====
const contactBtn   = document.getElementById("contact-btn");
const contactModal = document.getElementById("contact-modal");
const contactClose = document.getElementById("contact-modal-close");
const contactForm  = document.getElementById("contact-form");

function openContactModal() {
  contactModal.hidden = false;
  document.body.style.overflow = "hidden";
  contactClose.focus();
}
function closeContactModal() {
  contactModal.hidden = true;
  document.body.style.overflow = "";
}

if (contactBtn)   contactBtn.addEventListener("click", openContactModal);
if (contactClose) contactClose.addEventListener("click", closeContactModal);
if (contactModal) {
  contactModal.addEventListener("click", (e) => {
    if (e.target === contactModal) closeContactModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !contactModal.hidden) closeContactModal();
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name    = document.getElementById("c-name").value.trim();
    const org     = document.getElementById("c-org").value.trim();
    const email   = document.getElementById("c-email").value.trim();
    const message = document.getElementById("c-message").value.trim();
    const subject = encodeURIComponent("Partnership Inquiry — " + (org || name));
    const body    = encodeURIComponent(
      "Name: " + name +
      (org ? "\nOrganization: " + org : "") +
      "\nEmail: " + email +
      "\n\n" + (message || "(no message)")
    );
    window.open("mailto:admin@secondspine.org?subject=" + subject + "&body=" + body);
    closeContactModal();
  });
}

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Count-up stats when scrolled into view
const nums = document.querySelectorAll(".stat-num");
const animateStat = (el) => {
  const target = parseFloat(el.dataset.target) || 0;
  const suffix = el.dataset.suffix || "";
  const prefix = el.dataset.prefix || "";
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = Math.round(target * eased);
    el.textContent = prefix + value.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

if ("IntersectionObserver" in window) {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStat(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  nums.forEach((n) => obs.observe(n));
} else {
  nums.forEach((n) => animateStat(n));
}

// ===== Hero intro sequence: button on cover → book opens =====
// ===== Particle transition: scribble lines disintegrate → site reveals =====

(function initHeroSequence() {
  const hero      = document.getElementById("hero-section");
  const btn       = document.getElementById("get-started-btn");
  const bookLayer = document.getElementById("book-layer");

  if (!hero || !btn || !bookLayer) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let triggered = false;

  // Track cursor for hover-zoom origin
  let cursorX = null;
  let cursorY = null;
  bookLayer.addEventListener("mousemove", (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  });

  btn.addEventListener("click", () => {
    if (triggered) return;
    triggered = true;
    btn.disabled = true;

    if (prefersReduced) {
      const siteLayerA = document.getElementById("hero-site-layer");
      if (siteLayerA) {
        siteLayerA.classList.add("visible");
        siteLayerA.removeAttribute("aria-hidden");
      }
      setTimeout(() => document.body.classList.remove("intro-mode"), 650);
      return;
    }

    // Book is already visible — go straight to opening
    fadeInBook();
  });

  function fadeInBook() {
    const wrapper = document.getElementById("cb-wrapper");
    const cover   = document.getElementById("cb-cover");

    // Short pause so the button click feels intentional, then open
    setTimeout(() => {
      if (wrapper) wrapper.classList.add("cb-is-opening");
      if (cover)   cover.classList.add("cb-is-opening");

      const onDone = () => exitToSite();
      const zoomTrigger = document.querySelector(".cb-fp--8");
      if (zoomTrigger) {
        zoomTrigger.addEventListener("animationend", onDone, { once: true });
      } else if (cover) {
        cover.addEventListener("animationend", onDone, { once: true });
      } else {
        setTimeout(onDone, 5600);
      }
    }, 300);
  }

  function exitToSite() {
    const siteLayer = document.getElementById("hero-site-layer");
    const book      = document.querySelector(".cb-book");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (book && !reducedMotion) {
      const rect    = book.getBoundingClientRect();
      const originX = rect.left + rect.width  * 0.5;
      const originY = rect.top  + rect.height * 0.25;
      bookLayer.style.transformOrigin = `${originX}px ${originY}px`;
      bookLayer.classList.add("cb-camera-zoom");

      setTimeout(() => {
        // White flash overlay
        const flash = document.createElement("div");
        flash.style.cssText = "position:fixed;inset:0;z-index:99999;background:#fff;opacity:0;pointer-events:none;transition:opacity 0.08s ease;";
        document.body.appendChild(flash);
        requestAnimationFrame(() => { flash.style.opacity = "1"; });

        setTimeout(() => {
          bookLayer.style.opacity = "0";
          bookLayer.style.pointerEvents = "none";
          if (siteLayer) {
            siteLayer.classList.add("visible");
            siteLayer.removeAttribute("aria-hidden");
          }
          document.body.classList.remove("intro-mode");
          window.scrollTo(0, 0);
          flash.style.transition = "opacity 0.35s ease";
          flash.style.opacity = "0";
          setTimeout(() => flash.remove(), 400);
        }, 120);
      }, 800);

    } else {
      // Reduced motion: simple fade
      bookLayer.style.transition = "opacity 0.85s ease";
      bookLayer.style.opacity    = "0";
      if (siteLayer) {
        siteLayer.classList.add("visible");
        siteLayer.removeAttribute("aria-hidden");
      }
      window.scrollTo(0, 0);
      setTimeout(() => {
        document.body.classList.remove("intro-mode");
      }, 950);
    }
  }
})();

// ===== Cursor-proximity animation for hero title =====
(function initProximityAnimation() {
  const title = document.querySelector(".hero-title");
  if (!title) return;

  // Respect prefers-reduced-motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Split each .hero-word into individual .hero-letter spans
  const wordEls = title.querySelectorAll(".hero-word");
  const letters = [];

  wordEls.forEach((word) => {
    const text = word.textContent;
    word.textContent = "";
    text.split("").forEach((char) => {
      const span = document.createElement("span");
      span.className = "hero-letter";
      span.textContent = char;
      word.appendChild(span);
      letters.push(span);
    });
  });

  // Proximity config
  const RADIUS = 160;           // gaussian radius in px
  const MAX_SCALE = 0.12;       // extra scale at full proximity
  // Default color #F7F4EC, active color #D9BDB5
  const C_DEF = [247, 244, 236];
  const C_ACT = [217, 189, 181];

  let mouseX = -9999;
  let mouseY = -9999;
  let rafId = null;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function gaussian(d) {
    return Math.exp(-(d * d) / (2 * RADIUS * RADIUS));
  }

  function updateLetters() {
    letters.forEach((letter) => {
      const rect = letter.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const p = gaussian(dist);

      const scale = 1 + MAX_SCALE * p;
      const r = Math.round(lerp(C_DEF[0], C_ACT[0], p));
      const g = Math.round(lerp(C_DEF[1], C_ACT[1], p));
      const b = Math.round(lerp(C_DEF[2], C_ACT[2], p));

      letter.style.transform = `scale(${scale.toFixed(4)})`;
      letter.style.color = `rgb(${r},${g},${b})`;
    });
    rafId = null;
  }

  function scheduleUpdate() {
    if (!rafId) rafId = requestAnimationFrame(updateLetters);
  }

  // Skip on touch-only devices — they have no hover and the effect wastes work
  if (window.matchMedia("(hover: hover)").matches) {
    // Scope to hero element — no need to track the cursor across the whole page
    title.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      scheduleUpdate();
    }, { passive: true });

    title.addEventListener("mouseleave", () => {
      mouseX = -9999;
      mouseY = -9999;
      scheduleUpdate();
    });
  }
})();

// (vanilla WebGL fallback removed — Three.js version in initCelestialBg() handles #cb-bg)
(function initCelestialBgNoop() {
  const container = document.getElementById("celestial-bg-disabled");
  if (!container) return;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return;

  const vs = `
    attribute vec2 a_pos;
    varying vec2 vUv;
    void main() {
      vUv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const fs = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float noise(vec2 st) {
      vec2 i = floor(st); vec2 f = fract(st);
      float a = random(i), b = random(i + vec2(1,0)),
            c = random(i + vec2(0,1)), d = random(i + vec2(1,1));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.y*u.x;
    }
    float fbm(vec2 st) {
      float v = 0.0, amp = 0.5;
      for (int i = 0; i < 6; i++) { v += amp * noise(st); st *= 2.0; amp *= 0.5; }
      return v;
    }
    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.y, u_res.x);
      uv *= 2.2;

      vec2 mouse_n = u_mouse / u_res;
      uv += (mouse_n - 0.5) * 0.25;

      float f = fbm(uv + vec2(u_time * 0.08, u_time * 0.04));
      float t = fbm(uv + f + vec2(u_time * 0.04, u_time * 0.02));

      float nebula = pow(t, 2.2);
      /* Hue ~100° = olive green to match brand background */
      vec3 color = hsl2rgb(vec3(0.278 + nebula * 0.06, 0.55, 0.38));
      color *= nebula * 2.8;

      /* Subtle stars */
      float sv = random(vUv * 600.0);
      if (sv > 0.9985) color += vec3((sv - 0.9985) / 0.0015 * 1.8);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes   = gl.getUniformLocation(prog, "u_res");
  const uTime  = gl.getUniformLocation(prog, "u_time");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");

  let t = 0, mouseX = 0, mouseY = 0, raf;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    mouseX = w * 0.5; mouseY = h * 0.5;
  }

  function draw() {
    t += 0.005;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    const r = container.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = r.height - (e.clientY - r.top);
  });

  resize();
  draw();
})();
