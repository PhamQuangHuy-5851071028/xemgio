const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    let mode = 24;
    const savedTheme = localStorage.getItem('clock-theme');
    const savedAnimal = localStorage.getItem('clock-animal') || 'bear';

    const elements = {
      hourTens: document.getElementById('hour-tens'),
      hourOnes: document.getElementById('hour-ones'),
      minuteTens: document.getElementById('minute-tens'),
      minuteOnes: document.getElementById('minute-ones'),
      secondTens: document.getElementById('second-tens'),
      secondOnes: document.getElementById('second-ones'),
      period: document.getElementById('period'),
      weekday: document.getElementById('weekday'),
      calendarDate: document.getElementById('calendar-date'),
      timezone: document.getElementById('timezone'),
      themeToggle: document.getElementById('theme-toggle'),
      searchForm: document.getElementById('search-form'),
      searchInput: document.getElementById('search-input'),
      searchResults: document.getElementById('search-results'),
      playlist: document.getElementById('playlist'),
      audioPlayer: document.getElementById('audio-player'),
      currentTrack: document.getElementById('current-track'),
      playerStatus: document.getElementById('player-status'),
      togglePlay: document.getElementById('toggle-play'),
      previousTrack: document.getElementById('previous-track'),
      nextTrack: document.getElementById('next-track'),
      repeatTrack: document.getElementById('repeat-track'),
      volumeSlider: document.getElementById('volume-slider')
      ,soundcloudPlayer: document.getElementById('soundcloud-player')
    };

    let playlist = JSON.parse(localStorage.getItem('clock-playlist') || '[]').filter(track => !track.isNct);
    let currentTrackIndex = -1;
    let soundcloudWidget = null;
    let repeatTrack = localStorage.getItem('clock-repeat-track') === 'true';

    const petButtons = document.querySelectorAll('.pet-button');
    const petEntities = document.querySelectorAll('.pet-entity');
    const allPupils = document.querySelectorAll('.pet-pupil');
    const pupilPositions = new WeakMap([...allPupils].map(pupil => [pupil, { x: 0, y: 0 }]));
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    document.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    });

    function animatePupils() {
      const activePet = document.querySelector('.pet-entity.active');
      activePet?.querySelectorAll('.pet-pupil').forEach(pupil => {
        const eye = pupil.parentElement.getBoundingClientRect();
        const targetX = Math.max(-1, Math.min(1, (pointerX - (eye.left + eye.width / 2)) / 75)) * 5;
        const targetY = Math.max(-1, Math.min(1, (pointerY - (eye.top + eye.height / 2)) / 75)) * 4;
        const position = pupilPositions.get(pupil);
        position.x += (targetX - position.x) * 0.24;
        position.y += (targetY - position.y) * 0.24;
        pupil.style.transform = `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0)`;
      });
      requestAnimationFrame(animatePupils);
    }

    requestAnimationFrame(animatePupils);

    function setTheme(theme) {
      const isLight = theme === 'light';
      document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
      elements.themeToggle.textContent = isLight ? '☾' : '☼';
      elements.themeToggle.setAttribute('aria-label', isLight ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng');
      localStorage.setItem('clock-theme', isLight ? 'light' : 'dark');
    }

    function setActivePet(name) {
      const validPet = ['bear', 'cat', 'rabbit', 'monkey'].includes(name) ? name : 'bear';
      petButtons.forEach(button => button.classList.toggle('active', button.dataset.pet === validPet));
      petEntities.forEach(entity => entity.classList.toggle('active', entity.id === `pet-${validPet}`));
      localStorage.setItem('clock-animal', validPet);
    }

    function updateDigit(element, value) {
      if (element.textContent === value) return;
      element.textContent = value;
      element.classList.remove('changing');
      void element.offsetWidth;
      element.classList.add('changing');
    }

    function savePlaylist() {
      localStorage.setItem('clock-playlist', JSON.stringify(playlist));
    }

    function renderPlaylist() {
      elements.playlist.innerHTML = '';
      playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `track-item${index === currentTrackIndex ? ' active' : ''}`;
        item.innerHTML = `<span class="track-number">${String(index + 1).padStart(2, '0')}</span><span class="track-name">${track.name}</span><button class="track-remove" type="button" aria-label="Xóa bài">×</button>`;
        item.addEventListener('click', event => {
          if (event.target.closest('.track-remove')) {
            playlist.splice(index, 1);
            if (currentTrackIndex >= playlist.length) currentTrackIndex = playlist.length - 1;
            savePlaylist();
            renderPlaylist();
            return;
          }
          playTrack(index);
        });
        elements.playlist.appendChild(item);
      });
    }

    function playTrack(index) {
      const track = playlist[index];
      if (!track) return;
      currentTrackIndex = index;
      renderPlaylist();
      elements.currentTrack.textContent = track.name;

      if (track.source === 'soundcloud') {
        elements.audioPlayer.pause();
        elements.audioPlayer.removeAttribute('src');
        elements.soundcloudPlayer.style.display = 'block';
        elements.playerStatus.textContent = 'Đang tải SoundCloud...';
        elements.togglePlay.textContent = 'Ⅱ';
        elements.soundcloudPlayer.onload = () => {
          soundcloudWidget = SC.Widget(elements.soundcloudPlayer);
          soundcloudWidget.setVolume(Number(elements.volumeSlider.value));
          soundcloudWidget.bind(SC.Widget.Events.PLAY, () => {
            elements.playerStatus.textContent = 'Đang phát SoundCloud';
            elements.togglePlay.textContent = 'Ⅱ';
          });
          soundcloudWidget.bind(SC.Widget.Events.PAUSE, () => {
            elements.playerStatus.textContent = 'Đã tạm dừng SoundCloud';
            elements.togglePlay.textContent = '▶';
          });
          soundcloudWidget.bind(SC.Widget.Events.FINISH, () => {
            if (repeatTrack) {
              soundcloudWidget.seekTo(0);
              soundcloudWidget.play();
            } else {
              moveTrack(1);
            }
          });
          soundcloudWidget.bind(SC.Widget.Events.ERROR, () => {
            elements.playerStatus.textContent = 'SoundCloud không thể phát link này';
            elements.togglePlay.textContent = '▶';
          });
        };
        elements.soundcloudPlayer.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=%239de2d0&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`;
        return;
      }

      elements.soundcloudPlayer.style.display = 'none';

      elements.audioPlayer.src = track.url;
      elements.audioPlayer.loop = repeatTrack;
      elements.playerStatus.textContent = 'Đang tải audio...';
      elements.audioPlayer.play().then(() => {
      }).catch(() => {
        elements.playerStatus.textContent = 'Nguồn audio này không phát được · hãy chọn bài khác';
        elements.togglePlay.textContent = '▶';
      });
    }

    function moveTrack(step) {
      if (!playlist.length) return;
      const nextIndex = currentTrackIndex < 0 ? 0 : (currentTrackIndex + step + playlist.length) % playlist.length;
      playTrack(nextIndex);
    }

    function normalizeTrackUrl(url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('soundcloud.com')) {
          return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '').toLowerCase();
        }
        return parsed.href.replace(/\/$/, '').toLowerCase();
      } catch {
        return url.trim().toLowerCase();
      }
    }

    function addTrack(track) {
      const normalizedUrl = normalizeTrackUrl(track.url);
      const alreadyAdded = playlist.some(item => normalizeTrackUrl(item.url) === normalizedUrl);
      if (alreadyAdded) {
        elements.playerStatus.textContent = 'Bài hát này đã được thêm vào playlist';
        return false;
      }
      playlist.push(track);
      savePlaylist();
      renderPlaylist();
      if (currentTrackIndex < 0) playTrack(0);
      return true;
    }

    function renderSearchResults(results) {
      elements.searchResults.innerHTML = '';
      if (!results.length) {
        elements.searchResults.innerHTML = '<div class="search-empty">Không tìm thấy bản preview có thể phát.</div>';
        return;
      }
      results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result';
        item.innerHTML = `<img class="search-art" src="${result.thumbnail || ''}" alt=""><div class="search-copy"><div class="search-song">${result.title}</div><div class="search-artist">${result.creator || 'Openverse'} · ${result.license || 'CC'}</div></div><button class="search-add" type="button">+</button>`;
        item.querySelector('.search-add').addEventListener('click', () => {
          addTrack({ url: result.url, name: `${result.title} · ${result.creator || 'Openverse'}` });
          item.remove();
        });
        elements.searchResults.appendChild(item);
      });
    }

    elements.searchForm.addEventListener('submit', async event => {
      event.preventDefault();
      const url = elements.searchInput.value.trim();
      if (!url) return;
      if (!/^(https?:\/\/)(www\.|on\.)?soundcloud\.com\//i.test(url)) {
        elements.playerStatus.textContent = 'Vui lòng nhập link SoundCloud hợp lệ';
        return;
      }
      elements.playerStatus.textContent = 'Đang lấy thông tin SoundCloud...';
      let resolvedUrl = url;
      try {
        if (/^https?:\/\/on\.soundcloud\.com\//i.test(url)) {
          const redirectResponse = await fetch(url, { redirect: 'follow' });
          resolvedUrl = redirectResponse.url;
        }
        const cleanUrl = resolvedUrl.split('?')[0];
        const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(cleanUrl)}`);
        const data = response.ok ? await response.json() : null;
        const fallbackName = cleanUrl.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ') || 'SoundCloud track';
        const added = addTrack({ source: 'soundcloud', url: cleanUrl, name: data?.title || fallbackName });
        elements.searchInput.value = '';
        if (added) elements.playerStatus.textContent = data ? 'Đã thêm vào playlist SoundCloud' : 'Đã thêm link · SoundCloud đang tải player';
      } catch {
        if (resolvedUrl !== url) {
          const fallbackName = resolvedUrl.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ') || 'SoundCloud track';
          const added = addTrack({ source: 'soundcloud', url: resolvedUrl.split('?')[0], name: fallbackName });
          elements.searchInput.value = '';
          if (added) elements.playerStatus.textContent = 'Đã thêm link · SoundCloud đang tải player';
        } else {
          elements.playerStatus.textContent = 'Không nhận diện được link SoundCloud';
        }
      }
    });

    elements.togglePlay.addEventListener('click', () => {
      if (currentTrackIndex < 0) return moveTrack(1);
      if (playlist[currentTrackIndex].source === 'soundcloud') {
        if (soundcloudWidget) {
          soundcloudWidget.toggle();
        } else {
          elements.playerStatus.textContent = 'SoundCloud đang tải player...';
        }
        return;
      }
      if (elements.audioPlayer.paused) {
        elements.audioPlayer.play();
        elements.playerStatus.textContent = 'Đang tải audio...';
      } else {
        elements.audioPlayer.pause();
        elements.playerStatus.textContent = 'Đã tạm dừng';
        elements.togglePlay.textContent = '▶';
      }
    });

    elements.previousTrack.addEventListener('click', () => moveTrack(-1));
    elements.nextTrack.addEventListener('click', () => moveTrack(1));
    elements.repeatTrack.classList.toggle('active', repeatTrack);
    elements.repeatTrack.addEventListener('click', () => {
      repeatTrack = !repeatTrack;
      elements.repeatTrack.classList.toggle('active', repeatTrack);
      elements.repeatTrack.setAttribute('aria-label', repeatTrack ? 'Tắt lặp bài' : 'Lặp bài đang chọn');
      elements.repeatTrack.title = repeatTrack ? 'Tắt lặp bài' : 'Lặp bài đang chọn';
      localStorage.setItem('clock-repeat-track', String(repeatTrack));
      elements.audioPlayer.loop = repeatTrack;
      elements.playerStatus.textContent = repeatTrack ? 'Đã bật lặp bài' : 'Đã tắt lặp bài';
    });
    elements.volumeSlider.addEventListener('input', () => {
      const volume = Number(elements.volumeSlider.value);
      elements.audioPlayer.volume = volume / 100;
      if (soundcloudWidget) soundcloudWidget.setVolume(volume);
    });
    elements.audioPlayer.addEventListener('ended', () => {
      if (!repeatTrack) moveTrack(1);
    });
    elements.audioPlayer.addEventListener('playing', () => {
      elements.playerStatus.textContent = 'Đang phát · tự chuyển bài khi kết thúc';
      elements.togglePlay.textContent = 'Ⅱ';
    });
    elements.audioPlayer.addEventListener('error', () => {
      elements.playerStatus.textContent = 'Nguồn audio này không phát được · hãy chọn bài khác';
      elements.togglePlay.textContent = '▶';
    });
    elements.audioPlayer.addEventListener('pause', () => {
      if (!elements.audioPlayer.ended && currentTrackIndex >= 0) elements.togglePlay.textContent = '▶';
    });

    function updateClock() {
      const now = new Date();
      const hour24 = now.getHours();
      const isAfternoon = hour24 >= 12;
      const displayedHour = mode === 12 ? (hour24 % 12 || 12) : hour24;
      const time = [displayedHour, now.getMinutes(), now.getSeconds()]
        .map(value => String(value).padStart(2, '0')).join('');

      const digits = [time[0], time[1], time[2], time[3], time[4], time[5]];
      [elements.hourTens, elements.hourOnes, elements.minuteTens, elements.minuteOnes, elements.secondTens, elements.secondOnes]
        .forEach((element, index) => updateDigit(element, digits[index]));

      elements.period.textContent = mode === 12 ? (isAfternoon ? 'PM' : 'AM') : '';
      elements.weekday.textContent = weekdays[now.getDay()];
      const month = String(now.getMonth() + 1).padStart(2, '0');
      elements.calendarDate.textContent = `, ${now.getDate()} tháng ${month} năm ${now.getFullYear()}`;
      elements.timezone.textContent = `LOCAL TIME · UTC${formatOffset(now.getTimezoneOffset())}`;
    }

    function formatOffset(offset) {
      const sign = offset <= 0 ? '+' : '-';
      const absolute = Math.abs(offset);
      return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
    }

    document.querySelectorAll('.mode-button').forEach(button => {
      button.addEventListener('click', () => {
        mode = Number(button.dataset.mode);
        document.querySelectorAll('.mode-button').forEach(item => item.classList.toggle('active', item === button));
        updateClock();
      });
    });

    elements.themeToggle.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });

    petButtons.forEach(button => {
      button.addEventListener('click', () => setActivePet(button.dataset.pet));
    });

    setTheme(savedTheme === 'light' ? 'light' : 'dark');
    setActivePet(savedAnimal);
    renderPlaylist();
    updateClock();
    setInterval(updateClock, 1000);
