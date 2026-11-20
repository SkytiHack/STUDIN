const axios = require('axios');
const qs = require('qs');

async function test() {
  try {
    const res = await axios.post('https://mia.mobil.knute.edu.ua/time-table/group', qs.stringify({
      facultyId: 5,
      course: 2,
      groupId: 4001, // whatever
      dateStart: '2024-09-16',
      dateEnd: '2024-09-20'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(res.status);
    console.log(JSON.stringify(res.data).substring(0, 500));
  } catch (e) {
    console.error(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
  }
}
test();
