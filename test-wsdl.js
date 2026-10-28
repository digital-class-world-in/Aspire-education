const http = require('http');

const options = {
  hostname: '27.116.54.3',
  port: 83,
  path: '/iclock/webapiservice.asmx?WSDL',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Got WSDL length:", data.length);
    const fs = require('fs');
    fs.writeFileSync('wsdl.txt', data);
    console.log("Saved to wsdl.txt");
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
