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
  const nowPlayingTitle = document.getElementById("nowPlayingTitle");
  const waveStatus = document.getElementById("waveStatus");
  const floatingPlayer = document.getElementById("floatingPlayer");
  const waveCanvas = document.getElementById("musicWave");
  const waveContext = waveCanvas.getContext("2d");
  let tracks = [];
  let currentTrackIndex = 0;
  let player;
  let playerReady = false;
  let pendingAutoplay = false;
  let isPlaying = false;

  function setMusicStatus(message) {
    musicStatus.textContent = message;
  }

  function updatePlaybackState(playing, label) {
    isPlaying = playing;
    floatingPlayer.classList.toggle("is-playing", playing);
    waveStatus.textContent = label;
    const currentTrack = musicTrackList.querySelector('[aria-current="true"]');
    currentTrack?.classList.toggle("is-playing", playing);
  }

  function drawWaveform(timestamp = 0) {
    const { width, height } = waveCanvas;
    waveContext.clearRect(0, 0, width, height);
    const bars = 24;
    const gap = 2;
    const barWidth = (width - gap * (bars - 1)) / bars;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const time = timestamp / 1000;

    for (let index = 0; index < bars; index += 1) {
      const pulse = Math.abs(Math.sin(time * 5 + index * 0.63));
      const magnitude = isPlaying && !reducedMotion ? 0.16 + pulse * 0.72 : 0.1;
      const barHeight = Math.max(3, magnitude * height);
      waveContext.fillStyle = isPlaying ? "#c084fc" : "#745695";
      waveContext.fillRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
    }

    window.requestAnimationFrame(drawWaveform);
  }

  function initializeYouTubePlayer() {
    if (player || !window.YT?.Player) return;
    player = new window.YT.Player("musicVideo", {
      events: {
        onReady: () => {
          playerReady = true;
          if (tracks.length === 0) return;
          const track = tracks[currentTrackIndex];
          if (pendingAutoplay) player.loadVideoById(track.videoId);
          else player.cueVideoById(track.videoId);
          pendingAutoplay = false;
        },
        onStateChange: event => {
          const states = window.YT.PlayerState;
          if (event.data === states.PLAYING) {
            updatePlaybackState(true, "กำลังเล่น");
            setMusicStatus(`กำลังเล่นเพลง: ${tracks[currentTrackIndex].title}`);
          } else if (event.data === states.PAUSED) {
            updatePlaybackState(false, "หยุดชั่วคราว");
            setMusicStatus(`หยุดชั่วคราว: ${tracks[currentTrackIndex].title}`);
          } else if (event.data === states.ENDED) {
            updatePlaybackState(false, "เล่นจบแล้ว");
            setMusicStatus(`เล่นจบแล้ว: ${tracks[currentTrackIndex].title}`);
          } else if (event.data === states.BUFFERING) {
            updatePlaybackState(false, "กำลังโหลด");
          } else if (event.data === states.CUED) {
            updatePlaybackState(false, "พร้อมเล่น");
          }
        },
        onError: event => {
          updatePlaybackState(false, "เล่นวิดีโอไม่ได้");
          setMusicStatus(`YouTube เล่นวิดีโอนี้ไม่ได้ (รหัส ${event.data})`);
        }
      }
    });
  }

  function loadYouTubeAPI() {
    if (window.YT?.Player) {
      initializeYouTubePlayer();
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      initializeYouTubePlayer();
    };
    const apiScript = document.createElement("script");
    apiScript.src = "https://www.youtube.com/iframe_api";
    apiScript.async = true;
    apiScript.onerror = () => setMusicStatus("โหลดตัวควบคุม YouTube ไม่สำเร็จ แต่ยังเล่นผ่านตัวเล่นได้");
    document.head.append(apiScript);
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
    nowPlayingTitle.textContent = track.title;
    markCurrentTrack();
    musicTrackList.querySelectorAll(".music-track-button").forEach(button => {
      button.classList.remove("is-playing");
    });
    updatePlaybackState(false, autoplay ? "กำลังเริ่มเล่น" : "พร้อมเล่น");
    setMusicStatus(autoplay ? `กำลังเปิดเพลง: ${track.title}` : `เลือกเพลง: ${track.title}`);
    if (playerReady) {
      if (autoplay) player.loadVideoById(track.videoId);
      else player.cueVideoById(track.videoId);
    } else {
      pendingAutoplay = autoplay;
    }
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
      nowPlayingTitle.textContent = "โหลดรายการเพลงไม่สำเร็จ";
      setMusicStatus(`โหลดรายการเพลงไม่สำเร็จ: ${error.message}`);
    }
  }

  const videoUrl = new URL(musicVideo.src);
  videoUrl.searchParams.set("enablejsapi", "1");
  if (window.location.origin.startsWith("http")) {
    videoUrl.searchParams.set("origin", window.location.origin);
  }
  musicVideo.src = videoUrl.toString();
  drawWaveform();
  loadPlaylist();
  loadYouTubeAPI();
})();