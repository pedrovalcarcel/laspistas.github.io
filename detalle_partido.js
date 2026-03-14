// URLs de tus archivos (Ajusta con tus enlaces reales)
//const urlPartidos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";
const urlEventos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=1785101781&single=true&output=csv";
const urlJugadores = "jugadores.json";


Promise.all([
    fetch(urlPartidos).then(res => res.text()),
    fetch(urlEventos).then(res => res.text()),
    fetch(urlJugadores).then(res => res.json())
]).then(async ([csvP, csvE, jugadores]) => {

    partidosGlobal = csvToJSON(csvP);
    const partidosEventos = csvToJSON(csvE);
    const params = new URLSearchParams(window.location.search);
    const partidoId = params.get("id");

    const partido = partidosGlobal.find(p => String(p.id).trim() === String(partidoId).trim());

    if(partido) {
    const jornadaActual = parseInt(partido.jornada);
    
    // CALCULAMOS LA TABLA SOLO HASTA ESTA JORNADA
    const tabla = calcularClasificacion(partidosGlobal, jornadaActual);
    
    // Inicializamos la IA con esta tabla (así la IA también "cree" que estamos en esa jornada)
    await inicializarIA(partidosGlobal, tabla); 
    
    const eventosDelPartido = partidosEventos.filter(e => String(e.id_partido).trim() === String(partidoId).trim());
    
    // Renderizamos pasando la tabla filtrada
    renderizarActa(partido, eventosDelPartido, jugadores, tabla);
    mostrarPrediccion(partido);
}
});

function renderizarActa(partido, eventos, jugadores,tabla) {
    const contenedor = document.getElementById("pagina-detalle-partido");
    const titulo = document.getElementById("titulo-partido");
    const listaJugadores = Array.isArray(jugadores) ? jugadores : (jugadores.jugadores || []);
    const tablaArray = Object.keys(tabla).map(nombre => ({
        equipo: nombre,
        ...tabla[nombre],
        dg: tabla[nombre].gf - tabla[nombre].gc
    })).sort((a, b) => b.pts - a.pts || b.dg - a.dg); // Ordenamos por puntos, luego por DG

    titulo.innerHTML = `Jornada ${partido.jornada}: 
        <a href="equipo.html?nombre=${encodeURIComponent(partido.local)}" class="link-equipo">${partido.local}</a> 
        ${partido.goles_local} - ${partido.goles_visitante} 
        <a href="equipo.html?nombre=${encodeURIComponent(partido.visitante)}" class="link-equipo">${partido.visitante}</a>`;
    // Lógica de jugadores y eventos (tu código original)
    const convocadosIds = partido.convocados ? partido.convocados.toString().split("-").map(d => d.trim()).filter(d => d !== "") : [];
    const convocados = convocadosIds.map(id => listaJugadores.find(j => String(j.dorsal).trim() === String(id).trim())).filter(j => j !== "").sort((a, b) => parseInt(a.dorsal) - parseInt(b.dorsal));
    const goles = eventos.filter(e => e.dorsal_goleador && e.dorsal_goleador.trim() !== "");
    const eventosConTarjetas = eventos.filter(e => (e.dorsal_tarjeta_amarilla && e.dorsal_tarjeta_amarilla.trim() !== "") || (e.dorsal_tarjeta_roja && e.dorsal_tarjeta_roja.trim() !== ""));
    const rachaLocal = generarHTMLRacha(partido.local, partidosGlobal,partido.fecha);
    const rachaVisitante = generarHTMLRacha(partido.visitante, partidosGlobal,partido.fecha);
    // --- CÁLCULO DE CLASIFICACIÓN PREVIA ---
    // Usamos la función que ya está en tu modelo de IA
    const htmlTabla = `
        <div class="columna-izquierda">
            <h3>Clasificación antes de Jornada ${partido.jornada}</h3>
            <table class="tabla-mini-clasi" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th>Pos</th><th>Equipo</th><th>PJ</th><th>DG</th><th>Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${tablaArray.map((eq, i) => `
                        <tr class="${eq.equipo === MI_EQUIPO2 ? 'highlight' : ''}">
                            <td>${i + 1}</td>
                            <td><a href="equipo.html?nombre=${encodeURIComponent(eq.equipo)}" class="link-equipo">${eq.equipo}</a></td>                            
                            <td>${eq.pj}</td>
                            <td>${eq.dg > 0 ? '+' : ''}${eq.dg}</td>
                            <td><b>${eq.pts}</b></td>
                        </tr>
                    `).join("")}
                    
                </tbody>
            </table>
            <div class="seccion-rachas" style="margin-bottom: 20px; text-align: center;">
                    <div class="racha-individual">
                        <p><strong>Racha de ${partido.local}:</strong></p>
                    <div class="racha-container">${rachaLocal}</div>
                </div>
                <div class="racha-individual" style="margin-top: 10px;">
                    <p><strong>Racha de ${partido.visitante}:</strong></p>
                 <div class="racha-container">${rachaVisitante}</div>
             </div>
            </div>
        </div>
    `;

    // --- RENDERIZADO CON LAYOUT DE DOS COLUMNAS ---
    contenedor.innerHTML = `
        <div class="layout-acta-tres-columnas">
            <div class="columna columna-izquierda">
                ${htmlTabla}
            </div>
            
            <div class="columna columna-centro">
                <p>📅 ${obtenerDiaSemana(partido.fecha)} ${partido.fecha} ⏰ ${partido.hora}</p>
                <p>📍 Campo: ${partido.campo} 👨‍⚖️ Arbitro: ${partido.arbitro}</p>

                <h2>Convocados (${convocados.length})</h2>
                <ul>${convocados.length > 0 ? convocados.map(j => `<li><a href="jugador.html?dorsal=${j.dorsal}">${j.dorsal} - ${j.alias}</a></li>`).join("") : "<li>Sin registros</li>"}</ul>

                <h2>Goles</h2>
                <ul>${goles.length === 0 ? "Sin goles" : goles.map(g => {
                    const goleador = listaJugadores.find(j => String(j.dorsal) === String(g.dorsal_goleador));
                    const asistente = listaJugadores.find(j => String(j.dorsal) === String(g.dorsal_asistente));
                    return `<li>${goleador ? goleador.alias : g.dorsal_goleador}${asistente ? ` (${asistente.alias})` : ""}</li>`;
                }).join("")}</ul>

                <h3>Tarjetas</h3>
                <ul>${eventosConTarjetas.length === 0 ? "Sin tarjetas" : eventosConTarjetas.map(e => {
                    let t = "";
                    if (e.dorsal_tarjeta_amarilla) t += `<li>🟨 ${e.dorsal_tarjeta_amarilla}</li>`;
                    if (e.dorsal_tarjeta_roja) t += `<li>🟥 ${e.dorsal_tarjeta_roja}</li>`;
                    return t;
                }).join("")}</ul>
            </div>
            
            <div class="columna columna-derecha">
                <h3>Predicción IA</h3>
                <div id="contenedor-prediccion"></div>
            </div>
        </div>
    `;
    
}

// Funciones auxiliares
function buscarJugador(dorsal, jugadores) {
    return jugadores.find(j => j.dorsal == dorsal);
}

function csvToJSON(csv) {
    const lines = csv.split("\n");
    // Usamos split con expresión regular para detectar comas o tabs
    const headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
    
    return lines.slice(1).filter(l => l.trim() !== "").map(line => {
        const values = line.split(/[,\t]/);
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
}

function obtenerDiaSemana(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [d, m, a] = fecha.split("/");
    return dias[new Date(a, m - 1, d).getDay()];
}

