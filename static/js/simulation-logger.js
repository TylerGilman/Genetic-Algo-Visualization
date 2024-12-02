class SimulationLogger extends SimulationComponent {
    constructor() {
        super('logger');
        this.container = null;
        this.logEntries = null;
        this.lastLogTimes = new Map();
        this.maxEntries = 100;
        this.createStyles();
        this.createLoggerElement();
    }

    createStyles() {
        const existingStyles = document.getElementById('logger-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styles = document.createElement('style');
        styles.id = 'logger-styles';
        styles.textContent = `
            .simulation-logger {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                max-height: 400px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                border-radius: 8px;
                overflow: hidden;
                font-family: monospace;
                z-index: 1000;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .logger-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.9);
                cursor: pointer;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .logger-content {
                height: 300px;
                overflow-y: auto;
                transition: height 0.3s ease;
            }

            .logger-content.minimized {
                height: 0;
            }

            .log-entries {
                padding: 10px;
                display: flex;
                flex-direction: column-reverse;
                min-height: 100%;
            }

            .log-entry {
                margin: 5px 0;
                padding: 5px 8px;
                border-left: 3px solid #444;
                font-size: 12px;
                line-height: 1.4;
                animation: fadeIn 0.2s ease-out;
            }

            @keyframes fadeIn {
                from { 
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .log-entry.eat { 
                border-color: #4CAF50; 
                background: rgba(76, 175, 80, 0.1);
            }
            
            .log-entry.death { 
                border-color: #f44336; 
                background: rgba(244, 67, 54, 0.1);
            }
            
            .log-entry.breed { 
                border-color: #2196F3; 
                background: rgba(33, 150, 243, 0.1);
            }
            
            .log-entry.spawn { 
                border-color: #FF9800; 
                background: rgba(255, 152, 0, 0.1);
            }
        `;
        document.head.appendChild(styles);
    }

    createLoggerElement() {
        // Remove any existing logger elements first
        const existingLogger = document.querySelector('.simulation-logger');
        if (existingLogger) {
            existingLogger.remove();
        }

        this.container = document.createElement('div');
        this.container.className = 'simulation-logger';
        this.container.innerHTML = `
            <div class="logger-header">
                <h3>Simulation Events</h3>
                <button class="minimize-button">▼</button>
            </div>
            <div class="logger-content">
                <div class="log-entries"></div>
            </div>
        `;

        this.logEntries = this.container.querySelector('.log-entries');
        this.setupEventListeners();
        document.body.appendChild(this.container);
    }

    setupEventListeners() {
        const header = this.container.querySelector('.logger-header');
        const button = this.container.querySelector('.minimize-button');
        const content = this.container.querySelector('.logger-content');

        header.addEventListener('click', () => {
            content.classList.toggle('minimized');
            button.textContent = content.classList.contains('minimized') ? '▲' : '▼';
        });
    }

    initialize() {
        // Subscribe to simulation events
        this.subscribe('fish:spawn', data => this.log('spawn', data));
        this.subscribe('fish:death', data => this.log('death', data));
        this.subscribe('fish:eat', data => this.log('eat', data));
        this.subscribe('generation:new', data => this.log('breed', data));
        this.subscribe('simulation:started', () => this.clearLogs());
    }

    clearLogs() {
        console.log("Clearing logs");
        if (this.logEntries) {
            this.logEntries.innerHTML = '';
            this.lastLogTimes.clear();
        }
    }

    log(type, message) {
        if (!this.logEntries) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        // Insert at the end (will appear at top due to flex-direction: column-reverse)
        this.logEntries.appendChild(entry);

        // Keep the log count under control
        while (this.logEntries.children.length > this.maxEntries) {
            this.logEntries.removeChild(this.logEntries.firstChild);
        }

        // Ensure we're scrolled to show the newest entries (at the top)
        this.logEntries.scrollTop = 0;
    }

    cleanup() {
        const styles = document.getElementById('logger-styles');
        if (styles) {
            styles.remove();
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.logEntries = null;
        this.lastLogTimes.clear();
        super.cleanup();
    }
}

// Make the logger available globally
window.SimulationLogger = SimulationLogger;
