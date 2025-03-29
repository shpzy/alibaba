document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const backgroundMusic = document.getElementById('backgroundMusic');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioTitleElement = document.getElementById('audioTitle');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    // 可选: const timeDisplay = document.getElementById('timeDisplay');

    // 获取所有讲解音频元素 (数据源)
    const narrationAudios = {
        giza: document.getElementById('audio-giza'),
        khafre: document.getElementById('audio-khafre'),
        khufu: document.getElementById('audio-khufu'),
        sphinx: document.getElementById('audio-sphinx'),
        menkaure: document.getElementById('audio-menkaure')
    };

    const markers = document.querySelectorAll('.clickable-marker');

    // --- State Variables ---
    let currentAudio = null; // 当前正在播放或准备播放的音频元素
    let backgroundMusicStarted = false;
    let isDraggingProgressBar = false; // 标记是否正在拖动进度条

    // --- Audio Control Functions ---

    /**
     * 停止所有正在播放的讲解音频并重置播放器UI
     */
    function stopAllNarrationAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            // 移除事件监听器，防止内存泄漏（如果每次播放都添加的话）
            currentAudio.removeEventListener('timeupdate', updateProgressBarUI);
            currentAudio.removeEventListener('ended', handleAudioEnd);
            currentAudio.removeEventListener('loadedmetadata', updateProgressBarUI); // 也移除这个
        }
        currentAudio = null;
        audioPlayer.classList.remove('show');
        audioTitleElement.textContent = '';
        playPauseBtn.classList.remove('playing');
        progressBar.style.width = '0%';
        // if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
    }

    /**
     * 播放指定的音频
     * @param {string} audioKey - narrationAudios 对象中的键 (e.g., 'khafre')
     */
    function playAudio(audioKey) {
        const targetAudio = narrationAudios[audioKey];

        if (!targetAudio) {
            console.error("Audio source not found for key:", audioKey);
            return;
        }

        // 如果点击的是当前已暂停的音频，则继续播放
        if (targetAudio === currentAudio && targetAudio.paused) {
             targetAudio.play().then(() => {
                playPauseBtn.classList.add('playing');
                audioPlayer.classList.add('show'); // 确保播放器可见
            }).catch(error => console.error("Audio playback failed:", error));
             startBackgroundMusicIfNeeded(); // 尝试启动背景音乐
            return;
        }

        // 否则，停止当前音频，播放新的
        stopAllNarrationAudio(); // 先停止其他的
        currentAudio = targetAudio;
        audioTitleElement.textContent = currentAudio.dataset.title || '正在播放...'; // 使用 data-title

        // 添加事件监听器
        currentAudio.addEventListener('timeupdate', updateProgressBarUI);
        currentAudio.addEventListener('ended', handleAudioEnd);
        // 如果元数据还没加载完，可能需要监听loadedmetadata来首次更新进度条
        currentAudio.addEventListener('loadedmetadata', updateProgressBarUI);


        // 尝试播放
        const playPromise = currentAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 播放成功
                playPauseBtn.classList.add('playing');
                audioPlayer.classList.add('show');
                updateProgressBarUI(); // 立即更新一次UI，以防万一
                startBackgroundMusicIfNeeded(); // 尝试启动背景音乐
            }).catch(error => {
                console.error("Audio playback failed:", error);
                // 可以在这里给用户一些提示
                stopAllNarrationAudio(); // 播放失败，重置状态
            });
        }
    }

    /**
     * 处理播放/暂停按钮点击
     */
    function togglePlayPause() {
        if (!currentAudio) return; // 没有音频在播放

        if (currentAudio.paused) {
            currentAudio.play().then(() => {
                playPauseBtn.classList.add('playing');
            }).catch(error => console.error("Audio playback failed:", error));
        } else {
            currentAudio.pause();
            playPauseBtn.classList.remove('playing');
        }
         startBackgroundMusicIfNeeded(); // 用户交互
    }

    /**
     * 更新进度条 UI
     */
    function updateProgressBarUI() {
        if (!currentAudio || !isFinite(currentAudio.duration)) return; // 确保音频有效且duration已加载

        const percentage = (currentAudio.currentTime / currentAudio.duration) * 100;
        progressBar.style.width = `${percentage}%`;

        // 可选：更新时间显示
        // if (timeDisplay) {
        //     timeDisplay.textContent = `${formatTime(currentAudio.currentTime)} / ${formatTime(currentAudio.duration)}`;
        // }
    }

    /**
      * 处理音频播放结束事件
      */
    function handleAudioEnd() {
        playPauseBtn.classList.remove('playing');
        progressBar.style.width = '0%'; // 或100% ？根据设计决定，通常归零
        currentAudio.currentTime = 0; // 重置时间以便下次播放
        // 可以选择自动隐藏播放器或保持显示
        // stopAllNarrationAudio(); // 如果想结束后完全重置
    }

    /**
     * 处理进度条点击/拖动以跳转播放位置
     * @param {MouseEvent} e - 点击事件对象
     */
    function seekAudio(e) {
        if (!currentAudio || !isFinite(currentAudio.duration)) return;

        const progressBarRect = progressBarContainer.getBoundingClientRect();
        const clickX = e.clientX - progressBarRect.left;
        const percentage = Math.max(0, Math.min(1, clickX / progressBarRect.width)); // 限制在0-1之间
        currentAudio.currentTime = percentage * currentAudio.duration;
        updateProgressBarUI(); // 立即更新UI
    }

    /**
     * 启动背景音乐（如果尚未启动）
     */
    function startBackgroundMusicIfNeeded() {
        if (backgroundMusicStarted || !backgroundMusic) return;

        backgroundMusic.muted = false; // 取消静音
        const playPromise = backgroundMusic.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                backgroundMusicStarted = true;
                console.log("Background music started.");
            }).catch(error => {
                console.error("Background music playback failed:", error);
                // 背景音乐播放失败通常不影响主要功能，可以静默处理或只在控制台记录
                 backgroundMusicStarted = false; // 标记为未启动，以便下次尝试
            });
        }
    }

    // 可选：格式化时间 (秒 -> mm:ss)
    // function formatTime(seconds) {
    //     const minutes = Math.floor(seconds / 60);
    //     const secs = Math.floor(seconds % 60);
    //     return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    // }

    // --- Event Listeners Setup ---

    // 标记点点击和键盘事件
    markers.forEach(marker => {
        marker.addEventListener('click', () => {
            const audioKey = marker.dataset.audioId.replace('audio-', ''); // 从 'audio-khafre' 获取 'khafre'
            playAudio(audioKey);
        });

        marker.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // 防止空格键滚动页面
                const audioKey = marker.dataset.audioId.replace('audio-', '');
                playAudio(audioKey);
            }
        });
    });

    // 自定义播放器控件事件
    playPauseBtn.addEventListener('click', togglePlayPause);

    // --- 进度条交互 (点击和拖动) ---
    let isMouseDownOnProgress = false;

    progressBarContainer.addEventListener('mousedown', (e) => {
        isMouseDownOnProgress = true;
        seekAudio(e); // 点击时立即跳转
        startBackgroundMusicIfNeeded(); // 用户交互
    });

    document.addEventListener('mousemove', (e) => {
        // 只有在鼠标按下状态且在进度条上按下时才处理拖动
        if (isMouseDownOnProgress) {
            seekAudio(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDownOnProgress = false; // 释放鼠标，停止拖动处理
    });


    // --- Initial Setup ---
    // 页面加载后自动播放吉萨金字塔介绍
    playAudio('giza');

}); // End DOMContentLoaded