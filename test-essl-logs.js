const ESSL_URL = "http://27.116.54.3:83/iclock/webapiservice.asmx?op=GetTransactionsLog";

const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetTransactionsLog xmlns="http://tempuri.org/">
      <FromDateTime>2024-01-01 00:00:00</FromDateTime>
      <ToDateTime>2026-12-31 23:59:59</ToDateTime>
      <SerialNumber>NFZ8245102868</SerialNumber>
      <UserName>aspireedu</UserName>
      <UserPassword>Aspire@123</UserPassword>
      <strDataList></strDataList>
    </GetTransactionsLog>
  </soap12:Body>
</soap12:Envelope>`;

async function test() {
  try {
    const response = await fetch(ESSL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8"
      },
      body: soapEnvelope
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch(e) {
    console.error(e);
  }
}

test();
