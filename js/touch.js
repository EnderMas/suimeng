// 碎梦 - 触摸交互处理

// 触摸事件处理类
class TouchHandler {
    constructor() {
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
        this.isLongPress = false;
        this.longPressThreshold = 600; // 600ms
        this.moveThreshold = 10; // 10px
        this.activeElements = new Map();
        
        this.init();
    }
    
    init() {
        // 禁用默认的触摸行为
        document.addEventListener('touchstart', this.preventDefaults, { passive: false });
        document.addEventListener('touchmove', this.preventDefaults, { passive: false });
        document.addEventListener('touchend', this.preventDefaults, { passive: false });
        
        // 禁用双击缩放
        document.addEventListener('touchstart', this.preventDoubleTapZoom, { passive: false });
        
        // 禁用上下滚动
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'manipulation';
    }
    
    preventDefaults(e) {
        // 允许特定元素的触摸事件
        const allowedElements = ['slider-thumb', 'app-icon'];
        const target = e.target;
        
        if (target && (target.className.includes('slider-thumb') || 
                      target.closest('.app-icon') ||
                      target.closest('.debug-panel'))) {
            return;
        }
        
        e.preventDefault();
    }
    
    preventDoubleTapZoom(e) {
        let lastTap = 0;
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
        }
        
        lastTap = currentTime;
    }
    
    // 添加长按监听
    addLongPressListener(element, callback, options = {}) {
        const config = {
            threshold: options.threshold || this.longPressThreshold,
            moveThreshold: options.moveThreshold || this.moveThreshold,
            ...options
        };
        
        const handler = {
            element,
            callback,
            config,
            timer: null,
            startPos: null,
            isActive: false
        };
        
        this.activeElements.set(element, handler);
        
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e, handler), { passive: false });
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e, handler), { passive: false });
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e, handler), { passive: false });
        element.addEventListener('touchcancel', (e) => this.handleTouchCancel(e, handler), { passive: false });
        
        // 也支持鼠标事件（供桌面调试）
        element.addEventListener('mousedown', (e) => this.handleMouseDown(e, handler));
        element.addEventListener('mousemove', (e) => this.handleMouseMove(e, handler));
        element.addEventListener('mouseup', (e) => this.handleMouseUp(e, handler));
        element.addEventListener('mouseleave', (e) => this.handleMouseLeave(e, handler));
    }
    
    handleTouchStart(e, handler) {
        if (e.touches.length > 1) return; // 只处理单指触摸
        
        const touch = e.touches[0];
        handler.startPos = { x: touch.clientX, y: touch.clientY };
        handler.isActive = true;
        
        this.startLongPress(handler);
        this.addVisualFeedback(handler.element);
    }
    
    handleTouchMove(e, handler) {
        if (!handler.isActive || !handler.startPos) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - handler.startPos.x);
        const deltaY = Math.abs(touch.clientY - handler.startPos.y);
        
        if (deltaX > handler.config.moveThreshold || deltaY > handler.config.moveThreshold) {
            this.cancelLongPress(handler);
        }
    }
    
    handleTouchEnd(e, handler) {
        this.endInteraction(handler);
    }
    
    handleTouchCancel(e, handler) {
        this.endInteraction(handler);
    }
    
    // 鼠标事件处理（桌面调试）
    handleMouseDown(e, handler) {
        handler.startPos = { x: e.clientX, y: e.clientY };
        handler.isActive = true;
        
        this.startLongPress(handler);
        this.addVisualFeedback(handler.element);
    }
    
    handleMouseMove(e, handler) {
        if (!handler.isActive || !handler.startPos) return;
        
        const deltaX = Math.abs(e.clientX - handler.startPos.x);
        const deltaY = Math.abs(e.clientY - handler.startPos.y);
        
        if (deltaX > handler.config.moveThreshold || deltaY > handler.config.moveThreshold) {
            this.cancelLongPress(handler);
        }
    }
    
    handleMouseUp(e, handler) {
        this.endInteraction(handler);
    }
    
    handleMouseLeave(e, handler) {
        this.endInteraction(handler);
    }
    
    startLongPress(handler) {
        if (handler.timer) {
            clearTimeout(handler.timer);
        }
        
        handler.timer = setTimeout(() => {
            if (handler.isActive) {
                handler.callback({
                    type: 'longpress',
                    element: handler.element,
                    position: handler.startPos
                });
                
                this.addLongPressEffect(handler.element);
                handler.wasLongPress = true;
            }
        }, handler.config.threshold);
    }
    
    cancelLongPress(handler) {
        if (handler.timer) {
            clearTimeout(handler.timer);
            handler.timer = null;
        }
        
        this.removeVisualFeedback(handler.element);
        handler.isActive = false;
    }
    
    endInteraction(handler) {
        const wasLongPress = handler.wasLongPress;
        
        this.cancelLongPress(handler);
        this.removeVisualFeedback(handler.element);
        
        if (handler.isActive && !wasLongPress) {
            // 普通点击
            handler.callback({
                type: 'tap',
                element: handler.element,
                position: handler.startPos
            });
        }
        
        handler.isActive = false;
        handler.wasLongPress = false;
        handler.startPos = null;
    }
    
    addVisualFeedback(element) {
        element.style.transform = 'scale(0.95)';
        element.style.opacity = '0.8';
    }
    
    removeVisualFeedback(element) {
        element.style.transform = '';
        element.style.opacity = '';
    }
    
    addLongPressEffect(element) {
        element.classList.add('long-press-ripple');
        
        setTimeout(() => {
            element.classList.remove('long-press-ripple');
        }, 600);
    }
    
    // 清理资源
    destroy() {
        this.activeElements.forEach((handler, element) => {
            if (handler.timer) {
                clearTimeout(handler.timer);
            }
        });
        
        this.activeElements.clear();
    }
}

// 防止选中文本
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

// 防止右键菜单
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// 防止拖拽
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

// 防止缩放
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// 创建全局触摸处理器
const globalTouchHandler = new TouchHandler();

// 暴露到全局
window.TouchHandler = TouchHandler;
window.touchHandler = globalTouchHandler;

console.log('👆 触摸交互系统初始化完成');