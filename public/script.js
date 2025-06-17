// Глобальные переменные
let currentUser = null;
let isAdmin = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupMobileMenu();
    setupFormValidation();
    checkAuthStatus();
});

// Инициализация приложения
function initializeApp() {
    // Добавляем анимации при скролле
    setupScrollAnimations();
    
    // Настраиваем обработчики событий
    setupEventListeners();
}

// Настройка мобильного меню
function setupMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
}

// Настройка анимаций при скролле
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Наблюдаем за элементами
    document.querySelectorAll('.feature-card, .step-card').forEach(el => {
        observer.observe(el);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик для кнопки выхода
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Обработчики для форм
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleNewBooking);
    }
}

// Настройка валидации форм
function setupFormValidation() {
    // Валидация телефона
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 1) {
                value = '8(' + value.substring(1);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + ')-' + value.substring(5);
            }
            if (value.length >= 9) {
                value = value.substring(0, 9) + '-' + value.substring(9);
            }
            if (value.length >= 12) {
                value = value.substring(0, 12) + '-' + value.substring(12);
            }
            e.target.value = value.substring(0, 15);
        });
    });

    // Валидация пароля
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const password = e.target.value;
            const hasNumber = /\d/.test(password);
            const isValidLength = password.length >= 3;
            
            if (!hasNumber || !isValidLength) {
                e.target.classList.add('error');
            } else {
                e.target.classList.remove('error');
            }
        });
    });
}

// Проверка статуса авторизации
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            currentUser = data;
            isAdmin = data.isAdmin;
            updateNavigation();
            
            // Загружаем данные в зависимости от страницы
            const currentPage = window.location.pathname;
            if (currentPage === '/bookings') {
                loadUserBookings();
            } else if (currentPage === '/admin') {
                loadAdminBookings();
            } else if (currentPage === '/new-booking') {
                loadCars();
            }
        } else {
            updateNavigation();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
    }
}

// Обновление навигации
function updateNavigation() {
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const bookingsLink = document.getElementById('bookings-link');
    const adminLink = document.getElementById('admin-link');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (bookingsLink) bookingsLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        
        if (isAdmin && adminLink) {
            adminLink.style.display = 'inline-block';
        }
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (registerLink) registerLink.style.display = 'inline-block';
        if (bookingsLink) bookingsLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        password: formData.get('password'),
        driverLicense: formData.get('driverLicense')
    };

    // Валидация
    if (!validateRegistrationData(data)) {
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Регистрация успешна! Теперь вы можете войти в систему.', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка сервера. Попробуйте позже.', 'error');
    }
}

// Валидация данных регистрации
function validateRegistrationData(data) {
    const phoneRegex = /^8\(\d{3}\)-\d{3}-\d{2}-\d{2}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!data.fullName || !data.phone || !data.email || !data.password || !data.driverLicense) {
        showMessage('Все поля обязательны для заполнения', 'error');
        return false;
    }

    if (!phoneRegex.test(data.phone)) {
        showMessage('Неверный формат телефона', 'error');
        return false;
    }

    if (!emailRegex.test(data.email)) {
        showMessage('Неверный формат email', 'error');
        return false;
    }

    if (data.password.length < 3 || !/\d/.test(data.password)) {
        showMessage('Пароль должен содержать минимум 3 символа и хотя бы одну цифру', 'error');
        return false;
    }

    return true;
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            if (result.isAdmin) {
                window.location.href = '/admin';
            } else {
                window.location.href = '/bookings';
            }
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка сервера. Попробуйте позже.', 'error');
    }
}

// Обработка выхода
async function handleLogout() {
    try {
        await fetch('/api/logout', {
            method: 'POST'
        });
        
        currentUser = null;
        isAdmin = false;
        window.location.href = '/';
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Загрузка заявок пользователя
async function loadUserBookings() {
    const container = document.getElementById('bookings-container');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch('/api/bookings');
        const bookings = await response.json();

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>У вас пока нет заявок</h3>
                    <p>Создайте свою первую заявку на бронирование автомобиля</p>
                    <a href="/new-booking" class="btn btn-primary">Создать заявку</a>
                </div>
            `;
        } else {
            displayBookings(bookings, container);
        }
    } catch (error) {
        container.innerHTML = '<p class="error-message">Ошибка загрузки заявок</p>';
    }
}

// Загрузка всех заявок для админа
async function loadAdminBookings() {
    const container = document.getElementById('admin-bookings-container');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch('/api/admin/bookings');
        const bookings = await response.json();

        if (bookings.length === 0) {
            container.innerHTML = '<p>Заявок пока нет</p>';
        } else {
            displayAdminBookings(bookings, container);
        }
    } catch (error) {
        container.innerHTML = '<p class="error-message">Ошибка загрузки заявок</p>';
    }
}

// Отображение заявок пользователя
function displayBookings(bookings, container) {
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Автомобиль</th>
                    <th>Дата бронирования</th>
                    <th>Статус</th>
                    <th>Дата создания</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.brand} ${booking.model} (${booking.color})</td>
                        <td>${formatDate(booking.booking_date)}</td>
                        <td><span class="status-badge status-${booking.status}">${getStatusText(booking.status)}</span></td>
                        <td>${formatDate(booking.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Отображение заявок для админа
function displayAdminBookings(bookings, container) {
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>ФИО</th>
                    <th>Телефон</th>
                    <th>Email</th>
                    <th>Автомобиль</th>
                    <th>Дата бронирования</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.full_name}</td>
                        <td>${booking.phone}</td>
                        <td>${booking.email}</td>
                        <td>${booking.brand} ${booking.model} (${booking.color})</td>
                        <td>${formatDate(booking.booking_date)}</td>
                        <td><span class="status-badge status-${booking.status}">${getStatusText(booking.status)}</span></td>
                        <td>
                            ${booking.status === 'new' ? `
                                <button class="action-btn btn-confirm" onclick="changeBookingStatus(${booking.id}, 'confirmed')">
                                    Подтвердить
                                </button>
                                <button class="action-btn btn-reject" onclick="changeBookingStatus(${booking.id}, 'rejected')">
                                    Отклонить
                                </button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Изменение статуса заявки
async function changeBookingStatus(bookingId, status) {
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Статус заявки изменен', 'success');
            loadAdminBookings(); // Перезагружаем таблицу
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка изменения статуса', 'error');
    }
}

// Загрузка автомобилей
async function loadCars() {
    const select = document.getElementById('car-select');
    if (!select) return;

    try {
        const response = await fetch('/api/cars');
        const cars = await response.json();

        select.innerHTML = '<option value="">Выберите автомобиль</option>';
        cars.forEach(car => {
            const option = document.createElement('option');
            option.value = car.id;
            option.textContent = `${car.brand} ${car.model} (${car.year}, ${car.color}) - ${car.price_per_day} ₽/день`;
            select.appendChild(option);
        });
    } catch (error) {
        showMessage('Ошибка загрузки автомобилей', 'error');
    }
}

// Обработка создания новой заявки
async function handleNewBooking(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        carId: formData.get('carId'),
        bookingDate: formData.get('bookingDate')
    };

    if (!data.carId || !data.bookingDate) {
        showMessage('Все поля обязательны для заполнения', 'error');
        return;
    }

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Заявка успешно создана!', 'success');
            setTimeout(() => {
                window.location.href = '/bookings';
            }, 2000);
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка создания заявки', 'error');
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function getStatusText(status) {
    const statusMap = {
        'new': 'Новое',
        'confirmed': 'Подтверждено',
        'rejected': 'Отклонено'
    };
    return statusMap[status] || status;
}

function showMessage(message, type) {
    // Удаляем существующие сообщения
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    if (type === 'success') {
        messageDiv.style.backgroundColor = '#38a169';
    } else {
        messageDiv.style.backgroundColor = '#e53e3e';
    }

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Утилиты для анимаций
function animateElement(element, animation) {
    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.animation = animation;
} 