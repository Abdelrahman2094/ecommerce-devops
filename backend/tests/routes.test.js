const request = require('supertest');
const app     = require('../server');

test('POST /api/auth/register returns 400 with missing fields', async () => {
  const res = await request(app).post('/api/auth/register').send({});
  expect(res.status).toBe(400);
});

test('POST /api/auth/login returns 401 with wrong password', async () => {
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'nobody@test.com', password: 'wrongpass' });
  expect(res.status).toBe(401);
});

test('GET /api/products returns 200 without auth', async () => {
  const res = await request(app).get('/api/products');
  expect(res.status).toBe(200);
});

test('POST /api/products returns 401 without token', async () => {
  const res = await request(app).post('/api/products')
    .send({ name: 'Test', price: 9.99 });
  expect(res.status).toBe(401);
});