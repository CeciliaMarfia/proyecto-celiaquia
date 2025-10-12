export class CountdownDisplay {
    constructor() {
        // Contador 3,2,1... (C1)
        this.countdownOverlay = document.getElementById('time-counter');
        this.countdownDisplay = document.getElementById('time-display');

        // Contador de  etapa (C2)
        this.stageTimer = document.getElementById('stage-timer');
        this.timerValue = document.getElementById('timer-value');
    }

    // C1
    showInitialCountdown(time) {
        this.countdownDisplay.textContent = time;
        this.countdownOverlay.style.display = 'block';
    }

    // C1
    hideInitialCountdown() {
        this.countdownOverlay.style.display = 'none';
    }

    // C2
    showStageTimer() {
        if (this.stageTimer) {
            this.stageTimer.style.display = 'flex';
        }
    }

    // C2
    hideStageTimer() {
        if (this.stageTimer) {
            this.stageTimer.style.display = 'none';
            this.stageTimer.classList.remove('warning');
        }
    }

    // Actualiza C2
    updateStageTime(milliseconds) {
        if (!this.timerValue) return;

        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Formato tipo MM:SS
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.timerValue.textContent = formattedTime;

        // Agrega clase de advertencia cuando quedan 10 segundos o menos
        if (totalSeconds <= 10 && totalSeconds > 0) {
            this.stageTimer.classList.add('warning');
        } else {
            this.stageTimer.classList.remove('warning');
        }
    }

    show(time) {
        this.showInitialCountdown(time);
    }

    hide() {
        this.hideInitialCountdown();
    }
}  