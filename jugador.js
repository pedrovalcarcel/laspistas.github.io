const params = new URLSearchParams(window.location.search);
const dorsal = params.get("dorsal");

// URLs de tus archivos (Asegúrate de que estas rutas sean correctas)
const urlPartidos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";
const urlEventos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=1785101781&single=true&output=csv";
const urlJugadores = "jugadores.json";

Promise.all([
    fetch(urlPartidos).then(res => res.text()),
    fetch(urlEventos).then(res => res.text()),
    fetch(urlJugadores).then(res => res.json())
]).then(([csvP, csvE, dataJugadores]) => {
    
    const partidos = csvToJSON(csvP);
    const eventos = csvToJSON(csvE);
    const jugadores = Array.isArray(dataJugadores) ? dataJugadores : dataJugadores.jugadores;
    
    const jugador = jugadores.find(j => String(j.dorsal).trim() === String(dorsal).trim());
    
    if (!jugador) {
        document.getElementById("pagina-jugador").textContent = "Jugador no encontrado.";
        return;
    }

    // --- CÁLCULO DE ESTADÍSTICAS ---
    let goles = 0;
    let asistencias = 0;
    let tarjetas = 0;
    let partidosJugados = 0;

    // 1. Partidos jugados: Buscamos en 'convocados' (usando el separador ;)
    partidos.forEach(p => {
        if(p.jornada !== "Amistoso"){
            const listaConvocados = p.convocados ? p.convocados.split("-").map(d => d.trim()) : [];
            if (listaConvocados.includes(String(dorsal))) {
                partidosJugados += 1;
            }
        }
    });

    // 2. Eventos: Sumamos según el dorsal
    eventos.forEach(e => {
        if (String(e.dorsal_goleador) === String(dorsal)) goles += 1;
        if (String(e.dorsal_asistente) === String(dorsal)) asistencias += 1;
        if (String(e.dorsal_tarjeta_amarilla) === String(dorsal) || String(e.dorsal_tarjeta_roja) === String(dorsal)) {
            tarjetas += 1;
        }
    });

    const gya_x_partido = partidosJugados > 0 ? (goles + asistencias) / partidosJugados : 0;

    // --- RENDERIZADO ---
    document.getElementById("estadisticas").innerHTML = `
        <h2>Estadísticas</h2>
        <ul>
            <li>Partidos jugados: ${partidosJugados}</li>
            <li>Goles: ${goles}</li>
            <li>Asistencias: ${asistencias}</li>
            <li>G/A por partido: ${gya_x_partido.toFixed(2)}</li>
            <li>Tarjetas: ${tarjetas}</li>
        </ul>
    `;

    // Resto de los datos del jugador (Nombre, Foto, etc.)
    document.getElementById("nombre-jugador").textContent = `${jugador.nombre} ${jugador.apellidos}`;
    document.getElementById("alias").textContent = jugador.alias;
    document.getElementById("fecha").textContent = jugador.fecha_nacimiento;
    document.getElementById("nacionalidad").textContent = jugador.nacionalidad;
    document.getElementById("comida").textContent = jugador.comida_favorita;
    document.getElementById("frase").textContent = jugador.frase;
    document.getElementById("foto-jugador").src = jugador.foto;
    
    document.querySelectorAll(".pos").forEach(punto => {
        const pos = punto.dataset.pos;
        const nivel = jugador.posiciones[pos];
        if (nivel) punto.classList.add(nivel);
    });
});

// Función auxiliar para convertir CSV a JSON
function csvToJSON(csv) {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim() !== "").map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
}