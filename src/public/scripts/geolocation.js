function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getLatestExchange, error);
    }
}

function update(data) {
    document.getElementById("loading").style = "display: none";
    document.getElementById("currencyExchange").style = "display: flex";

    document.getElementById("yourFlag").src = `/static/svgs/flags/${data.data.country}.svg`
    document.getElementById("yourFlag").alt = data.data.country;
    document.getElementById("flagTag").innerHTML = `(${data.data.country})`;

    document.getElementById("exchangeFlag").src = `/static/svgs/flags/USD.svg`;
    document.getElementById("exchangeFlag").alt = "USD";
    document.getElementById("exFlagTag").innerHTML = "(USD)";
    
    document.getElementById("dropdown-country-button").value = data.data.toCurrencyRates["USD"];

    updateExchange(document.getElementById("dropdown-country-button").value);

    const dropdown = document.getElementById("dropdown");
    let countries = Object.keys(data.data.toCurrencyRates);

    countries.forEach(item => {
        if (dropdown.querySelector(`button[value="${data.data.toCurrencyRates[item]}"]`)) {
            return;
        }

        const listItem = document.createElement("li");
        listItem.innerHTML  = `<button onclick="switchButton(this)" type="button" value="${data.data.toCurrencyRates[item]}" class="country Button inline-flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white" role="menuitem">
                    <span class="inline-flex items-center">
                        <img src="/static/svgs/flags/${item}.svg" class="h-4 w-4 me-2" alt="${item}"> (${item})
                    </span>
                </button>`;

        dropdown.appendChild(listItem);
    });
}

function switchButton(clickedButton) {
    document.getElementById("dropdown-country-button").value = clickedButton.value;
    updateExchange(document.getElementById("dropdown-country-button").value);

    document.getElementById("dropdown-country-button").innerHTML = clickedButton.innerHTML + 
    `
        <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    `;
}

function updateExchange(exRate) {
    document.getElementById("exchange").innerHTML = "$1.00 = $" +`${(1 * exRate).toFixed(2)}`;
}

async function getLatestExchange(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    const res = await fetch(`/exRates/${lat}/${lon}`);
    const data = await res.json();

    update(data);
}

function error(err) {
    console.error("Geolocation error: ", err);
}