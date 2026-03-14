const urlJugadores = "jugadores.json";
const urlEventos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=1785101781&single=true&output=csv";

Promise.all([
    fetch(urlJugadores).then(res => res.json()),
    fetch(urlEventos).then(res => res.text())
]).then(([dataJSON, csvText]) => {
    const jugadores = dataJSON.jugadores;
    const eventos = csvToJSON(csvText);
    const stats = {};

    // --- 1. PINTAR BOTONES DE JUGADORES ---
    const contenedorBotones = document.getElementById("lista-jugadores");
    jugadores.sort((a, b) => parseInt(a.dorsal) - parseInt(b.dorsal));
    
    jugadores.forEach(j => {
        // Inicializamos stats aquí mismo para ahorrar bucles
        stats[j.dorsal] = { ...j, goles: 0, asistencias: 0 };
        
        const li = document.createElement("li");
        li.innerHTML = `<a href="jugador.html?dorsal=${j.dorsal}">${j.dorsal} - ${j.alias}</a>`;
        contenedorBotones.appendChild(li);
    });

    // --- 2. PROCESAR ESTADÍSTICAS ---
    eventos.forEach(e => {
        // Usamos los nombres de columna en minúsculas gracias al toLowerCase() en csvToJSON
        const dorsalGol = e.dorsal_goleador;
        const dorsalAsis = e.dorsal_asistente;

        if (stats[dorsalGol]) stats[dorsalGol].goles += 1;
        if (stats[dorsalAsis]) stats[dorsalAsis].asistencias += 1;
    });

    // --- 3. PINTAR RANKINGS ---
    const jugadoresStats = Object.values(stats);
    pintarRanking("ranking-goles", jugadoresStats.sort((a, b) => b.goles - a.goles), "goles");
    pintarRanking("ranking-asistencias", jugadoresStats.sort((a, b) => b.asistencias - a.asistencias), "asistencias");
    pintarRanking("ranking-total", jugadoresStats.sort((a, b) => (b.goles + b.asistencias) - (a.goles + a.asistencias)), j => j.goles + j.asistencias);
});

// --- FUNCIONES AUXILIARES ---

function pintarRanking(id, ranking, valor) {
    const ul = document.getElementById(id);
    if (!ul) return; // Por seguridad
    ul.innerHTML = "";
    
    ranking.forEach((j, i) => {
        const cantidad = typeof valor === "function" ? valor(j) : j[valor];
            const li = document.createElement("li");
            li.innerHTML = `<strong>${i + 1}.</strong> <a href="jugador.html?dorsal=${j.dorsal}">${j.alias}</a>: ${cantidad}`;
            ul.appendChild(li);
    });
}

function csvToJSON(csv) {
    const lines = csv.split("\n");
    // Convertimos a minúsculas para evitar problemas con nombres de columnas como "Dorsal_Goleador"
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim() !== "").map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
}