/**
 * Main JavaScript for CryptoStream landing page
 * Version: 2023
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('CryptoStream landing page initialized - 2023 version');

    // Navigation active state
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Add animation for cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
        });
        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
        });
    });
});
