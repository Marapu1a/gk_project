import net from 'net';

const host = 'smtp.yandex.ru';
const port = 587;

console.log(`🔌 Попытка соединения с ${host}:${port}...`);

const socket = net.createConnection(port, host);

socket.setTimeout(5000);

socket.on('connect', () => {
  console.log('✅ Успешно подключено! SMTP доступен.');
  socket.end();
});

socket.on('timeout', () => {
  console.error('⏱️ Таймаут: соединение не установлено (скорее всего, порт заблокирован)');
  socket.destroy();
});

socket.on('error', (err) => {
  console.error('❌ Ошибка подключения:', err.message);
});
