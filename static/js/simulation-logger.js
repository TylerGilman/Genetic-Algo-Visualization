// simulation-logger.js
class SimulationLogger {
    constructor() {
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

        const styles = document.createElement('style');
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
            }

            .logger-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.9);
                cursor: pointer;
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
            }

            .log-entry {
                margin: 5px 0;
                padding: 5px;
                border-left: 3px solid #444;
                font-size: 12px;
            }

            .log-entry.eat { border-color: #4CAF50; }
            .log-entry.death { border-color: #f44336; }
            .log-entry.breed { border-color: #2196F3; }
        `;
        document.head.appendChild(styles);

        const header = this.container.querySelector('.logger-header');
        header.addEventListener('click', () => {
            this.container.querySelector('.logger-content').classList.toggle('minimized');
            const button = this.container.querySelector('.minimize-button');
            button.textContent = button.textContent === '▼' ? '▲' : '▼';
        });

        document.body.appendChild(this.container);
    }

    log(type, message) {
        const entries = this.container.querySelector('.log-entries');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        entries.appendChild(entry);
        entries.scrollTop = entries.scrollHeight;
    }
}

// For non-module usage
window.SimulationLogger = SimulationLogger;
