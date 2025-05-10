const assetForms = [
    "create-other-asset-form",
    "create-saving-asset-form",
    "create-stock-asset-form"
];

/**
 * resetAll asset creation forms
 */
function resetAll() {
    document.getElementById("dropdown-icon-button").innerHTML = `
        <img src="/static/svgs/icons/Other.svg" class="h-4 w-4 me-2" alt="Other"> Other
        <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    `;
    document.getElementById("create-other-asset-form").reset();
    document.getElementById("create-saving-asset-form").reset();
    document.getElementById("create-stock-asset-form").reset();
}

/**
 * selectAssetForm changes which form is displayed
 * to create specified assets.
 * @param {string} assetFormId
 */
function selectAssetForm(assetFormId) {
    for (let i = 0; i < assetForms.length; i++) {
        if (assetForms[i] == assetFormId) {
            document.getElementById(assetFormId).style.display = "block";
        } else {
            document.getElementById(assetForms[i]).style.display = "none";
        }
    }
}

/**
 * resetRadio to default to other asset type.
 */
function resetRadio() {
    document.getElementById("asset-other").checked = true;
    document.getElementById("asset-saving").checked = false;
    document.getElementById("asset-stock").checked = false;
}

const assetKeys = {
    other: [
        "name",
        "dropdown-icon-button",
        "value",
        "description",
        "purchaseDate",
    ],
    saving: [
        "name",
        "value",
    ],
    stock: [
        "ticker",
        "price",
        "quantity",
        "purchaseDate",
    ],
}

/**
 * lockAsset prevents edits to asset view modal
 * @param {string} assetId
 * @param {string} icon to defualt to
 */
function lockAsset(assetId, icon) {
    let dropdown = document.getElementById(`dropdown-icon-button-${assetId}`);
    if (dropdown) dropdown.innerHTML = `
        <img src="/static/svgs/icons/${icon}.svg" class="h-4 w-4 me-2" alt="${icon}"> ${icon}
        <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    `;

    document.getElementById(`${assetId}-form`).reset();

    const type = document.getElementById(`type-${assetId}`).value;

    assetKeys[type].forEach((key) => {
        document.getElementById(`${key}-${assetId}`).disabled = true;
    });

    document.getElementById(`save-${assetId}`).disabled = true;
    document.getElementById(`save-${assetId}`).classList.remove("cursor-pointer");
    document.getElementById(`save-${assetId}`).classList.add("cursor-not-allowed");

    document.getElementById(`edit-${assetId}`).innerHTML = "Edit";
    document.getElementById(`edit-${assetId}`).onclick = () => { unlockAsset(assetId, icon) };
}

/**
 * unlockAsset allows edits to asset view modal
 * @param {string} assetId
 * @param {string} icon to defualt to
 */
function unlockAsset(assetId, icon) {
    const type = document.getElementById(`type-${assetId}`).value;

    assetKeys[type].forEach((key) => {
        document.getElementById(`${key}-${assetId}`).disabled = false;
    });

    document.getElementById(`save-${assetId}`).disabled = false;
    document.getElementById(`save-${assetId}`).classList.remove("cursor-not-allowed");
    document.getElementById(`save-${assetId}`).classList.add("cursor-pointer");

    document.getElementById(`edit-${assetId}`).innerHTML = "Cancel";
    document.getElementById(`edit-${assetId}`).onclick = () => { lockAsset(assetId, icon) };
}

/**
 * autoOpenCreate checks if popup param
 * in url to auto open create popup
 */
function autoOpenCreate() {
    const query = window.location.search;
    const params = new URLSearchParams(query);

    if (params.has("popup")) {
        document.getElementById('create-asset-modal').showModal();
    }
}

/**
 * selectIcon updated selected icon while creating
 * or modifying assets.
 * @param {button element} selectedIcon
 * @param {string} assetId
 */
function selectIcon(selectedIcon, assetId="") {
    document.getElementById(`dropdown-icon-button${assetId != "" ? "-" : ""}${assetId}`).value = selectedIcon.value;
    document.getElementById(`icon${assetId != "" ? "-" : ""}${assetId}`).value = selectedIcon.value

    document.getElementById(`dropdown-icon-button${assetId != "" ? "-" : ""}${assetId}`).innerHTML = selectedIcon.innerHTML + 
    `
        <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    `;
}

resetRadio();
autoOpenCreate();
