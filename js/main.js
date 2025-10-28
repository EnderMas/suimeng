// 碎梦 - 主要游戏逻辑
console.log('🎮 碎梦项目启动！');

// 游戏状态
const GameState = {
    LOCK_SCREEN: 'lock_screen',
    DESKTOP: 'desktop',
    IN_APP: 'in_app'
};

let currentState = GameState.LOCK_SCREEN;
let gameProgress = {
    unlockedPhone: false,
    learnedLongPress: false,
    visitedApps: []
};

// DOM元素
let sliderThumb;
let lockScreen;
let desktop;
let appGrid;
let debugPanel;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 初始化游戏...');
    
    initializeElements();
    updateTime();
    setupSlider();
    setupAppIcons();
    setupDebug();
    loadProgress();
    
    // 更新屏幕信息
    updateScreenInfo();
    
    setInterval(updateTime, 1000);
});

// 初始化DOM元素
function initializeElements() {
    sliderThumb = document.getElementById('sliderThumb');
    lockScreen = document.getElementById('lockScreen');
    desktop = document.getElementById('desktop');
    appGrid = document.getElementById('appGrid');
    debugPanel = document.getElementById('debugPanel');
}

// 更新时间显示
function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    
    const month = (now.getMonth() + 1).toString();
    const day = now.getDate().toString();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    const dateStr = `${month}月${day}日 ${weekday}`;
    
    // 更新所有时间显示
    const timeElements = document.querySelectorAll('.time, .current-time');
    timeElements.forEach(el => el.textContent = timeStr);
    
    const dateElements = document.querySelectorAll('.current-date, .desktop .date');
    dateElements.forEach(el => {
        if (el.classList.contains('desktop-date')) {
            el.textContent = `${month}月${day}日`;
        } else {
            el.textContent = dateStr;
        }
    });
}

// 设置滑动解锁
function setupSlider() {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    
    const sliderContainer = sliderThumb.parentElement.parentElement;
    const maxSlide = sliderContainer.offsetWidth - sliderThumb.offsetWidth - 8;
    
    // 鼠标事件
    sliderThumb.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // 触摸事件
    sliderThumb.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
        isDragging = true;
        startX = e.clientX || e.touches[0].clientX;
        currentX = parseInt(sliderThumb.style.left) || 0;
        
        sliderThumb.style.transition = 'none';
        e.preventDefault();
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const deltaX = clientX - startX;
        let newX = currentX + deltaX;
        
        // 限制范围
        newX = Math.max(0, Math.min(newX, maxSlide));
        
        sliderThumb.style.left = newX + 'px';
        
        // 检查是否解锁
        if (newX >= maxSlide * 0.9) {
            unlockPhone();
        }
        
        e.preventDefault();
    }
    
    function endDrag(e) {
        if (!isDragging) return;
        
        isDragging = false;
        sliderThumb.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s ease';
        
        const currentLeft = parseInt(sliderThumb.style.left) || 0;
        
        // 如果没有完全滑到底，就弹回
        if (currentLeft < maxSlide * 0.9) {
            sliderThumb.style.left = '4px';
        }
    }
}

// 解锁手机
function unlockPhone() {
    console.log('🔓 手机已解锁！');
    
    gameProgress.unlockedPhone = true;
    saveProgress();
    
    // 切换到桌面
    setTimeout(() => {
        lockScreen.style.display = 'none';
        desktop.style.display = 'block';
        desktop.classList.add('slide-in');
        currentState = GameState.DESKTOP;
    }, 300);
}

// 设置App图标交互
function setupAppIcons() {
    const appIcons = document.querySelectorAll('.app-icon');
    
    appIcons.forEach(icon => {
        const appName = icon.dataset.app;
        const needsLongPress = icon.dataset.longPress === 'true';
        
        if (needsLongPress) {
            // 需要长按的App
            setupLongPress(icon, appName);
        } else {
            // 普通点击的App
            icon.addEventListener('click', () => {
                openApp(appName);
            });
        }
    });
}

// 设置长按交互
function setupLongPress(element, appName) {
    let pressTimer;
    let isLongPress = false;
    
    function startPress(e) {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            handleLongPress(element, appName);
        }, 600);
        
        element.classList.add('long-press-ripple');
        e.preventDefault();
    }
    
    function endPress() {
        clearTimeout(pressTimer);
        element.classList.remove('long-press-ripple');
        
        if (!isLongPress) {
            // 普通点击
            if (!gameProgress.learnedLongPress) {
                showLongPressHint();
            } else {
                openApp(appName);
            }
        }
    }
    
    // 添加事件监听
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', endPress);
    
    element.addEventListener('touchstart', startPress, { passive: false });
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);
}

// 处理长按
function handleLongPress(element, appName) {
    console.log(`🔍 长按了 ${appName}`);
    
    if (!gameProgress.learnedLongPress) {
        gameProgress.learnedLongPress = true;
        saveProgress();
        showMessage('✨ 你学会了长按操作！');
    }
    
    // 显示长按菜单或执行特殊操作
    if (appName === 'settings') {
        showSettingsMenu(element);
    }
}

// 显示长按提示
function showLongPressHint() {
    showMessage('📚 提示：请长按这个App图标');
}

// 显示设置菜单
function showSettingsMenu(iconElement) {
    // 这里可以添加设置菜单的显示逻辑
    showMessage('⚙️ 设置菜单已打开');
}

// 打开App
function openApp(appName) {
    console.log(`📱 打开App: ${appName}`);
    
    if (!gameProgress.visitedApps.includes(appName)) {
        gameProgress.visitedApps.push(appName);
        saveProgress();
    }
    
    switch(appName) {
        case 'investigate':
            openInvestigateBoard();
            break;
        case 'photos':
            showMessage('🖼️ 照片App尚未开发');
            break;
        case 'messages':
            showMessage('💬 信息App尚未开发');
            break;
        case 'notes':
            showMessage('📝 备忘录App尚未开发');
            break;
        case 'memories':
            showMessage('🧠 记忆App尚未开发');
            break;
        default:
            showMessage(`📱 正在打开 ${appName}...`);
    }
}

// 打开调查板
function openInvestigateBoard() {
    showMessage('🔍 调查板将在后续版本中开放');
    // 这里将添加调查板的显示逻辑
}

// 显示消息
function showMessage(message, duration = 3000) {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = 'message-toast';
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        backdrop-filter: blur(10px);
        animation: fadeInOut ${duration}ms ease;
    `;
    
    // 添加动画样式
    if (!document.querySelector('style[data-toast]')) {
        const style = document.createElement('style');
        style.setAttribute('data-toast', 'true');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, duration);
}

// 设置调试面板
function setupDebug() {
    updateDebugInfo();
}

// 更新调试信息
function updateDebugInfo() {
    const storageInfo = document.getElementById('storageInfo');
    const screenInfo = document.getElementById('screenInfo');
    
    if (storageInfo) {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            storageInfo.textContent = '正常';
        } catch(e) {
            storageInfo.textContent = '不可用';
        }
    }
    
    if (screenInfo) {
        screenInfo.textContent = `${window.innerWidth}x${window.innerHeight}`;
    }
}

// 更新屏幕信息
function updateScreenInfo() {
    const screenInfo = document.getElementById('screenInfo');
    if (screenInfo) {
        screenInfo.textContent = `${window.innerWidth}x${window.innerHeight}`;
    }
}

// 调试功能
function resetGame() {
    if (confirm('确定要重置游戏吗？')) {
        localStorage.removeItem('suimeng_progress');
        location.reload();
    }
}

function skipToDesktop() {
    unlockPhone();
}

function toggleDebug() {
    debugPanel.classList.toggle('hidden');
}

// 窗口大小变化
window.addEventListener('resize', () => {
    updateScreenInfo();
});

// 全局暴露调试函数
window.resetGame = resetGame;
window.skipToDesktop = skipToDesktop;
window.toggleDebug = toggleDebug;

console.log('🎉 游戏初始化完成！');