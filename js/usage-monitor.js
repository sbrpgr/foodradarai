// API Usage Monitor & Management
// FoodRadar.AI - Resource Management System

class APIUsageMonitor {
    constructor() {
        this.usageData = this.loadUsageData();
        this.dailyLimit = 1000; // Gemini API daily request limit
        this.warningThreshold = 0.8; // 80% usage warning
        this.criticalThreshold = 0.95; // 95% usage critical
        
        this.initializeMonitor();
    }

    // Initialize usage monitor
    initializeMonitor() {
        this.resetDailyCounterIfNeeded();
        this.updateUsageDisplay();
        this.checkUsageLimits();
        
        // Set up periodic monitoring
        setInterval(() => {
            this.resetDailyCounterIfNeeded();
            this.updateUsageDisplay();
        }, 60000); // Check every minute
    }

    // Load usage data from localStorage
    loadUsageData() {
        const defaultData = {
            daily: {
                date: new Date().toDateString(),
                requests: 0,
                successful: 0,
                failed: 0
            },
            total: {
                requests: 0,
                successful: 0,
                failed: 0,
                lastReset: new Date().toISOString()
            }
        };

        try {
            const saved = localStorage.getItem('gemini_usage_data');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch (error) {
            console.error('Usage data load error:', error);
            return defaultData;
        }
    }

    // Save usage data to localStorage
    saveUsageData() {
        try {
            localStorage.setItem('gemini_usage_data', JSON.stringify(this.usageData));
        } catch (error) {
            console.error('Usage data save error:', error);
        }
    }

    // Reset daily counter if new day
    resetDailyCounterIfNeeded() {
        const today = new Date().toDateString();
        if (this.usageData.daily.date !== today) {
            this.usageData.daily = {
                date: today,
                requests: 0,
                successful: 0,
                failed: 0
            };
            this.saveUsageData();
            console.log('📊 Daily usage counter reset');
        }
    }

    // Record API request
    recordRequest(type = 'text', success = true, responseTime = 0) {
        this.usageData.daily.requests++;
        this.usageData.total.requests++;

        if (success) {
            this.usageData.daily.successful++;
            this.usageData.total.successful++;
        } else {
            this.usageData.daily.failed++;
            this.usageData.total.failed++;
        }

        this.saveUsageData();
        this.updateUsageDisplay();
        this.checkUsageLimits();

        // Log usage
        console.log(`📡 API 사용 기록: ${type} | 성공: ${success} | 응답시간: ${responseTime}ms`);
        console.log(`📊 오늘 사용량: ${this.usageData.daily.requests}/${this.dailyLimit}`);
    }

    // Check if request is allowed
    canMakeRequest() {
        const usage = this.getDailyUsagePercentage();
        
        if (usage >= 1.0) { // 100% usage
            this.showUsageLimitMessage();
            return false;
        }

        return true;
    }

    // Get daily usage percentage
    getDailyUsagePercentage() {
        return this.usageData.daily.requests / this.dailyLimit;
    }

    // Update usage display in UI
    updateUsageDisplay() {
        const usagePercentage = this.getDailyUsagePercentage();
        const remainingRequests = this.dailyLimit - this.usageData.daily.requests;

        // Update API status indicator
        const statusIndicator = document.getElementById('ai-status-indicator');
        if (statusIndicator && geminiAPIInitialized) {
            const usageInfo = ` (${this.usageData.daily.requests}/${this.dailyLimit})`;
            
            if (usagePercentage >= this.criticalThreshold) {
                statusIndicator.innerHTML = `🔴 API 한계 임박${usageInfo}`;
                statusIndicator.className = 'ml-2 text-sm text-red-600';
            } else if (usagePercentage >= this.warningThreshold) {
                statusIndicator.innerHTML = `🟡 API 사용량 주의${usageInfo}`;
                statusIndicator.className = 'ml-2 text-sm text-yellow-600';
            } else {
                statusIndicator.innerHTML = `✅ Gemini AI 연동됨${usageInfo}`;
                statusIndicator.className = 'ml-2 text-sm text-green-600';
            }
        }

        // Create or update usage widget
        this.updateUsageWidget(usagePercentage, remainingRequests);
    }

    // Update usage widget
    updateUsageWidget(percentage, remaining) {
        let widget = document.getElementById('usage-widget');
        
        if (!widget) {
            widget = this.createUsageWidget();
        }

        const progressBar = widget.querySelector('.usage-progress-fill');
        const usageText = widget.querySelector('.usage-text');
        const remainingText = widget.querySelector('.remaining-text');

        if (progressBar) {
            progressBar.style.width = `${Math.min(percentage * 100, 100)}%`;
            
            // Update color based on usage
            if (percentage >= this.criticalThreshold) {
                progressBar.className = 'usage-progress-fill bg-red-500';
            } else if (percentage >= this.warningThreshold) {
                progressBar.className = 'usage-progress-fill bg-yellow-500';
            } else {
                progressBar.className = 'usage-progress-fill bg-green-500';
            }
        }

        if (usageText) {
            usageText.textContent = `${Math.round(percentage * 100)}%`;
        }

        if (remainingText) {
            remainingText.textContent = `남은 요청: ${remaining}개`;
        }
    }

    // Create usage widget
    createUsageWidget() {
        const widget = document.createElement('div');
        widget.id = 'usage-widget';
        widget.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-40';
        widget.style.minWidth = '200px';
        
        widget.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">API 사용량</span>
                <button onclick="toggleUsageWidget()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
            <div class="usage-progress-bg bg-gray-200 rounded-full h-2 mb-2">
                <div class="usage-progress-fill bg-green-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-600">
                <span class="usage-text">0%</span>
                <span class="remaining-text">남은 요청: ${this.dailyLimit}개</span>
            </div>
        `;

        document.body.appendChild(widget);
        return widget;
    }

    // Check usage limits and show warnings
    checkUsageLimits() {
        const usage = this.getDailyUsagePercentage();

        if (usage >= this.criticalThreshold && !this.criticalWarningShown) {
            this.showUsageWarning('critical');
            this.criticalWarningShown = true;
        } else if (usage >= this.warningThreshold && !this.warningShown) {
            this.showUsageWarning('warning');
            this.warningShown = true;
        }

        // Reset warning flags at start of new day
        if (this.usageData.daily.requests === 1) {
            this.warningShown = false;
            this.criticalWarningShown = false;
        }
    }

    // Show usage warning
    showUsageWarning(level) {
        const usage = this.getDailyUsagePercentage();
        const remaining = this.dailyLimit - this.usageData.daily.requests;

        let message, color, icon;

        if (level === 'critical') {
            message = `⚠️ API 사용량이 ${Math.round(usage * 100)}%에 도달했습니다!\n남은 요청: ${remaining}개`;
            color = 'bg-red-500';
            icon = 'fas fa-exclamation-triangle';
        } else {
            message = `📊 API 사용량이 ${Math.round(usage * 100)}%입니다.\n남은 요청: ${remaining}개`;
            color = 'bg-yellow-500';
            icon = 'fas fa-info-circle';
        }

        this.showToast(message, color, icon);
    }

    // Show usage limit reached message
    showUsageLimitMessage() {
        const message = '🚫 일일 API 사용량을 모두 소진했습니다.\n내일 00시에 초기화됩니다.\n\n모의 분석 모드로 계속 사용하실 수 있습니다.';
        this.showToast(message, 'bg-red-500', 'fas fa-ban', 8000);
    }

    // Show toast notification
    showToast(message, bgColor, icon, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `fixed top-20 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
        
        toast.innerHTML = `
            <div class="flex items-start">
                <i class="${icon} mt-1 mr-3 flex-shrink-0"></i>
                <div class="flex-1">
                    <div class="text-sm whitespace-pre-line">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    // Get usage statistics
    getUsageStats() {
        return {
            today: {
                requests: this.usageData.daily.requests,
                successful: this.usageData.daily.successful,
                failed: this.usageData.daily.failed,
                successRate: this.usageData.daily.requests > 0 ? 
                    (this.usageData.daily.successful / this.usageData.daily.requests * 100).toFixed(1) : 0
            },
            total: this.usageData.total,
            limits: {
                daily: this.dailyLimit,
                remaining: this.dailyLimit - this.usageData.daily.requests,
                usagePercentage: (this.getDailyUsagePercentage() * 100).toFixed(1)
            }
        };
    }

    // Export usage data
    exportUsageData() {
        const stats = this.getUsageStats();
        const dataStr = JSON.stringify(stats, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `foodradar_api_usage_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// Global toggle function for usage widget
function toggleUsageWidget() {
    const widget = document.getElementById('usage-widget');
    if (widget) {
        widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
    }
}

// Initialize usage monitor
const usageMonitor = new APIUsageMonitor();

// Export for global access
window.usageMonitor = usageMonitor;
window.toggleUsageWidget = toggleUsageWidget;