const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к базе данных
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Требуется авторизация' });
  }
};

// Middleware для проверки админских прав
const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Доступ запрещен' });
  }
};

// Маршруты API

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, phone, email, password, driverLicense } = req.body;

    // Валидация
    if (!fullName || !phone || !email || !password || !driverLicense) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверка формата телефона
    const phoneRegex = /^8\(\d{3}\)-\d{3}-\d{2}-\d{2}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Неверный формат телефона' });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }

    // Проверка пароля
    if (password.length < 3 || !/\d/.test(password)) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 3 символа и хотя бы одну цифру' });
    }

    // Проверка уникальности email
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await pool.query(
      'INSERT INTO users (full_name, phone, email, password, driver_license) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [fullName, phone, email, hashedPassword, driverLicense]
    );

    res.json({ success: true, userId: result.rows[0].id });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Авторизация
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Проверка админских учетных данных
    if (email === 'car' && password === 'carforme') {
      req.session.isAdmin = true;
      req.session.userId = 'admin';
      return res.json({ success: true, isAdmin: true });
    }

    // Поиск пользователя
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    req.session.userId = user.id;
    req.session.isAdmin = false;
    res.json({ success: true, isAdmin: false, user: { id: user.id, fullName: user.full_name, email: user.email } });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Получение автомобилей
app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE is_available = true ORDER BY brand, model');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения автомобилей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение заявок пользователя
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.brand, c.model, c.color, c.price_per_day, u.full_name, u.phone, u.email
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      JOIN users u ON b.user_id = u.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [req.session.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание заявки
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { carId, bookingDate } = req.body;

    if (!carId || !bookingDate) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверка доступности автомобиля на указанную дату
    const existingBooking = await pool.query(`
      SELECT id FROM bookings 
      WHERE car_id = $1 AND booking_date = $2 AND status IN ('new', 'confirmed')
    `, [carId, bookingDate]);

    if (existingBooking.rows.length > 0) {
      return res.status(400).json({ error: 'Автомобиль уже забронирован на эту дату' });
    }

    // Создание заявки
    const result = await pool.query(
      'INSERT INTO bookings (user_id, car_id, booking_date) VALUES ($1, $2, $3) RETURNING id',
      [req.session.userId, carId, bookingDate]
    );

    res.json({ success: true, bookingId: result.rows[0].id });
  } catch (error) {
    console.error('Ошибка создания заявки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Админские маршруты

// Получение всех заявок (для админа)
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.brand, c.model, c.color, c.price_per_day, u.full_name, u.phone, u.email
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменение статуса заявки
app.put('/api/admin/bookings/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    // Проверка, что заявка имеет статус "new"
    const booking = await pool.query('SELECT status FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (booking.rows[0].status !== 'new') {
      return res.status(400).json({ error: 'Можно изменить только заявки со статусом "новое"' });
    }

    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка изменения статуса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка авторизации
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      isAuthenticated: true, 
      isAdmin: req.session.isAdmin || false,
      userId: req.session.userId 
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Маршруты для статических страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bookings.html'));
});

app.get('/new-booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new-booking.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 