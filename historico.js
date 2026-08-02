window.MI_EQUIPO = "Las Pistas FC";
const selectorTemporada = document.getElementById("selector-temporada");
const tablaClasificacionBody = document.getElementById("cuerpo-clasificacion");
const rankingGoles = document.getElementById("ranking-goles");
const rankingAsistencias = document.getElementById("ranking-asistencias");
const rankingTotal = document.getElementById("ranking-total");
const barraResumen = document.getElementById("barra-resumen");
const calendariosResultados = document.getElementById("calendarios-resultados");
const ultimoPartidoCopa = document.getElementById("ultimo-partido-copa");

const TEMPORADAS_DISPONIBLES = [
    "2025/26",
    "2026/27"
];

function obtenerTemporadaActualHistorico() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    return `${año}/${String(año + 1).slice(-2)}`;
}

const urlJugadores = "jugadores.json";

function inicializarHistorico() {
    if (!selectorTemporada) return;

    TEMPORADAS_DISPONIBLES.forEach(temporada => {
        const option = document.createElement("option");
        option.value = temporada;
        option.textContent = temporada;
        selectorTemporada.appendChild(option);
    });

    const temporadaActual = obtenerTemporadaActualHistorico();
    const temporadasFiltradas = TEMPORADAS_DISPONIBLES.filter(t => t !== temporadaActual);
    const temporadaInicial = temporadasFiltradas.length > 0
        ? temporadasFiltradas[temporadasFiltradas.length - 1]
        : TEMPORADAS_DISPONIBLES[0];

    selectorTemporada.value = temporadaInicial;

    selectorTemporada.addEventListener("change", () => {
        cargarHistorico(selectorTemporada.value);
    });

    cargarHistorico(selectorTemporada.value);
}

async function cargarHistorico(temporada) {
    if (!temporada) return;

    const urlPartidos = obtenerUrlPartidosTemporada(temporada);
    const urlEventos = obtenerUrlEventosTemporada(temporada);

        const [partidosCsv, eventosCsv, jugadoresData] = await Promise.all([
        fetch(urlPartidos).then(r => r.text()),
        fetch(urlEventos).then(r => r.text()),
        fetch(urlJugadores).then(r => r.json())
    ]);

    const partidos = csvToJSON(partidosCsv);
    const partidosTemporadaAll = filtrarPartidosPorTemporada(partidos, temporada);
    const partidosTemporada = partidosTemporadaAll
        .filter(p => (
            p.local.trim() === window.MI_EQUIPO ||
            p.visitante.trim() === window.MI_EQUIPO
        ))
        .map(p => ({
            ...p,
            local: p.local.trim(),
            visitante: p.visitante.trim()
        }));

    const partidosOficiales = partidosTemporada.filter(p =>
        p.jornada !== "Amistoso" &&
        p.goles_local !== ""
    );

    const partidosClasificacion = partidosTemporadaAll.filter(p =>
        !isNaN(Number(p.jornada)) &&
        p.jornada !== "Amistoso" &&
        p.goles_local !== ""
    );

    const partidosCopa = partidosTemporada.filter(p =>
        isNaN(Number(p.jornada)) &&
        p.jornada !== "Amistoso" &&
        p.fecha &&
        p.goles_local !== ""
    );

    const ultimoCopa = partidosCopa
        .map(p => ({
            ...p,
            fechaObj: new Date(p.fecha.split("/").reverse().join("-"))
        }))
        .filter(p => !isNaN(p.fechaObj.getTime()))
        .sort((a, b) => b.fechaObj - a.fechaObj)[0];

    const jugadores = Array.isArray(jugadoresData)
        ? jugadoresData
        : Array.isArray(jugadoresData.jugadores)
            ? jugadoresData.jugadores
            : [];

    llenarBarraResumen(partidosOficiales);
    crearTooltip();
    crearCalendarios(partidosTemporada);
    llenarClasificacion(partidosClasificacion);
    llenarRankings(eventosCsv, jugadores);
    mostrarUltimoPartidoCopa(ultimoCopa, temporada);
}

function llenarBarraResumen(partidos) {
    if (!barraResumen) return;

    let v = 0;
    let e = 0;
    let d = 0;

    partidos.forEach(p => {
        if (p.goles_local === "" || p.goles_visitante === "") return;
        const gl = Number(p.goles_local);
        const gv = Number(p.goles_visitante);
        const esLocal = p.local.trim() === "Las Pistas FC";

        if (gl === gv) e++;
        else if ((esLocal && gl > gv) || (!esLocal && gv > gl)) v++;
        else d++;
    });

    const total = v + e + d;
    barraResumen.innerHTML = `
        <span class="pj">PJ: <strong>${total}</strong></span>
        <span class="g">G: <strong>${v}</strong></span>
        <span class="e">E: <strong>${e}</strong></span>
        <span class="d">D: <strong>${d}</strong></span>
    `;
}

function crearCalendarios(partidos) {
    if (!calendariosResultados) return;
    calendariosResultados.innerHTML = "";

    const mesesTemporada = [
        { mes: 8, nombre: "Septiembre" },
        { mes: 9, nombre: "Octubre" },
        { mes: 10, nombre: "Noviembre" },
        { mes: 11, nombre: "Diciembre" },
        { mes: 0, nombre: "Enero" },
        { mes: 1, nombre: "Febrero" },
        { mes: 2, nombre: "Marzo" },
        { mes: 3, nombre: "Abril" },
        { mes: 4, nombre: "Mayo" },
        { mes: 5, nombre: "Junio" }
    ];

    const [inicio, fin] = selectorTemporada.value.split("/").map(y => Number(y));
    const añoInicio = inicio;
    const añoFin = 2000 + fin;

    mesesTemporada.forEach(({ mes }) => {
        const año = mes >= 8 ? añoInicio : añoFin;
        const tarjeta = document.createElement("div");
        tarjeta.className = "calendario-card";
        const titulo = document.createElement("h2");
        titulo.id = `titulo-${año}-${mes}`;
        const contenido = document.createElement("div");
        tarjeta.appendChild(titulo);
        tarjeta.appendChild(contenido);
        calendariosResultados.appendChild(tarjeta);
        crearCalendario(año, mes, partidos, contenido, titulo.id);
    });
}

function obtenerNombreMes(mes) {
    const meses = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    return meses[mes];
}

function obtenerNombreArchivoEscudo(equipo) {
    return equipo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

function llenarClasificacion(partidos) {
    if (!tablaClasificacionBody) return;

    const tabla = calcularClasificacion(partidos);
    const tablaArray = Object.keys(tabla).map(nombre => ({
            equipo: nombre,
            ...tabla[nombre],
            ga: tabla[nombre].gf - tabla[nombre].gc // Diferencia de goles
        })).sort((a, b) => b.pts - a.pts || b.ga - a.ga);

        // Imprimir en el tbody
        const tbody = document.getElementById("cuerpo-clasificacion");
            tbody.innerHTML = tablaArray.map((eq, i) => {
                
                // Lógica para decidir el enlace
                let enlace;
                if (eq.equipo.trim() === "Las Pistas FC") {
                    enlace = "estadisticas.html"; // Tu página de estadísticas original
                } else {
                    enlace = `equipo.html?nombre=${encodeURIComponent(eq.equipo)}`;
                }

                const nombreArchivoEscudo = obtenerNombreArchivoEscudo(eq.equipo);
                const escudoUrl = `img/equipos/${nombreArchivoEscudo}.png`;
                const escudoFallbackUrl = `img/equipos/${nombreArchivoEscudo}.jpg`;

                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img src="${escudoUrl}" alt="Escudo de ${eq.equipo}" style="width: 35px; height: 35px; object-fit: contain;" onerror="this.onerror=null; this.src='${escudoFallbackUrl}'; this.style.display='block'">
                                <a href="${enlace}" class="link-equipo">${eq.equipo}</a>
                            </div>
                        </td>
                        <td>${eq.pj}</td>
                        <td>${eq.pg}</td>
                        <td>${eq.pe}</td>
                        <td>${eq.pp}</td>
                        <td>${eq.gf}</td>
                        <td>${eq.gc}</td>
                        <td>${eq.ga > 0 ? '+' : ''}${eq.ga}</td>
                        <td><b>${eq.pts}</b></td>
                    </tr>
                `;
            }).join("");
}

function llenarRankings(eventosCsv, jugadores) {
    if (!rankingGoles || !rankingAsistencias || !rankingTotal) return;

    const eventos = csvToJSON(eventosCsv);
    const stats = {};
    jugadores.forEach(j => {
        stats[j.dorsal] = {
            alias: j.alias,
            dorsal: j.dorsal,
            goles: 0,
            asistencias: 0
        };
    });

    eventos.forEach(e => {
        const dorsalGol = e.dorsal_goleador;
        const dorsalAsis = e.dorsal_asistente;
        if (stats[dorsalGol]) stats[dorsalGol].goles += 1;
        if (stats[dorsalAsis]) stats[dorsalAsis].asistencias += 1;
    });

    const jugadoresStats = Object.values(stats);
    pintarRanking("ranking-goles", jugadoresStats.sort((a, b) => b.goles - a.goles), "goles");
    pintarRanking("ranking-asistencias", jugadoresStats.sort((a, b) => b.asistencias - a.asistencias), "asistencias");
    pintarRanking("ranking-total", jugadoresStats.sort((a, b) => (b.goles + b.asistencias) - (a.goles + a.asistencias)), j => j.goles + j.asistencias);
}

function pintarRanking(id, ranking, valor) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = ranking.map((j, i) => {
        const cantidad = typeof valor === "function" ? valor(j) : j[valor];
        return `<li><strong>${i + 1}</strong> <a href="jugador.html?dorsal=${j.dorsal}">${j.alias}</a> ${cantidad}</li>`;
    }).join("");
}

function mostrarUltimoPartidoCopa(partido, temporada) {
    if (!ultimoPartidoCopa) return;
    if (!partido) {
        ultimoPartidoCopa.innerHTML = `<p>No se encontró un partido de copa en la temporada ${temporada}.</p>`;
        return;
    }

    const fechaTexto = new Date(partido.fecha.split("/").reverse().join("-")).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const enlaceActa = partido.id ? `partido.html?id=${encodeURIComponent(partido.id)}` : null;
    ultimoPartidoCopa.innerHTML = `
        ${enlaceActa ? `<a href="${enlaceActa}" class="partido-copa-enlace">` : ""}
            <div class="partido-copa">
                <div class="partido-copa-header">
                    <div class="equipo equipo-local">${partido.local}</div>
                    <div class="vs">vs</div>
                    <div class="equipo equipo-visitante">${partido.visitante}</div>
                </div>
                <div class="partido-copa-score">
                    <div class="score-box">
                        <span class="score-local">${partido.goles_local}</span>
                        <span class="score-separator">-</span>
                        <span class="score-visitante">${partido.goles_visitante}</span>
                    </div>
                    <div class="partido-copa-meta">${partido.jornada} · ${fechaTexto}</div>
                    <div class="partido-copa-field">${partido.campo || "Sin campo"}</div>
                </div>
                ${enlaceActa ? `<div class="cta">Ver acta del partido</div>` : ""}
            </div>
        ${enlaceActa ? `</a>` : ""}
    `;
}

inicializarHistorico();
