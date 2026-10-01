const urlJugadores = "jugadores.json";
const urlEventos = obtenerUrlEventosTemporadaActual();

Promise.all([
    fetchChecked(urlJugadores).then(res => res.json()),
    fetchChecked(urlEventos).then(res => res.text())
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

        const paisArchivo = j.nacionalidad
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const li = document.createElement("li");
        li.innerHTML = `
        <a class="jugador-card" href="jugador.html?dorsal=${j.dorsal}">
            <div class="jugador-dorsal">
                ${j.dorsal}
            </div>
            <div class="jugador-foto">
                <img src="img/jugadores/${j.dorsal}.jpg" alt="${j.alias}">
            </div>
            <div class="jugador-info">
                <h3>${j.nombre} ${j.apellidos}</h3>
                <p class="alias"><Strong>${j.alias}</Strong></p>
                <div class="nacionalidad">
                    <img
                        class="bandera"
                        src="img/banderas/${paisArchivo}.png"
                        alt="${j.nacionalidad}">
                </div>
                <p>
                    <strong></strong>
                    ${j.posicion}
                </p>
            </div>
        </a>
        `;
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
}).catch(error => {
    console.error("Error al cargar la plantilla:", error);
    const contenedor = document.getElementById("lista-jugadores");
    if (contenedor) contenedor.textContent = "No se pudo cargar la plantilla.";
});

// --- FUNCIONES AUXILIARES ---

function pintarRanking(id, ranking, valor) {
    const ul = document.getElementById(id);
    if (!ul) return; // Por seguridad
    ul.innerHTML = "";

    ranking.forEach((j, i) => {
        const cantidad = typeof valor === "function" ? valor(j) : j[valor];
            const li = document.createElement("li");
            const posicion = document.createElement("strong");
            posicion.textContent = String(i + 1);
            const enlace = document.createElement("a");
            enlace.href = `jugador.html?dorsal=${encodeURIComponent(j.dorsal)}`;
            enlace.textContent = j.alias;
            li.append(posicion, document.createTextNode(" "), enlace, document.createTextNode(` ${cantidad}`));
            ul.appendChild(li);
    });
}
