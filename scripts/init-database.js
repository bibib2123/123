const { Pool } = require('pg');
require('dotenv').config({ path: '../config.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initDatabase() {
  try {
    // Создание таблицы пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        driver_license VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы автомобилей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        color VARCHAR(50) NOT NULL,
        price_per_day DECIMAL(10,2) NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы заявок
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Добавление тестовых автомобилей
    await pool.query(`
      INSERT INTO cars (brand, model, year, color, price_per_day) VALUES
      ('Toyota', 'Camry', 2022, 'Белый', 2500.00),
      ('Honda', 'Civic', 2021, 'Серебристый', 2000.00),
      ('BMW', 'X5', 2023, 'Черный', 4500.00),
      ('Mercedes', 'C-Class', 2022, 'Синий', 3500.00),
      ('Audi', 'A4', 2021, 'Красный', 3000.00),
      ('Volkswagen', 'Passat', 2022, 'Серый', 2200.00)
      ON CONFLICT DO NOTHING
    `);

    console.log('База данных успешно инициализирована!');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  } finally {
    await pool.end();
  }
}

initDatabase(); 