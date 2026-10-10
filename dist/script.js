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

  const audio = document.getElementById("musicAudio");
  const musicPlay = document.getElementById("musicPlay");
  const musicMute = document.getElementById("musicMute");
  const musicVolume = document.getElementById("musicVolume");
  const musicStatus = document.getElementById("musicStatus");
  const musicTrackList = document.getElementById("musicTrackList");
  const nowPlayingTitle = document.getElementById("nowPlayingTitle");
  const waveCanvas = document.getElementById("musicWave");
  const waveContext = waveCanvas.getContext("2d");
  const savedVolume = Number(localStorage.getItem("wakumi-music-volume"));
  let volume = Number.isFinite(savedVolume) && localStorage.getItem("wakumi-music-volume") !== null
    ? Math.min(100, Math.max(0, savedVolume))
    : 50;
  let isMuted = localStorage.getItem("wakumi-music-muted") === "true";
  let tracks = [];
  let currentTrackIndex = 0;
  let audioContext;
  let analyser;
  let frequencyData;

  function setMusicStatus(message) {
    musicStatus.textContent = message;
  }

  function updateVolumeControls() {
    musicVolume.value = String(volume);
    musicVolume.setAttribute("aria-valuetext", `${volume}%`);
    musicMute.textContent = isMuted ? "🔇" : "🔊";
    musicMute.setAttribute("aria-label", isMuted ? "เปิดเสียง" : "ปิดเสียง");
    musicMute.setAttribute("aria-pressed", String(isMuted));
  }

  function updatePlaybackControls() {
    const isPlaying = !audio.paused && !audio.ended;
    musicPlay.textContent = isPlaying ? "⏸" : "▶";
    musicPlay.setAttribute("aria-label", isPlaying ? "หยุดเพลง" : "เล่นเพลง");
    const currentTrack = musicTrackList.querySelector('[aria-current="true"]');
    currentTrack?.classList.toggle("is-playing", isPlaying);
  }

  function drawWaveform() {
    const { width, height } = waveCanvas;
    waveContext.clearRect(0, 0, width, height);
    const bars = 24;
    const gap = 2;
    const barWidth = (width - gap * (bars - 1)) / bars;
    const isPlaying = analyser && !audio.paused && !audio.ended;

    if (isPlaying) analyser.getByteFrequencyData(frequencyData);

    for (let index = 0; index < bars; index += 1) {
      const magnitude = isPlaying
        ? frequencyData[Math.floor(index * frequencyData.length / bars)] / 255
        : 0.08;
      const barHeight = Math.max(3, magnitude * height);
      waveContext.fillStyle = isPlaying ? "#c084fc" : "#745695";
      waveContext.fillRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
    }

    window.requestAnimationFrame(drawWaveform);
  }

  async function prepareAudioAnalysis() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      audioContext.createMediaElementSource(audio).connect(analyser);
      analyser.connect(audioContext.destination);
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioContext.state === "suspended") await audioContext.resume();
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

  async function playCurrentTrack() {
    try {
      await prepareAudioAnalysis();
      await audio.play();
      updatePlaybackControls();
      setMusicStatus(`กำลังเล่น: ${tracks[currentTrackIndex].title}`);
    } catch (error) {
      updatePlaybackControls();
      setMusicStatus(`เล่นเพลงไม่ได้: ${error.message}`);
    }
  }

  async function selectTrack(index, autoplay = false) {
    if (tracks.length === 0) return;
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];
    audio.src = track.src;
    nowPlayingTitle.textContent = track.title;
    markCurrentTrack();
    musicTrackList.querySelectorAll(".music-track-button").forEach(button => {
      button.classList.remove("is-playing");
    });
    audio.load();
    setMusicStatus(`เลือกเพลง: ${track.title}`);
    if (autoplay) await playCurrentTrack();
    else updatePlaybackControls();
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
        throw new Error("ไม่พบไฟล์ MP3 ในรายการเพลง");
      }

      tracks = playlist;
      renderTrackList();
      await selectTrack(0);
      [musicPlay, musicMute, musicVolume].forEach(control => {
        control.disabled = false;
      });
      setMusicStatus(`พร้อมเล่น · ${tracks.length} เพลง`);
    } catch (error) {
      nowPlayingTitle.textContent = "โหลดรายการเพลงไม่สำเร็จ";
      setMusicStatus(`โหลดรายการเพลงไม่สำเร็จ: ${error.message}`);
    }
  }

  musicPlay.addEventListener("click", () => {
    if (audio.paused) playCurrentTrack();
    else audio.pause();
  });

  musicVolume.addEventListener("input", () => {
    volume = Number(musicVolume.value);
    audio.volume = volume / 100;
    if (isMuted && volume > 0) {
      isMuted = false;
      audio.muted = false;
    }
    localStorage.setItem("wakumi-music-volume", String(volume));
    localStorage.setItem("wakumi-music-muted", String(isMuted));
    updateVolumeControls();
  });

  musicMute.addEventListener("click", () => {
    isMuted = !isMuted;
    audio.muted = isMuted;
    localStorage.setItem("wakumi-music-muted", String(isMuted));
    updateVolumeControls();
  });

  audio.volume = volume / 100;
  audio.muted = isMuted;
  audio.addEventListener("play", updatePlaybackControls);
  audio.addEventListener("pause", updatePlaybackControls);
  audio.addEventListener("ended", () => selectTrack(currentTrackIndex + 1, true));
  audio.addEventListener("error", () => {
    const track = tracks[currentTrackIndex];
    if (track) setMusicStatus(`โหลดเพลงไม่สำเร็จ: ${track.title}`);
  });
  updateVolumeControls();
  drawWaveform();
  loadPlaylist();
})();