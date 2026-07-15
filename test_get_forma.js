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
      
      const getOptions = {
        hostname: '127.0.0.1',
        port: 7771,
        path: '/api/cadastros/formaspagamento',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const getReq = http.request(getOptions, (res) => {
        let getBody = '';
        res.on('data', chunk => getBody += chunk);
        res.on('end', () => {
          console.log(`GET BODY: ${getBody}`);
        });
      });
      getReq.end();
    } catch(e) {
      console.log('Error parsing login response', body);
    }
  });
});
loginReq.write(loginData);
loginReq.end();
