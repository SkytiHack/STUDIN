const oldCookies = ['_csrf-frontend=123; path=/', 'PHPSESSID=aaa; path=/'];
const newCookies = ['PHPSESSID=bbb; path=/', '_identity-frontend=ccc; path=/'];

function mergeCookies(oldC, newC) {
    const map = new Map();
    [...oldC, ...newC].forEach(c => {
      const pair = c.split(';')[0];
      const eqIdx = pair.indexOf('=');
      if (eqIdx > -1) {
        map.set(pair.substring(0, eqIdx).trim(), pair.substring(eqIdx + 1));
      }
    });
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

console.log(mergeCookies(oldCookies, newCookies));
