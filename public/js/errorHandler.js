export function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

export function hideError() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}