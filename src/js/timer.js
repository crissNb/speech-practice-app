function Timer() {
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isRunning = false;

    this.start = function() {
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateDisplay();
        }, 100);
    };

    this.stop = function() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
    };

    this.reset = function() {
        this.stop();
        this.elapsedTime = 0;
        this.updateDisplay();
    };

    this.updateDisplay = function() {
        const display = document.getElementById('timer');
        const seconds = Math.floor((this.elapsedTime / 1000) % 60);
        const minutes = Math.floor((this.elapsedTime / (1000 * 60)) % 60);
        display.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };
}