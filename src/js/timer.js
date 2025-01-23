class Timer {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isRunning = false;
        this.timerDisplay = document.getElementById('timer');
    }

    start() {
        this.timerDisplay.style.display = 'block';
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                return;
            }
            this.elapsedTime = Date.now() - this.startTime;
            this.updateDisplay();
        }, 100);
    }

    stop() {
        this.isRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            
        }
    }

    reset() {
        this.stop();
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.updateDisplay();
    }

    updateDisplay() {
        const seconds = Math.floor((this.elapsedTime / 1000) % 60);
        const minutes = Math.floor((this.elapsedTime / (1000 * 60)) % 60);
        this.timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}