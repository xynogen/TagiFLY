// TagiFLY Notification System Module
// Kullanıcı bildirimleri için

export class NotificationManager {
    static show(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Smooth animation için requestAnimationFrame kullan
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    static success(message) { 
        this.show(message, 'success'); 
    }

    static error(message) { 
        this.show(message, 'error'); 
    }

    static info(message) { 
        this.show(message, 'info'); 
    }
}
