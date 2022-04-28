// Write your answer here
const fs = require('fs');
const readline = require('readline');
const https = require('https');

const API_KEY = 'f86224799f74ed15a2eb6f2f7e13e4f3a91deac6c8f703fa8e2edef7593c0411';

const getPorfolio = () => {
  return new Promise((resolve, reject) => {
    var portfolio = {};
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream('./data/transactions.csv'),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        const columns = line.split(',');
        const timestamp = columns[0]
        const transaction_type = columns[1]
        const token = columns[2]
        const amount = columns[3]

        // ignore the first record
        if (timestamp != 'timestamp') {
          if (!portfolio[token]) {
            portfolio[token] = 0;
          }
          if (transaction_type == 'DEPOSIT') {
            portfolio[token] += +amount;
          } else {
            portfolio[token] -= +amount;
          }
        }
      });

      rl.on('close', function () {
        resolve(portfolio)
      });
    } catch (err) {
      console.error(err);
    }
  })
}


const fetchAPI = (token) => {
  return new Promise((resolve, reject) => {
    const url = `https://min-api.cryptocompare.com/data/price?fsym=${token}&tsyms=USD&api_key=${API_KEY}`;
    https.get(url, {}, (res) => {
      let body = [];
      let price = 0;
      res.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        price = JSON.parse(body).USD;
        resolve({
          token,
          price
        });
      });

    }).on('error', (e) => {
      console.log(61, e);
      reject({
        token,
        error
      });
    });
  });
}

const fetchExchangeRates = (tokens = []) => {
  const arrPromises = [];
  tokens.forEach(token => {
    arrPromises.push(fetchAPI(token))
  })

  return Promise.allSettled(arrPromises);
}

(async function main() {
  const portfolio = await getPorfolio();
  const tokens = Object.keys(portfolio);
  fetchExchangeRates(tokens)
    .then((results) => {
      let totalBalance = 0;
      results.forEach((result) => {
        if (result.status == 'fulfilled') {
          const data = result.value;
          const balance = portfolio[data.token] * data.price
          console.log(`${data.token} : ${portfolio[data.token]}`);
          console.log(`Balance : ${balance.toFixed(2)} USD`);
          totalBalance += balance;
        } else {
          console.log(result.value.token, ' : ', portfolio[result.value.token]);
        }
      });

      console.log(`Total Balance : ${totalBalance.toFixed(2)} USD`);
    });
})();

