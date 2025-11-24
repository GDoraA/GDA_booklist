
/********** API URL **********/
const API_URL = "https://script.google.com/macros/s/AKfycbw4E4-yf_MhRZ8E744wyJpGW4WlzYZuJ3JUrLokEPRnHSbf0-yZvOPP85Z7ib3JVIpPUg/exec";

/********** OLDALVÁLTÁS **********/
function mutat(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";

    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    const tabBtn = document.getElementById("tab_" + id);
    if (tabBtn) tabBtn.classList.add("active");

    if (id === "lista") betoltesLista();
}

/********** LOG **********/
function log(msg) {
    const l = document.getElementById("log");
    const now = new Date().toLocaleTimeString();
    l.innerHTML += "[" + now + "] " + msg + "<br>";
    l.scrollTop = l.scrollHeight;
}

/********** BASE64 **********/
function fileToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
}

/********** DATALIST TÖLTÉS BACKENDBŐL **********/
function loadDropdownLists() {
    const url = API_URL +
        "?action=getUniqueLists" +
        "&callback=dropdownListsCallback&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function dropdownListsCallback(data) {
    fillDatalist(document.getElementById("authors_list_modal"), data.authors, "Author");
    fillDatalist(document.getElementById("series_list_modal"), data.series, "Series");

    // Szűrőmezők datalist feltöltése
    fillDatalist(document.getElementById("authors_list_filter"), data.authors, "Author");
    fillDatalist(document.getElementById("series_list_filter"), data.series, "Series");

    // fuzzy keresés modal mezőkben
    enableFuzzyDatalist("bm_szerzo", "authors_list_modal");
    enableFuzzyDatalist("bm_sorozat", "series_list_modal");

    // pulse animáció
    document.getElementById("bm_szerzo").classList.add("pulse");
    document.getElementById("bm_sorozat").classList.add("pulse");

    setTimeout(() => {
        document.getElementById("bm_szerzo").classList.remove("pulse");
        document.getElementById("bm_sorozat").classList.remove("pulse");
    }, 700);

    // 🔥 Fuzzy keresés a SZŰRŐ mezőkre
    enableFuzzyDatalist("ls_szerzo", "authors_list_filter");
    enableFuzzyDatalist("ls_sorozat", "series_list_filter");
}


function fillDatalist(dl, list, key) {
    dl.innerHTML = "";

    // Értékek kigyűjtése
    let values = (list || [])
        .map(item => item[key])
        .filter(v => v && v.trim() !== "");

    // Duplikátumok eltávolítása
    values = [...new Set(values)];

    // ABC sorrend ékezethelyesen (magyar szabályok)
    values.sort((a, b) =>
        a.localeCompare(b, "hu", { sensitivity: "accent" })
    );

    // Datalist feltöltése
    values.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        dl.appendChild(opt);
    });
}

/********** MODAL – közös űrlap **********/
let modalMode = "new";      // "new" vagy "edit"
let modalPending = null;    // { bookData, manualUrl }

function openBookModal(mode, id) {
    setTimeout(loadDropdownLists, 50);
    modalMode = mode || "new";
    modalPending = null;
    document.getElementById("bm_file").value = "";

    if (modalMode === "new") {
        document.getElementById("modalTitle").textContent = "Új könyv felvétele";
        document.getElementById("bm_id").value = "";
        document.getElementById("bm_existing_url").value = "";
        document.getElementById("bm_szerzo").value = "";
        document.getElementById("bm_cim").value = "";
        document.getElementById("bm_eredeti").value = "";
        document.getElementById("bm_korabbi").value = "";
        document.getElementById("bm_sorozat").value = "";
        document.getElementById("bm_ssz").value = "";
        document.getElementById("bm_ev").value = "";
        document.getElementById("bm_url").value = "";
        document.getElementById("bm_purchased").checked = false;
        document.getElementById("bm_forsale").checked = false;
        document.getElementById("bm_ar").value      = "";
        document.getElementById("bm_megjegy").value = "";


        const img = document.getElementById("bm_preview");
        img.style.display = "none";
        img.src = "";
    } else {
        document.getElementById("modalTitle").textContent = "Könyv szerkesztése";

        const item = lista.find(x => x["ID"] === id);
        if (!item) {
            alert("A rekord nem található.");
            return;
        }

        document.getElementById("bm_id").value = item["ID"] || "";
        document.getElementById("bm_existing_url").value = item["URL"] || "";

        document.getElementById("bm_szerzo").value   = item["Author"] || "";
        document.getElementById("bm_cim").value      = item["Title"] || "";
        document.getElementById("bm_eredeti").value  = item["Original_Title"] || "";
        document.getElementById("bm_korabbi").value  = item["Previous_Title"] || "";
        document.getElementById("bm_sorozat").value  = item["Series"] || "";
        document.getElementById("bm_ssz").value      = item["Number"] || "";
        document.getElementById("bm_ev").value       = item["Year"] || "";
        document.getElementById("bm_url").value      = item["URL"] || "";
        document.getElementById("bm_purchased").checked = (item["Purchased"] === "x");
        document.getElementById("bm_forsale").checked   = (item["For_sale"] === "x");
        document.getElementById("bm_ar").value      = item["Price"] || "";
        document.getElementById("bm_megjegy").value = item["Comment"] || "";

        const img = document.getElementById("bm_preview");
        if (item["URL"]) {
            img.src = item["URL"];
            img.style.display = "block";
        } else {
            img.style.display = "none";
            img.src = "";
        }
    }

    document.getElementById("bookModal").style.display = "flex";
}

function closeBookModal() {
    document.getElementById("bookModal").style.display = "none";
}

/********** MODAL – mentés logika **********/
function saveBookFromModal() {
    log("Könyv mentése modalból...");

    const szerzo = document.getElementById("bm_szerzo").value.trim();
    const cim    = document.getElementById("bm_cim").value.trim();

    if (!szerzo || !cim) {
        alert("A Szerző és a Cím mező kitöltése kötelező.");
        return;
    }

    const bookData = {
        Author:         szerzo,
        Title:          document.getElementById("bm_cim").value.trim(),
        Original_Title: document.getElementById("bm_eredeti").value.trim(),
        Previous_Title: document.getElementById("bm_korabbi").value.trim(),
        Series:         document.getElementById("bm_sorozat").value.trim(),
        Number:         document.getElementById("bm_ssz").value.trim(),
        Year:           document.getElementById("bm_ev").value.trim(),
        Purchased:      document.getElementById("bm_purchased").checked ? "x" : "",
        For_sale:       document.getElementById("bm_forsale").checked ? "x" : "",
        Price:    document.getElementById("bm_ar").value.trim(),
        Comment:  document.getElementById("bm_megjegy").value.trim()

    };

    const manualUrl = document.getElementById("bm_url").value.trim();
    modalPending = { bookData, manualUrl };

    const file = document.getElementById("bm_file").files[0];
    if (file) {
        fileToBase64(file, base64 => uploadImageOnlyForModal(base64, file.name));
    } else {
        finalizeSaveBook(manualUrl || document.getElementById("bm_existing_url").value || "");
    }
}

function uploadImageOnlyForModal(base64, filename) {

    log("DEBUG: uploadImageOnlyForModal called (" + filename + ")");

    const url = API_URL +
        "?action=uploadImageOnly" +
        "&base64=" + encodeURIComponent(base64) +
        "&filename=" + encodeURIComponent(filename) +
        "&callback=uploadImageOnlyForModalValasz";

    const s = document.createElement("script");
    s.src = url + "&_=" + Date.now(); // cache elkerülése
    s.onerror = () => {
        log("❌ JSONP betöltési hiba");
    };
    document.body.appendChild(s);
}




function uploadImageOnlyForModalValasz(data) {
    if (!data.success) {
        log("❌ Képfeltöltés hiba (modal): " + data.error);
        alert("Nem sikerült feltölteni a képet: " + (data.error || ""));
        return;
    }
    const kepUrl = data.url || (modalPending ? modalPending.manualUrl : "");
    finalizeSaveBook(kepUrl);
}

function finalizeSaveBook(kepUrl) {
    if (!modalPending) return;

    const d = modalPending.bookData;
    const id = document.getElementById("bm_id").value;

    // előnézeti kép frissítése
    const img = document.getElementById("bm_preview");
    if (kepUrl) {
        img.src = kepUrl;
        img.style.display = "block";
    } else {
        img.style.display = "none";
        img.src = "";
    }

    if (modalMode === "new") {
        // Új könyv
        const url = API_URL +
            "?action=addBookOnly" +
            "&szerzo="       + encodeURIComponent(d.Author) +
            "&cim="          + encodeURIComponent(d.Title) +
            "&eredeti_cim="  + encodeURIComponent(d.Original_Title) +
            "&korabbi_cim="  + encodeURIComponent(d.Previous_Title) +
            "&sorozat="      + encodeURIComponent(d.Series) +
            "&ssz="          + encodeURIComponent(d.Number) +
            "&url="          + encodeURIComponent(kepUrl) +
            "&ev="           + encodeURIComponent(d.Year) +
            "&megv="         + encodeURIComponent(d.Purchased) +
            "&elado="        + encodeURIComponent(d.For_sale) +
            "&ar="           + encodeURIComponent(d.Price) +
            "&megjegy="      + encodeURIComponent(d.Comment) +
            "&callback=modalAddBookValasz";

        const s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
    } else {
        // Szerkesztés
        const url = API_URL +
            "?action=updateLista" +
            "&ID="           + encodeURIComponent(id) +
            "&szerzo="       + encodeURIComponent(d.Author) +
            "&cim="          + encodeURIComponent(d.Title) +
            "&eredeti_cim="  + encodeURIComponent(d.Original_Title) +
            "&korabbi_cim="  + encodeURIComponent(d.Previous_Title) +
            "&sorozat="      + encodeURIComponent(d.Series) +
            "&ssz="          + encodeURIComponent(d.Number) +
            "&url="          + encodeURIComponent(kepUrl) +
            "&ev="           + encodeURIComponent(d.Year) +
            "&megv="         + encodeURIComponent(d.Purchased) +
            "&elado="        + encodeURIComponent(d.For_sale) +
            "&ar="           + encodeURIComponent(d.Price) +
            "&megjegy="      + encodeURIComponent(d.Comment) +
            "&callback=modalUpdateBookValasz";

        const s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
    }
}

function modalAddBookValasz(data) {
    if (data && data.success) {
        log("✔ Új könyv elmentve (modal)");
        alert("Könyv sikeresen rögzítve.");
        closeBookModal();
        betoltesLista();
    } else if (data && data.error && data.error.indexOf("Duplikált") !== -1) {
        let msg = "Ez a könyv már szerepel a listában.";
        if (data.duplicate) {
            const d = data.duplicate;
            msg += "\n\nLétező rekord:\n" +
                   (d.Author || "") + " – " +
                   (d.Title || "") +
                   (d.Year ? " (" + d.Year + ")" : "");
        }
        alert(msg);
        log("❌ Duplikált rekord (modal új könyv).");
    } else {
        alert("Hiba történt mentés közben.");
        log("❌ Hiba (modal új könyv): " + (data && data.error ? data.error : "Ismeretlen hiba"));
    }
}

function modalUpdateBookValasz(data) {
    if (data && data.success) {
        log("✔ Rekord frissítve (modal)");
        alert("Rekord sikeresen frissítve.");
        closeBookModal();
        betoltesLista();
    } else {
        alert("Hiba történt mentés közben!");
        log("❌ Hiba (modal szerkesztés): " + (data && data.error ? data.error : "Ismeretlen hiba"));
    }
}

/********** FUZZY DATALIST SZŰRÉS **********/
function enableFuzzyDatalist(inputId, datalistId) {
    const input = document.getElementById(inputId);
    const dl = document.getElementById(datalistId);

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        const options = [...dl.options];

        options.forEach(opt => {
            const text = opt.value.toLowerCase();

            const normalize = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const match =
                text.includes(query) ||
                normalize(text).includes(normalize(query));

            opt.style.display = match ? "block" : "none";
        });
    });
}

/********** ÉV MEZŐ VALIDÁCIÓ **********
 * csak 1–9999 közötti egész évszámot enged
 ****************************************/
function validateYearFilter(input) {
    let v = input.value;

    // csak számjegyeket engedünk
    if (!/^\d*$/.test(v)) {
        input.value = "";
        return;
    }

    v = parseInt(v, 10);

    if (isNaN(v)) {
        input.value = "";
        return;
    }

    if (v < 1) v = 1;
    if (v > 9999) v = 9999;

    input.value = v;
}

/********** LISTA **********/
let lista = [];

function betoltesLista() {
    const url = API_URL + "?action=getLista&callback=listaValasz&_=" + Date.now();
    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function listaValasz(data) {
    lista = data.items || [];
    listaMegjelenites();
}

let currentSort = { field: "Author", dir: "asc" };

function setSort(field) {
    if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
    } else {
        currentSort.field = field;
        currentSort.dir = "asc";
    }
    listaMegjelenites();
}

function listaMegjelenites() {
    const tbody = document.querySelector("#tabla_lista tbody");
    tbody.innerHTML = "";

    const fszerzo = (ls_szerzo.value || "").toLowerCase();
    const fcim    = (ls_cim.value || "").toLowerCase();
    const fseries = (ls_sorozat.value || "").toLowerCase();
    const fmegv   = (ls_megv.value || "");
    const minYear = parseInt(ls_ev_min.value || "", 10);
    const maxYear = parseInt(ls_ev_max.value || "", 10);

    let filtered = lista.filter(item => {
        const author = (item["Author"] || "").toLowerCase();
        const title  = (item["Title"] || "").toLowerCase();
        const series = (item["Series"] || "").toLowerCase();
        const year   = parseInt(item["Year"] || "", 10);
        const purchased = item["Purchased"] || "";

        if (fszerzo && !author.includes(fszerzo)) return false;
        if (fcim && !title.includes(fcim)) return false;
        if (fseries && !series.includes(fseries)) return false;

        if (!isNaN(minYear)) {
            if (isNaN(year) || year < minYear) return false;
        }
        if (!isNaN(maxYear)) {
            if (isNaN(year) || year > maxYear) return false;
        }

        if (fmegv === "x" && purchased !== "x") return false;
        if (fmegv === "no" && purchased === "x") return false;

        return true;
    });

    // Rendezés
    filtered.sort((a, b) => {
        const f = currentSort.field;
        let av = a[f] || "";
        let bv = b[f] || "";

        // 1) Számmezők – numerikus rendezés
        if (f === "Year" || f === "Number" || f === "Price") {
            av = parseFloat(av); if (isNaN(av)) av = 0;
            bv = parseFloat(bv); if (isNaN(bv)) bv = 0;

        // 2) Checkbox mezők – boolean rendezés
        } else if (f === "Purchased" || f === "For_sale") {
            av = av === "x" ? 1 : 0;
            bv = bv === "x" ? 1 : 0;

        // 3) Szöveges mezők
        } else {
            av = String(av).toLowerCase();
            bv = String(bv).toLowerCase();
        }

        if (av < bv) return currentSort.dir === "asc" ? -1 : 1;
        if (av > bv) return currentSort.dir === "asc" ? 1 : -1;
        return 0;
    });


    // Statisztikák
    const total = lista.length;
    const purchasedCount = lista.filter(i => i["Purchased"] === "x").length;
    const missingCount = total - purchasedCount;
    document.getElementById("stat_total").textContent = total;
    document.getElementById("stat_purchased").textContent = purchasedCount;
    document.getElementById("stat_missing").textContent = missingCount;

    // Sorok
    filtered.forEach(item => {
        const tr = document.createElement("tr");

        const urlCell = (item["URL"] || "").trim()
            ? `<a class="link" href="${item["URL"]}" target="_blank">link</a>`
            : "";

        tr.innerHTML = `
            <td>${item["Author"] || ""}</td>
            <td>${item["Title"] || ""}</td>
            <td>${item["Series"] || ""}</td>
            <td>${item["Year"] || ""}</td>

            <td style="text-align:center;">
                <input type="checkbox" disabled ${item["Purchased"] === "x" ? "checked" : ""}>
            </td>

            <td style="text-align:center;">
                <input type="checkbox" disabled ${item["For_sale"] === "x" ? "checked" : ""}>
            </td>

            <td>${item["Price"] || ""}</td>

            <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="editRecord('${item["ID"]}')">✏️ Szerkeszt</button>
                    <button class="btn btn-danger" style="background:#f8d7da;color:#8a1c1c;"> 🗑️ Törlés </button>

                </div>
            </td>
        `;


        tbody.appendChild(tr);
    });
}

function listaSzures() { listaMegjelenites(); }

/********** SZERKESZTÉS – most már MODAL **********/
function editRecord(id) {
    openBookModal("edit", id);
}

/********** TÖRLÉS **********/
function deleteRecord(id) {
    if (!confirm("Biztosan törlöd ezt a rekordot?")) return;

    const url = API_URL +
        "?action=deleteLista" +
        "&ID=" + encodeURIComponent(id) +
        "&callback=deleteRecordValasz";

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function deleteRecordValasz(data) {
    if (data && data.success) {
        log("✔ Rekord törölve");
        alert("A rekord sikeresen törölve!");
        betoltesLista();
    } else {
        log("❌ Törlés hiba: " + (data && data.error ? data.error : "Ismeretlen hiba"));
        alert("Nem sikerült törölni a rekordot.");
    }
}

/********** CSV/TSV IMPORT **********/
function importCsv() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    let duplicateRows = [];

    if (!file) {
        alert("Válassz ki egy CSV/TSV fájlt!");
        return;
    }

    log("CSV/TSV import indítása...");
    document.getElementById("importResult").innerHTML = "Import indul...";

    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;

        let delimiter = ",";
        if (text.indexOf("\t") !== -1) delimiter = "\t";
        else if (text.indexOf(";") !== -1) delimiter = ";";

        function parseLine(line) {
            const result = [];
            let current = "";
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') {
                    insideQuotes = !insideQuotes;
                } else if (c === delimiter && !insideQuotes) {
                    result.push(current);
                    current = "";
                } else {
                    current += c;
                }
            }
            result.push(current);
            return result;
        }

        const rows = text.split(/\r?\n/).filter(r => r.trim() !== "");
        if (rows.length < 2) {
            document.getElementById("importResult").innerHTML = "Nincs importálható sor.";
            log("Import megszakítva: nincs adat.");
            return;
        }

        const header = parseLine(rows[0]).map(h => h.trim());
        const expected = ["ID","Author","Title","Original_Title","Previous_Title","Series","Number","URL","Year","Purchased","For_sale"];

        let headerOk = (header.length === expected.length);
        if (headerOk) {
            for (let i = 0; i < expected.length; i++) {
                if (header[i] !== expected[i]) {
                    headerOk = false;
                    break;
                }
            }
        }

        if (!headerOk) {
            const msg = "HIBA: A CSV/TSV fejléc nem egyezik a List fül szerkezetével!<br>" +
                        "Elvárt fejléc:<br>" +
                        expected.join(", ");
            document.getElementById("importResult").innerHTML = msg;
            log("Import leállt: hibás fejléc.");
            return;
        }

        const idxAuthor         = header.indexOf("Author");
        const idxTitle          = header.indexOf("Title");
        const idxOriginal_Title = header.indexOf("Original_Title");
        const idxPrevious_Title = header.indexOf("Previous_Title");
        const idxSeries         = header.indexOf("Series");
        const idxNumber         = header.indexOf("Number");
        const idxURL            = header.indexOf("URL");
        const idxYear           = header.indexOf("Year");
        const idxForSale        = header.indexOf("For_sale");

        let imported = 0;
        const resDiv = document.getElementById("importResult");
        resDiv.innerHTML = "";

        function sendNext(i) {
            if (i >= rows.length) {
                const summary = "✔ Import kész. Összesen " + imported + " sor beszúrva.";
                resDiv.innerHTML += "<br><b>" + summary + "</b>";
                log(summary);

                if (duplicateRows.length > 0) {
                    resDiv.innerHTML += "<br><h4>Kihagyott (duplikált) sorok:</h4>";
                    duplicateRows.forEach((d, idx) => {
                        resDiv.innerHTML +=
                            (idx+1) + ". " +
                            "'" + d.Author + "' – '" + d.Title + "'" +
                            (d.Original_Title ? " (" + d.Original_Title + ")" : "") +
                            (d.Year ? ", " + d.Year : "") +
                            "<br>";
                    });
                }
                return;
            }

            const line = rows[i];
            const cols = parseLine(line);

            if (cols.every(c => c.trim() === "")) {
                sendNext(i + 1);
                return;
            }

            const book = {
                Author:         (cols[idxAuthor]         || "").trim(),
                Title:          (cols[idxTitle]          || "").trim(),
                Original_Title: (cols[idxOriginal_Title] || "").trim(),
                Previous_Title: (cols[idxPrevious_Title] || "").trim(),
                Series:         (cols[idxSeries]         || "").trim(),
                Number:         (cols[idxNumber]         || "").trim(),
                URL:            (cols[idxURL]            || "").trim(),
                Year:           (cols[idxYear]           || "").trim(),
                For_sale:       (cols[idxForSale]        || "").trim()
            };

            const callbackName = "importCsvCallback_" + i;
            window[callbackName] = function(data) {
                if (data && data.success) {
                    imported++;
                    const b = data.inserted || book;

                    const lineMsg =
                        "✔ Sor betöltve: Author='" + (b.Author || "") +
                        "', Title='" + (b.Title || "") +
                        "', Series='" + (b.Series || "") +
                        "', Year='" + (b.Year || "") + "'";

                    resDiv.innerHTML += lineMsg + "<br>";
                    log(lineMsg);

                } else if (data && data.error &&
                           data.error.indexOf("Duplikált rekord") !== -1) {

                    const warn =
                        "❌ Duplikáció (" + i + "): A könyv már szerepel → kihagyva.";

                    resDiv.innerHTML += warn + "<br>";
                    log(warn);

                    duplicateRows.push(book);

                } else {
                    const errMsg =
                        "❌ Sor hiba (" + i + "): " +
                        (data && data.error ? data.error : "ismeretlen hiba");

                    resDiv.innerHTML += errMsg + "<br>";
                    log(errMsg);
                }

                delete window[callbackName];
                sendNext(i + 1);
            };

            const url = API_URL +
                "?action=importCsvRow" +
                "&Author="         + encodeURIComponent(book.Author) +
                "&Title="          + encodeURIComponent(book.Title) +
                "&Original_Title=" + encodeURIComponent(book.Original_Title) +
                "&Previous_Title=" + encodeURIComponent(book.Previous_Title) +
                "&Series="         + encodeURIComponent(book.Series) +
                "&Number="         + encodeURIComponent(book.Number) +
                "&URL="            + encodeURIComponent(book.URL) +
                "&Year="           + encodeURIComponent(book.Year) +
                "&For_sale="       + encodeURIComponent(book.For_sale) +
                "&callback="       + callbackName;

            const s = document.createElement("script");
            s.src = url;
            document.body.appendChild(s);
        }

        sendNext(1);
    };

    reader.readAsText(file);
}

/********** INDULÁS **********/
window.onload = function() {
    mutat("lista");
};

// Szűrőmezők datalist-jének betöltése oldalbetöltéskor
loadDropdownLists();

