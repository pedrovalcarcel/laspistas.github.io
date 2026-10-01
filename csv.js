/* Utilidades compartidas para CSV y peticiones HTTP. */
function csvToJSON(csv) {
    if (typeof csv !== "string" || csv.trim() === "") return [];

    if (window.Papa && typeof window.Papa.parse === "function") {
        const result = window.Papa.parse(csv, { header: true, skipEmptyLines: "greedy" });
        if (result.errors?.length) {
            console.warn("El CSV contiene filas con formato irregular:", result.errors.slice(0, 5));
        }
        return result.data.map(row => Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
                String(key).trim().toLowerCase(),
                String(value ?? "").trim()
            ])
        ));
    }

    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i], next = csv[i + 1];
        if (quoted) {
            if (char === '"' && next === '"') { field += '"'; i++; }
            else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"' && field === "") quoted = true;
        else if (char === ",") { row.push(field); field = ""; }
        else if (char === "\n" || char === "\r") {
            if (char === "\r" && next === "\n") i++;
            row.push(field); rows.push(row); row = []; field = "";
        } else field += char;
    }
    row.push(field); rows.push(row);
    const headers = (rows.shift() || []).map(h => h.trim().toLowerCase());
    return rows.filter(values => values.some(value => value.trim() !== ""))
        .map(values => Object.fromEntries(headers.map((header, index) =>
            [header, String(values[index] ?? "").trim()]
        )));
}

async function fetchChecked(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Error HTTP ${response.status} al cargar los datos.`);
    return response;
}

async function fetchCSV(url, options) {
    return csvToJSON(await (await fetchChecked(url, options)).text());
}
