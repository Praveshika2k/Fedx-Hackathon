// Main Application Entry Point - Phase 2: Intelligence

import { Dashboard } from './components/dashboard.js';
import { CaseAllocator } from './components/caseAllocator.js';
import { DCAPerformance } from './components/dcaPerformance.js';
import { AIInsights } from './components/aiInsights.js';
import { PredictiveAnalytics } from './components/predictiveAnalytics.js';
import { AIExplainability } from './components/aiExplainability.js';
import { RealTimeMonitor } from './components/realTimeMonitor.js';
import { APIService } from './services/api-service.js';
import { WebSocketService } from './services/websocket-service.js';

class ARIESPlatform {
    constructor() {
        // Initialize services
        this.apiService = new APIService();
        this.wsService = new WebSocketService();
        
        // Initialize components
        this.dashboard = new Dashboard();
        this.caseAllocator = new CaseAllocator();
        this.dcaPerformance = new DCAPerformance();
        this.aiInsights = new AIInsights();
        this.predictiveAnalytics = new PredictiveAnalytics();
        this.aiExplainability = new AIExplainability();
        this.realTimeMonitor = new RealTimeMonitor();
        
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        console.log('🚀 ARIES Platform v2.0 - Phase 2: Intelligence');
        
        try {
            // Initialize services
            await this.wsService.connect();
            
            // Initialize components
            this.dashboard.init();
            await this.caseAllocator.init();
            await this.dcaPerformance.init();
            await this.aiInsights.init();
            await this.predictiveAnalytics.init();
            await this.aiExplainability.init();
            await this.realTimeMonitor.init();
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Start demo mode for hackathon
            this.startDemoMode();
            
            // Check system health
            await this.checkSystemHealth();
            
            console.log('✅ ARIES Platform Ready!');
            
        } catch (error) {
            console.error('❌ Platform initialization failed:', error);
            this.showError('Platform initialization failed. Please refresh the page.');
        }
    }

    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active class from all items
                menuItems.forEach(i => i.classList.remove('active'));
                
                // Add active class to clicked item
                e.currentTarget.classList.add('active');
                
                // Get section name
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        this.currentSection = sectionName;
        
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show the selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Trigger section-specific initialization
            this.onSectionChange(sectionName);
        }
    }

    onSectionChange(sectionName) {
        switch (sectionName) {
            case 'predictive-analytics':
                this.predictiveAnalytics.renderModelMetrics();
                break;
            case 'real-time-monitor':
                this.realTimeMonitor.startMonitoring();
                break;
            case 'model-management':
                this.loadModelManagementData();
                break;
        }
    }

    async loadModelManagementData() {
        try {
            const metrics = await this.apiService.getModelMetrics();
            this.updateModelManagementUI(metrics);
        } catch (error) {
            console.error('Error loading model management data:', error);
        }
    }

    updateModelManagementUI(metrics) {
        // Update model status widgets
        const modelItems = document.querySelectorAll('.model-item');
        modelItems.forEach(item => {
            const modelName = item.querySelector('span:first-child').textContent;
            const accuracyElement = item.querySelector('.model-accuracy');
            
            let accuracy = 0;
            switch (modelName) {
                case 'Recovery Predictor':
                    accuracy = metrics.recoveryPredictor?.accuracy || 0;
                    break;
                case 'Case Prioritizer':
                    accuracy = metrics.casePrioritizer?.accuracy || 0;
                    break;
                case 'DCA Optimizer':
                    accuracy = metrics.dcaOptimizer?.allocationAccuracy || 0;
                    break;
                case 'Sentiment Analyzer':
                    accuracy = metrics.sentimentAnalyzer?.accuracy || 0;
                    break;
            }
            
            if (accuracyElement) {
                accuracyElement.textContent = `${(accuracy * 100).toFixed(1)}%`;
            }
        });
    }

    setupGlobalEvents() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
            });
        }
        
        // Notification button
        const notificationBtn = document.querySelector('.notification');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotificationsPanel();
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
        
        // Export buttons
        document.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.export;
                this.exportData(format);
            });
        });
    }

    showNotificationsPanel() {
        // Create notifications panel
        const panel = document.createElement('div');
        panel.className = 'notifications-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Notifications</h3>
                <button class="close-panel">&times;</button>
            </div>
            <div class="panel-body">
                <div class="notification-item">
                    <i class="fas fa-check-circle success"></i>
                    <div class="notification-content">
                        <strong>AI Model Updated</strong>
                        <p>Recovery prediction accuracy improved by 2.3%</p>
                        <small>2 minutes ago</small>
                    </div>
                </div>
                <div class="notification-item">
                    <i class="fas fa-exclamation-triangle warning"></i>
                    <div class="notification-content">
                        <strong>High Risk Case Detected</strong>
                        <p>Case CASE-2024-187 requires immediate attention</p>
                        <small>15 minutes ago</small>
                    </div>
                </div>
                <div class="notification-item">
                    <i class="fas fa-info-circle info"></i>
                    <div class="notification-content">
                        <strong>System Maintenance</strong>
                        <p>Scheduled maintenance tonight at 2:00 AM</p>
                        <small>1 hour ago</small>
                    </div>
                </div>
            </div>
            <div class="panel-footer">
                <button class="btn-secondary" id="mark-all-read">Mark All as Read</button>
                <button class="btn-primary" id="view-all">View All</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Close panel
        panel.querySelector('.close-panel').addEventListener('click', () => {
            panel.remove();
        });
        
        panel.querySelector('#mark-all-read').addEventListener('click', () => {
            this.markAllNotificationsRead();
            panel.remove();
        });
        
        panel.querySelector('#view-all').addEventListener('click', () => {
            this.showAllNotifications();
            panel.remove();
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !e.target.closest('.notification')) {
                    panel.remove();
                }
            });
        }, 100);
    }

    markAllNotificationsRead() {
        console.log('Marking all notifications as read');
        // In production, this would update the backend
    }

    showAllNotifications() {
        console.log('Showing all notifications');
        // In production, this would navigate to notifications page
    }

    async performSearch(query) {
        if (!query.trim()) return;
        
        console.log('Searching for:', query);
        
        try {
            // Simulate search results
            const results = await this.simulateSearch(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    async simulateSearch(query) {
        return new Promise(resolve => {
            setTimeout(() => {
                const results = [
                    { type: 'case', id: 'CASE-2024-187', title: 'High value recovery case', match: '85%' },
                    { type: 'dca', id: 'DCA-042', title: 'Alpha Collections', match: '92%' },
                    { type: 'report', id: 'RPT-2024-Q1', title: 'Quarterly Recovery Report', match: '78%' },
                    { type: 'ai', id: 'AI-MODEL-001', title: 'Recovery Prediction Model', match: '67%' }
                ];
                resolve(results);
            }, 300);
        });
    }

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result-item">
                <div class="result-type ${result.type}">
                    <i class="fas fa-${this.getSearchResultIcon(result.type)}"></i>
                </div>
                <div class="result-content">
                    <h4>${result.title}</h4>
                    <p>ID: ${result.id} | Match: ${result.match}</p>
                </div>
                <button class="btn-sm" onclick="window.app.viewSearchResult('${result.type}', '${result.id}')">
                    View
                </button>
            </div>
        `).join('');
        
        resultsContainer.style.display = 'block';
    }

    getSearchResultIcon(type) {
        switch (type) {
            case 'case': return 'folder';
            case 'dca': return 'building';
            case 'report': return 'chart-bar';
            case 'ai': return 'brain';
            default: return 'search';
        }
    }

    viewSearchResult(type, id) {
        console.log(`Viewing ${type}: ${id}`);
        // In production, this would navigate to the specific item
    }

    async exportData(format) {
        try {
            let data;
            let filename;
            
            switch (this.currentSection) {
                case 'dashboard':
                    data = await this.exportDashboardData();
                    filename = `dashboard-export-${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'predictive-analytics':
                    data = await this.exportAnalyticsData();
                    filename = `analytics-export-${new Date().toISOString().split('T')[0]}`;
                    break;
                default:
                    data = { message: 'Export not supported for this section' };
                    filename = 'export';
            }
            
            this.downloadData(data, filename, format);
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Export failed. Please try again.');
        }
    }

    async exportDashboardData() {
        // Collect data from dashboard components
        return {
            timestamp: new Date().toISOString(),
            kpis: this.dashboard.getCurrentKPIs(),
            allocations: this.caseAllocator.getRecentAllocations(),
            performance: this.dcaPerformance.getCurrentMetrics(),
            insights: this.aiInsights.getRecentInsights()
        };
    }

    async exportAnalyticsData() {
        return {
            timestamp: new Date().toISOString(),
            modelMetrics: await this.apiService.getModelMetrics(),
            forecasts: await this.apiService.getForecast(30),
            predictions: this.predictiveAnalytics.getRecentPredictions()
        };
    }

    downloadData(data, filename, format = 'json') {
        let content;
        let mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                filename += '.json';
                break;
            case 'csv':
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
                filename += '.csv';
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.showNotification(`Data exported successfully as ${format.toUpperCase()}`, 'success');
    }

    convertToCSV(data) {
        // Simple CSV conversion
        if (Array.isArray(data)) {
            const headers = Object.keys(data[0] || {});
            const rows = [headers.join(',')];
            
            data.forEach(item => {
                const row = headers.map(header => {
                    const value = item[header];
                    return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
                });
                rows.push(row.join(','));
            });
            
            return rows.join('\n');
        }
        
        // For objects, create a simple key-value CSV
        const rows = [['Key', 'Value']];
        Object.entries(data).forEach(([key, value]) => {
            rows.push([key, typeof value === 'object' ? JSON.stringify(value) : value]);
        });
        
        return rows.map(row => row.map(cell => 
            typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(',')).join('\n');
    }

    startDemoMode() {
        console.log('🎬 Starting demo mode for hackathon presentation...');
        
        // Auto-rotate through sections for demo
        if (window.location.href.includes('demo=true')) {
            this.startAutoRotation();
        }
        
        // Simulate live updates
        this.startLiveUpdates();
        
        // Show welcome message
        setTimeout(() => {
            this.showNotification('Welcome to ARIES AI Platform! Demo mode activated.', 'info');
        }, 1000);
    }

    startAutoRotation() {
        const sections = ['dashboard', 'case-management', 'predictive-analytics', 'ai-insights', 'real-time-monitor'];
        let currentIndex = 0;
        
        setInterval(() => {
            currentIndex = (currentIndex + 1) % sections.length;
            this.showSection(sections[currentIndex]);
        }, 15000); // Rotate every 15 seconds
    }

    startLiveUpdates() {
        // Simulate live data updates
        setInterval(() => {
            this.simulateLiveData();
        }, 5000);
        
        // Simulate AI model updates
        setInterval(() => {
            this.simulateModelUpdates();
        }, 30000);
        
        // Simulate system alerts
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.simulateAlert();
            }
        }, 45000);
    }

    simulateLiveData() {
        // Update KPI values
        const kpiCards = document.querySelectorAll('.kpi-value');
        kpiCards.forEach(card => {
            const currentValue = parseFloat(card.textContent.replace(/[^0-9.]/g, ''));
            const change = (Math.random() - 0.5) * 0.02; // ±1% change
            const newValue = currentValue * (1 + change);
            
            if (card.textContent.includes('$')) {
                card.textContent = `$${(newValue / 1000000).toFixed(1)}M`;
            } else if (card.textContent.includes('%')) {
                card.textContent = `${newValue.toFixed(1)}%`;
            } else {
                card.textContent = Math.round(newValue);
            }
        });
    }

    simulateModelUpdates() {
        // Update model accuracy displays
        const accuracyElements = document.querySelectorAll('.model-accuracy');
        accuracyElements.forEach(element => {
            const current = parseFloat(element.textContent);
            const improvement = Math.random() * 0.2; // 0-0.2% improvement
            const newAccuracy = Math.min(99.9, current + improvement);
            element.textContent = `${newAccuracy.toFixed(1)}%`;
        });
        
        this.showNotification('AI models automatically updated with new training data', 'success');
    }

    simulateAlert() {
        const alerts = [
            'High risk case detected: CASE-2024-189',
            'DCA performance below threshold: Beta Recovery',
            'System anomaly detected in prediction pipeline',
            'Recovery forecast updated: +5.2% expected',
            'SLA breach imminent: 3 cases approaching deadline'
        ];
        
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        this.showNotification(randomAlert, 'warning');
    }

    async checkSystemHealth() {
        try {
            const isHealthy = await this.apiService.healthCheck();
            
            if (!isHealthy) {
                this.showError('Backend service unavailable. Some features may not work.');
                return;
            }
            
            // Check WebSocket connection
            const wsStatus = this.wsService.getStatus();
            if (wsStatus !== 'connected') {
                console.warn('WebSocket not connected:', wsStatus);
            }
            
            console.log('✅ System health check passed');
            
        } catch (error) {
            console.error('System health check failed:', error);
            this.showError('System health check failed. Please check your connection.');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'bell';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    cleanup() {
        // Clean up resources
        this.wsService.disconnect();
        this.realTimeMonitor.cleanup();
        
        // Clear intervals
        clearInterval(this.demoInterval);
        clearInterval(this.liveUpdateInterval);
        clearInterval(this.modelUpdateInterval);
        clearInterval(this.alertInterval);
        
        console.log('🧹 Platform cleanup completed');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ARIESPlatform();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});

// Export for module usage
export { ARIESPlatform };