// 碎梦 - 游戏存档系统

const STORAGE_KEY = 'suimeng_progress';
const STORAGE_VERSION = '1.0';

// 默认游戏进度
const defaultProgress = {
    version: STORAGE_VERSION,
    timestamp: Date.now(),
    
    // 基础进度
    unlockedPhone: false,
    currentState: 'lock_screen',
    
    // 学习进度
    learnedOperations: {
        slide: false,        // 滑动解锁
        longPress: false,    // 长按
        drag: false,         // 拖拽
        swipe: false         // 滑动切换
    },
    
    // App访问记录
    visitedApps: [],
    openedApps: [],
    
    // 知识锁进度
    knowledgeLocks: {
        unlocked: [],        // 已解锁的知识锁
        hints: [],           // 已显示的提示
        attempts: {}         // 尝试记录
    },
    
    // 调查板进度
    investigation: {
        cluesFound: [],      // 已发现的线索
        connectionsFound: [], // 已发现的连接
        theoriesFormed: []   // 已形成的推理
    },
    
    // 情节进度
    story: {
        currentChapter: 1,
        viewedScenes: [],
        madeChoices: [],
        unlockedEndings: []
    },
    
    // 设置
    settings: {
        soundEnabled: true,
        vibrationEnabled: true,
        debugMode: false
    }
};

// 存档管理类
class GameStorage {
    constructor() {
        this.data = null;
        this.listeners = new Set();
        this.init();
    }
    
    init() {
        this.load();
        this.validateData();
        this.setupAutoSave();
        
        console.log('💾 游戏存档系统初始化完成');
    }
    
    // 加载游戏数据
    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = this.mergeWithDefaults(parsed);
                console.log('📊 加载游戏进度:', this.data);
            } else {
                this.data = { ...defaultProgress };
                console.log('🆕 创建新游戏进度');
            }
        } catch (error) {
            console.warn('⚠️ 加载游戏数据失败:', error);
            this.data = { ...defaultProgress };
        }
    }
    
    // 保存游戏数据
    save() {
        try {
            this.data.timestamp = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            this.notifyListeners('save', this.data);
            console.log('✅ 游戏进度已保存');
            return true;
        } catch (error) {
            console.error('❌ 保存游戏数据失败:', error);
            return false;
        }
    }
    
    // 合并默认数据
    mergeWithDefaults(saved) {
        const merged = { ...defaultProgress };
        
        // 递归合并对象
        function deepMerge(target, source) {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
                        target[key] = deepMerge(target[key] || {}, source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            return target;
        }
        
        return deepMerge(merged, saved);
    }
    
    // 校验数据合法性
    validateData() {
        if (!this.data || typeof this.data !== 'object') {
            this.data = { ...defaultProgress };
            return false;
        }
        
        // 检查版本兼容性
        if (this.data.version !== STORAGE_VERSION) {
            console.log(`🔄 游戏版本更新: ${this.data.version} -> ${STORAGE_VERSION}`);
            this.data = this.migrateVersion(this.data);
        }
        
        return true;
    }
    
    // 版本迁移
    migrateVersion(oldData) {
        // 在这里处理不同版本之间的数据迁移
        const migrated = this.mergeWithDefaults(oldData);
        migrated.version = STORAGE_VERSION;
        return migrated;
    }
    
    // 设置自动保存
    setupAutoSave() {
        // 页面关闭时保存
        window.addEventListener('beforeunload', () => {
            this.save();
        });
        
        // 页面隐藏时保存
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.save();
            }
        });
        
        // 定时保存（每5分钟）
        setInterval(() => {
            this.save();
        }, 5 * 60 * 1000);
    }
    
    // 获取数据
    get(key) {
        if (!key) return this.data;
        
        const keys = key.split('.');
        let current = this.data;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    // 设置数据
    set(key, value) {
        if (!key) return false;
        
        const keys = key.split('.');
        let current = this.data;
        
        // 导航到父对象
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        // 设置值
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // 通知监听器
        this.notifyListeners('change', { key, value, oldValue });
        
        return true;
    }
    
    // 添加到数组
    addToArray(key, item) {
        const array = this.get(key);
        if (!Array.isArray(array)) {
            this.set(key, [item]);
        } else if (!array.includes(item)) {
            array.push(item);
            this.notifyListeners('change', { key, value: array, action: 'add', item });
        }
    }
    
    // 从数组中移除
    removeFromArray(key, item) {
        const array = this.get(key);
        if (Array.isArray(array)) {
            const index = array.indexOf(item);
            if (index > -1) {
                array.splice(index, 1);
                this.notifyListeners('change', { key, value: array, action: 'remove', item });
            }
        }
    }
    
    // 重置游戏
    reset() {
        this.data = { ...defaultProgress };
        this.save();
        this.notifyListeners('reset', this.data);
        console.log('🔄 游戏进度已重置');
    }
    
    // 导出数据
    export() {
        return JSON.stringify(this.data, null, 2);
    }
    
    // 导入数据
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.data = this.mergeWithDefaults(imported);
            this.validateData();
            this.save();
            this.notifyListeners('import', this.data);
            console.log('📊 游戏数据导入成功');
            return true;
        } catch (error) {
            console.error('❌ 导入游戏数据失败:', error);
            return false;
        }
    }
    
    // 添加监听器
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    // 移除监听器
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    // 通知监听器
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('监听器执行错误:', error);
            }
        });
    }
    
    // 获取游戏统计
    getStats() {
        return {
            version: this.data.version,
            timestamp: this.data.timestamp,
            playTime: Date.now() - this.data.timestamp,
            learnedOperationsCount: Object.values(this.data.learnedOperations).filter(Boolean).length,
            visitedAppsCount: this.data.visitedApps.length,
            cluesFoundCount: this.data.investigation.cluesFound.length,
            unlockedEndingsCount: this.data.story.unlockedEndings.length
        };
    }
}

// 创建全局存档实例
const gameStorage = new GameStorage();

// 暴露到全局
window.gameStorage = gameStorage;

// 便捷函数
function saveProgress() {
    return gameStorage.save();
}

function loadProgress() {
    gameStorage.load();
    // 同步到全局变量
    if (window.gameProgress) {
        Object.assign(window.gameProgress, gameStorage.data);
    }
}

function resetProgress() {
    gameStorage.reset();
    if (window.gameProgress) {
        Object.assign(window.gameProgress, gameStorage.data);
    }
}

// 暴露便捷函数
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.resetProgress = resetProgress;

console.log('💾 游戏存档系统初始化完成');