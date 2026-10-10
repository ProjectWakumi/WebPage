(() => {
  "use strict";
  // JavaScript Date months start at zero: 10 means November.
  const birthDate = new Date(2003, 10, 3);

  function updateAge() {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthdayNotReached =
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
       today.getDate() < birthDate.getDate());

    if (birthdayNotReached) age -= 1;
    const ageEl = document.getElementById("age");
    if (ageEl) ageEl.textContent = String(age);

    const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      next.setFullYear(next.getFullYear() + 1);
    }
    const days = Math.ceil((next - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
    const nextEl = document.getElementById("nextBirthday");
    if (nextEl) nextEl.textContent = days === 0 ? "(สุขสันต์วันเกิด!)" : `(อีก ${days} วันจะถึงวันเกิด)`;
  }

  updateAge();
  document.getElementById("year").textContent = new Date().getFullYear();

  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));

  const scrollProgress = document.getElementById("scrollProgress");
  const backToTop = document.getElementById("backToTop");
  let scrollFramePending = false;

  function updateScrollDecorations() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    scrollProgress.style.transform = `scaleX(${progress})`;
    backToTop.classList.toggle("visible", window.scrollY > 500);
    scrollFramePending = false;
  }

  window.addEventListener("scroll", () => {
    if (scrollFramePending) return;
    scrollFramePending = true;
    window.requestAnimationFrame(updateScrollDecorations);
  }, { passive: true });
  window.addEventListener("resize", updateScrollDecorations);
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  updateScrollDecorations();

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const revealItems = document.querySelectorAll(
      ".section-heading, .about-grid > *, .social-card, .project-card, .music-player, .closing"
    );
    revealItems.forEach((item, index) => {
      item.classList.add("scroll-reveal");
      if (item.matches(".social-card, .project-card")) {
        item.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
      }
    });
    document.body.classList.add("motion-enabled");

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealItems.forEach(item => revealObserver.observe(item));
  }

  const musicStatus = document.getElementById("musicStatus");
  const musicTrackList = document.getElementById("musicTrackList");
  const musicVideo = document.getElementById("musicVideo");
  let tracks = [];
  let currentTrackIndex = 0;

  function setMusicStatus(message) {
    musicStatus.textContent = message;
  }

  function markCurrentTrack() {
    const buttons = musicTrackList.querySelectorAll("button[data-track-index]");
    buttons.forEach((button, index) => {
      if (index === currentTrackIndex) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function selectTrack(index, autoplay = false) {
    if (tracks.length === 0) return;
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];
    if (!/^[\w-]{11}$/.test(track.videoId)) {
      setMusicStatus(`ลิงก์วิดีโอไม่ถูกต้อง: ${track.title}`);
      return;
    }

    musicVideo.src = `https://www.youtube-nocookie.com/embed/${track.videoId}?rel=0&autoplay=${autoplay ? 1 : 0}`;
    musicVideo.title = `เล่นเพลง ${track.title} จาก YouTube`;
    markCurrentTrack();
    setMusicStatus(autoplay ? `กำลังเปิดเพลง: ${track.title}` : `เลือกเพลง: ${track.title}`);
  }

  function renderTrackList() {
    musicTrackList.replaceChildren();
    tracks.forEach((track, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "music-track-button";
      button.dataset.trackIndex = String(index);
      button.textContent = track.title;
      button.addEventListener("click", () => selectTrack(index, true));
      item.append(button);
      musicTrackList.append(item);
    });
  }

  async function loadPlaylist() {
    try {
      const response = await fetch("assets/music/playlist.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`รายการเพลงตอบกลับ ${response.status}`);
      const playlist = await response.json();
      if (!Array.isArray(playlist) || playlist.length === 0) {
        throw new Error("ไม่พบรายการวิดีโอเพลง");
      }

      tracks = playlist;
      renderTrackList();
      selectTrack(0);
      setMusicStatus(`เลือกรับฟังได้ · ${tracks.length} เพลง`);
    } catch (error) {
      setMusicStatus(`โหลดรายการเพลงไม่สำเร็จ: ${error.message}`);
    }
  }

  loadPlaylist();
})();