const axios = require('axios');
const xml2js = require('xml2js');

async function testAddEmployee() {
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <AddEmployee xmlns="http://tempuri.org/">
      <APIKey></APIKey>
      <EmployeeCode>TEST1001</EmployeeCode>
      <EmployeeName>Test Student</EmployeeName>
      <CardNumber></CardNumber>
      <SerialNumber>NFZ8245102868</SerialNumber>
      <UserName>aspireedu</UserName>
      <UserPassword>Aspire@123</UserPassword>
      <CommandId>99999</CommandId>
    </AddEmployee>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await axios.post('http://27.116.54.3:83/iclock/webapiservice.asmx?op=AddEmployee', soapEnvelope, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8'
      }
    });
    console.log('Response status:', response.status);
    console.log('Response body:', response.data);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Error body:', err.response.data);
    }
  }
}

testAddEmployee();
