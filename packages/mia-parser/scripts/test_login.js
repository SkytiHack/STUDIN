const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
  const baseUrl = 'https://mia1.knute.edu.ua';
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  };

  const loginPage = await axios.get(baseUrl + '/login', { headers: defaultHeaders });
  const cookies = loginPage.headers['set-cookie'] || [];
  const $ = cheerio.load(loginPage.data);
  const csrfToken = $('meta[name="csrf-token"]').attr('content');
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');

  console.log('CSRF:', csrfToken);
  console.log('Initial cookies:', cookieStr);

  const params = new URLSearchParams();
  params.append('_csrf-frontend', csrfToken);
  params.append('LoginForm[username]', 'test');
  params.append('LoginForm[password]', 'test');
  params.append('LoginForm[rememberMe]', '0');

  try {
    const loginRes = await axios.post(baseUrl + '/login', params.toString(), {
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieStr,
        'Referer': baseUrl + '/login'
      },
      maxRedirects: 0,
      validateStatus: s => s < 400
    });
    console.log('Login Status:', loginRes.status);
    console.log('Login Headers:', loginRes.headers['set-cookie']);
  } catch(e) {
    console.log('Error', e.message);
  }
})();
