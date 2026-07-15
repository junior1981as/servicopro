const http = require('http');

const data = JSON.stringify({
  id: "46f881b2-132a-4db3-ae58-29532bebfcf4",
  tenantId: "t-oficina-01",
  codigo: "teste",
  descricao: "teste desc",
  ativo: true,
  parcelas: []
});

const options = {
  hostname: '127.0.0.1',
  port: 7771,
  path: '/api/cadastros/formaspagamento/46f881b2-132a-4db3-ae58-29532bebfcf4',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-tenant-id': 't-oficina-01'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(`BODY: ${body}`));
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
