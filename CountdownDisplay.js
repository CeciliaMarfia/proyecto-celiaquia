export class CountdownDisplay {
    constructor() {
        this.timeCounter = document.getElementById('time-counter');
        this.timeDisplay = document.getElementById('time-display');

        this.baseStyles = {
            zIndex: '9999',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2rem 4rem',
            borderRadius: '20px',
            fontSize: '4rem',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        };
    }

    show(time) {
        this.timeDisplay.textContent = time;
        Object.assign(this.timeCounter.style, this.baseStyles, {
            visibility: 'visible',
            display: 'block',
        });
    }

    hide() {
        Object.assign(this.timeCounter.style, {
            visibility: 'hidden',
            display: 'none',
        });
    }
}  