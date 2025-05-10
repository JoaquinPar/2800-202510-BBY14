const countries = require("./countries.json").countries;

async function getRates(country) {
    let abbr;
    countries.forEach(c => {
        if (c.country === country) {
            abbr = c.currency_abbreviation;
        }
    });

    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${abbr}`);
    const data = await res.json();
    let rates = data.rates;

    return { exRates: rates, abbreviation: abbr };
}

module.exports = getRates;