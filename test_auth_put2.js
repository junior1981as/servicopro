const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@servicopro.local',
  senha: '123456',
  tenantId: 't-oficina-01'
});

const loginOptions = {
  hostname: '127.0.0.1',
  port: 7771,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const { accessToken } = JSON.parse(body);
      
      const putData = JSON.stringify({
        id: "673a1a76-7cf3-4eee-b70d-86438ed8afb1",
        tenantId: "t-oficina-01",
        codigo: "teste",
        descricao: "teste",
        ativo: true,
        parcelas: [
          {
            "numeroParcela": 1,
            "diasVencimento": 30,
            "porcentagemValor": 100,
            "taxaOuDesconto": 0
          }
        ]
      });

      const putOptions = {
        hostname: '127.0.0.1',
        port: 7771,
        path: '/api/cadastros/formaspagamento/673a1a76-7cf3-4eee-b70d-86438ed8afb1',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': putData.length,
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const putReq = http.request(putOptions, (res) => {
        let putBody = '';
        res.on('data', chunk => putBody += chunk);
        res.on('end', () => {
          console.log(`PUT STATUS: ${res.statusCode}`);
          console.log(`PUT BODY: ${putBody}`);
        });
      });
      putReq.write(putData);
      putReq.end();
    } catch(e) {
      console.log('Error parsing login response', body);
    }
  });
});
loginReq.write(loginData);
loginReq.end();
