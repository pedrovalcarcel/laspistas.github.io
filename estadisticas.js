// 1. Configuración de URLs
// Usamos la URL de tu Spreadsheet (pestaña de resultados/partidos)

const urlPartidosCSV = obtenerUrlPartidosTemporadaActual();
const urlGolesCSV = obtenerUrlEventosTemporadaActual();
const nombreMiEquipo = "Las Pistas FC"; // Asegúrate de que coincida exactamente con el texto en tu Excel
const urlJugadores = "jugadores.json"; // Para mostrar alias en lugar de dorsales en la gráfica de goles por jugador

document.addEventListener("DOMContentLoaded", cargarDatosYGraficar);
//let modeloEntrenado = false;

async function inicializarDashboard() {
    // 1. Cargar datos
    //const respuestaCSV = await fetch('partidos.csv');
    //const csvTexto = await respuestaCSV.text();
    //const datosPartidos = Papa.parse(csvTexto, { header: true }).data;

    // 2. Cargar clasificación (tu JSON)
    const datosClasif = await fetch(urlPartidosCSV);
    
    // 3. Crear el cerebro (El punto 3 del proceso)
    const mapaPoder = obtenerMapaPoder(datosClasif);
    
    console.log("Entrenando IA...");
    //entrenarIA(datosPartidos, mapaPoder, listaArbitros);
    
    modeloEntrenado = true;
    console.log("IA lista para predecir.");
}

// Ejecutar al cargar la página
window.onload = inicializarDashboard;
async function cargarDatosYGraficar() {
    try {
        // 1. Cargamos todos los archivos en paralelo
        const [resPartidos, resGoles, resJugadores] = await Promise.all([
            fetch(urlPartidosCSV),
            fetch(urlGolesCSV),
            fetch(urlJugadores)
        ]);

        // 2. Procesamos cada archivo
        const partidos = csvToJSON(await resPartidos.text());
        console.log(partidos[0]);
        const partidosTemporada = filtrarTemporadaActual(partidos);
        const golesData = csvToJSON(await resGoles.text());
        
        // 3. Obtenemos el JSON y nos aseguramos de que sea un array
        const rawJugadores = await resJugadores.json();
        const jugadores = Array.isArray(rawJugadores) ? rawJugadores : [rawJugadores];

        console.log("Datos cargados correctamente:", { partidos, golesData, jugadores });

        // 4. Dibujamos las gráficas
        generarGraficaEvolucion(partidosTemporada, nombreMiEquipo,'graficaPuntos');
        generarGraficaVictoriasPorHora(partidosTemporada);
        
        // Pasamos ambos argumentos: los goles (CSV) y la lista (Array) de jugadores
        generarGraficaGolesPorJugador(golesData, jugadores);
        generarGraficaAsistenciasPorJugador(golesData, jugadores); 
        generarGraficaPosicionJornada(partidosTemporada, nombreMiEquipo, 'graficaPosicion');

        crearEstadisticasArbitros(partidosTemporada);
        
    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
}

/**
 * Genera la gráfica de evolución de puntos
 * @param {Array} partidos - Array de objetos con los datos de los partidos.
 * @param {string} nombreEquipo - Nombre del equipo a analizar.
 * @param {string} canvasId - El ID del elemento <canvas> en el HTML.
 */
function generarGraficaEvolucion(partidos, nombreEquipo, canvasId = 'graficaPuntos') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; // Salida segura si el gráfico no está en esta página
    const ctx = canvas.getContext('2d');
    let puntosAcumulados = 0;
    const datosGrafica = [0]; 
    const etiquetas = ["Inicio"];

    const partidosFiltrados = partidos.filter(p => {
        const esLiga = /^\d+$/.test(p.jornada);
        const juegaEquipo = (p.local === nombreEquipo || p.visitante === nombreEquipo);
        const tieneResultado = p.goles_local !== "" && p.goles_visitante !== "";
        return esLiga && juegaEquipo && tieneResultado;
    });

    partidosFiltrados.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada));

    partidosFiltrados.forEach(p => {
        const golesL = parseInt(p.goles_local);
        const golesV = parseInt(p.goles_visitante);
        
        if (p.local === nombreEquipo) {
            if (golesL > golesV) puntosAcumulados += 3;
            else if (golesL === golesV) puntosAcumulados += 1;
        } else {
            if (golesV > golesL) puntosAcumulados += 3;
            else if (golesV === golesL) puntosAcumulados += 1;
        }
        etiquetas.push(`J-${p.jornada}`);
        datosGrafica.push(puntosAcumulados);
    });

    if (!window.chartInstances) window.chartInstances = {};
    if (window.chartInstances[canvasId]) window.chartInstances[canvasId].destroy();

    window.chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: `Puntos Acumulados - ${nombreEquipo}`, // Título dinámico
                data: datosGrafica,
                borderColor: '#2E6AF2',
                backgroundColor: '#1842B7',
                borderWidth: 4,
                pointBackgroundColor: '#ffffff',
                pointRadius: 5,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 200,
            plugins: {
                legend: { labels: { color: '#020101', font: { size: 14 } } }
            },
            scales:{

                x:{
                    ticks:{
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        },
                        autoSkip:false,
                        maxRotation:45,
                        minRotation:0,
                        align:'start'
                    },
                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }
                },

                y:{
                    beginAtZero:true,
                    ticks:{
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        }
                    },
                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }
                }

}
        }
    });
}
function generarGraficaVictoriasPorHora(partidos){

    const statsHora = {};

    partidos
        .filter(p =>
            (p.local === nombreMiEquipo || p.visitante === nombreMiEquipo) &&
            p.goles_local !== ""
        )
        .forEach(p => {

            const hora = p.hora;

            if(!statsHora[hora]){
                statsHora[hora]={
                    pj:0,
                    victorias:0,
                    partidos:[]
                };
            }

            statsHora[hora].pj++;
            statsHora[hora].partidos.push(p);

            const gl = Number(p.goles_local);
            const gv = Number(p.goles_visitante);

            const victoria =
                (p.local===nombreMiEquipo && gl>gv) ||
                (p.visitante===nombreMiEquipo && gv>gl);

            if(victoria){
                statsHora[hora].victorias++;
            }

        });

    const horas = Object.keys(statsHora).sort((a,b)=>{

        return parseInt(a)-parseInt(b);

    });

    const porcentajes = horas.map(h=>{

        return statsHora[h].pj
            ? statsHora[h].victorias*100/statsHora[h].pj
            : 0;

    });

    const canvas=document.getElementById("graficaVictoriasHora");
    const ctx=canvas.getContext("2d");

    if(window.miGraficoVictorias){
        window.miGraficoVictorias.destroy();
    }

    window.miGraficoVictorias=new Chart(ctx,{

        type:"bar",

        plugins:[ChartDataLabels],

        data:{
            labels:horas,
            datasets:[{
                data:porcentajes,
                backgroundColor:"#143FAF",
                borderRadius:8
            }]
        },

        options:{

            responsive:true,
            maintainAspectRatio:false,
            animation:false,

            plugins:{

                legend:{
                    display:false
                },

                tooltip:{
                    enabled:false
                },

                datalabels:{

                    color:"#070404",

                    anchor:"center",

                    align:"center",

                    formatter:(value,context)=>{

                        const h=horas[context.dataIndex];

                        return `${statsHora[h].victorias}/${statsHora[h].pj}`;

                    },

                    font:{
                        weight:"bold"
                    }

                }

            },

            scales:{

                y:{
                    beginAtZero:true,
                    max:100,
                    ticks:{
                        color:"#333"
                    },
                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }
                },

                x:{
                    ticks:{
                        color:"#333"
                    },
                    grid:{
                        display:false
                    }
                }

            }

        }

    });

    // =====================================================
    // CLICK ROBUSTO (funciona aunque la barra tenga altura 0)
    // =====================================================

    canvas.onclick=function(e){

        const chart=window.miGraficoVictorias;

        const rect=canvas.getBoundingClientRect();

        const x=e.clientX-rect.left;

        const escalaX=chart.scales.x;

        let indice=-1;
        let distancia=Infinity;

        horas.forEach((hora,i)=>{

            const px=escalaX.getPixelForValue(i);

            const d=Math.abs(px-x);

            if(d<distancia){

                distancia=d;
                indice=i;

            }

        });

        if(indice===-1) return;

        const hora=horas[indice];

        document.getElementById("tituloModal").textContent=
            `Partidos a las ${hora}`;

        const lista=document.getElementById("listaModal");

        lista.innerHTML="";

        statsHora[hora].partidos.forEach(p=>{

            lista.innerHTML += `
                <div class="partido-modal">

                    <span class="equipo-local">
                        ${p.local}
                    </span>

                    <span
                        class="resultado-modal"
                        onclick="location.href='partido.html?id=${encodeURIComponent(p.id)}&temporada=${encodeURIComponent(p.temporada)}'">

                        ${p.goles_local} - ${p.goles_visitante}

                    </span>

                    <span class="equipo-visitante">
                        ${p.visitante}
                    </span>

                </div>
            `;

        });

        document
            .getElementById("modalPartidos")
            .classList
            .add("visible");

    };

    document.getElementById("cerrarModal").onclick=()=>{

        document
            .getElementById("modalPartidos")
            .classList
            .remove("visible");

    };

    document.getElementById("modalPartidos").onclick=(e)=>{

        if(e.target.id==="modalPartidos"){

            e.currentTarget.classList.remove("visible");

        }

    };

}


function generarGraficaGolesPorJugador(golesData, listaJugadores) {

    // Obtener jugadores
    const jugadoresArray =
        (listaJugadores &&
        listaJugadores[0] &&
        listaJugadores[0].jugadores)
        ? listaJugadores[0].jugadores
        : [];

    // Inicializar todos los jugadores con 0 goles
    const conteoGoles = {};

    jugadoresArray.forEach(j => {
        conteoGoles[j.alias] = 0;
    });

    // Mapa dorsal -> alias
    const mapaJugadores = {};

    jugadoresArray.forEach(j => {
        mapaJugadores[String(j.dorsal).trim()] = j.alias;
    });

    // Contar goles
    golesData.forEach(fila => {

        const dorsal = fila.dorsal_goleador
            ? String(fila.dorsal_goleador).trim()
            : "";

        if (mapaJugadores[dorsal]) {
            conteoGoles[mapaJugadores[dorsal]]++;
        }

    });

    // Filtrar jugadores con 0 goles y ordenar de mayor a menor
    const items = Object.entries(conteoGoles)
        .filter(([, goles]) => goles > 0)
        .sort((a,b)=>b[1]-a[1]);

    if (items.length === 0) {
        if (window.miGraficoGoles) {
            window.miGraficoGoles.destroy();
        }
        return;
    }

    const nombresJugadores = items.map(i=>i[0]);
    const golesJugadores = items.map(i=>i[1]);

    const totalGoles =
        golesJugadores.reduce((a,b)=>a+b,0);

    const ctx =
        document
        .getElementById("graficaGolesPorJugador")
        .getContext("2d");

    if(window.miGraficoGoles){
        window.miGraficoGoles.destroy();
    }

    window.miGraficoGoles = new Chart(ctx,{

        type:"bar",

        plugins:[ChartDataLabels],

        data:{

            labels:nombresJugadores,

            datasets:[{

                data:golesJugadores,

                backgroundColor:"#143FAF",

                borderRadius:8,

                barThickness:20

            }]

        },

        options:{

            indexAxis:"y",

            responsive:true,

            maintainAspectRatio:false,

            animation:false,

            plugins:{

                legend:{
                    display:false
                },

                title:{
                    display:false
                },

                datalabels:{

                anchor:"center",

                align:"center",

                color:"#fff",

                formatter:(value)=>{

                    if(value===0) return "";

                    const porcentaje =
                        ((value/totalGoles)*100).toFixed(1);

                    return `${value} · ${porcentaje}%`;

                },

                font:{
                    weight:"bold",
                    size:11
                }

            }
        },

            scales:{

                x:{

                    beginAtZero:true,

                    ticks:{
                        color:"#333",
                        precision:0,
                        font:{
                            size:11,
                            weight:"600"
                        }
                    },

                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }

                },

                y:{

                    ticks:{
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        }
                    },

                    grid:{
                        display:false
                    }

                }

            }

        }

    });

}

function generarGraficaAsistenciasPorJugador(asistenciasData, listaJugadores) {

    // Obtener jugadores
    const jugadoresArray =
        (listaJugadores &&
        listaJugadores[0] &&
        listaJugadores[0].jugadores)
        ? listaJugadores[0].jugadores
        : [];

    // Inicializar todos los jugadores con 0 asistencias
    const conteoAsistencias = {};

    jugadoresArray.forEach(j => {
        conteoAsistencias[j.alias] = 0;
    });

    // Mapa dorsal -> alias
    const mapaJugadores = {};

    jugadoresArray.forEach(j => {
        mapaJugadores[String(j.dorsal).trim()] = j.alias;
    });

    // Contar asistencias
    asistenciasData.forEach(fila => {

        const dorsal = fila.dorsal_asistente
            ? String(fila.dorsal_asistente).trim()
            : "";

        if (mapaJugadores[dorsal]) {
            conteoAsistencias[mapaJugadores[dorsal]]++;
        }

    });

    // Filtrar jugadores con 0 asistencias y ordenar de mayor a menor
    const items = Object.entries(conteoAsistencias)
        .filter(([, asistencias]) => asistencias > 0)
        .sort((a,b)=>b[1]-a[1]);

    if (items.length === 0) {
        if (window.miGraficoAsistencias) {
            window.miGraficoAsistencias.destroy();
        }
        return;
    }

    const nombresJugadores = items.map(i=>i[0]);
    const asistenciasJugadores = items.map(i=>i[1]);

    const totalAsistencias =
        asistenciasJugadores.reduce((a,b)=>a+b,0);

    const ctx =
        document
        .getElementById("graficaAsistenciasPorJugador")
        .getContext("2d");

    if(window.miGraficoAsistencias){
        window.miGraficoAsistencias.destroy();
    }

    window.miGraficoAsistencias = new Chart(ctx,{

        type:"bar",

        plugins:[ChartDataLabels],

        data:{

            labels:nombresJugadores,

            datasets:[{

                data:asistenciasJugadores,

                backgroundColor:"#FFC107",

                borderRadius:8,

                barThickness:20

            }]

        },

        options:{

            indexAxis:"y",

            responsive:true,

            maintainAspectRatio:false,

            animation:false,

            plugins:{

                legend:{
                    display:false
                },

                title:{
                    display:false
                },

                datalabels:{

                    anchor:"center",

                    align:"center",

                    color:"#fff",

                    formatter:(value)=>{

                        if(value===0) return "";

                        const porcentaje =
                            ((value/totalAsistencias)*100).toFixed(1);

                        return `${value} · ${porcentaje}%`;

                    },

                    font:{
                        weight:"bold",
                        size:11
                    }

                }

            },

            scales:{

                x:{

                    beginAtZero:true,

                    ticks:{
                        color:"#333",
                        precision:0,
                        font:{
                            size:11,
                            weight:"600"
                        }
                    },

                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }

                },

                y:{

                    ticks:{
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        }
                    },

                    grid:{
                        display:false
                    }

                }

            }

        }

    });

}


function generarGraficaPosicionJornada(partidos, nombreEquipo, canvasId = 'graficaPosicion') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !nombreEquipo) return; // Protección: si no hay equipo, salimos

    const partidosLiga = partidos.filter(p => /^\d+$/.test(p.jornada) && p.goles_local !== "");
    const maxJornada = Math.max(...partidosLiga.map(p => parseInt(p.jornada)));
    
    const etiquetas = [];
    const posiciones = [];
    
    // Limpiamos el nombre buscado una sola vez fuera del bucle
    const nombreBuscado = nombreEquipo.trim().toLowerCase();

    for (let j = 1; j <= maxJornada; j++) {
        const tabla = calcularClasificacion(partidos, j + 1); 
        
        // Protección extra: aseguramos que tabla sea un objeto válido
        if (!tabla) continue;
        
        const tablaOrdenada = Object.keys(tabla).map(nombre => ({
            nombre: nombre,
            // Usamos ?. (encadenamiento opcional) por si alguna propiedad falta
            pts: tabla[nombre]?.pts || 0,
            dg: (tabla[nombre]?.gf || 0) - (tabla[nombre]?.gc || 0)
        })).sort((a, b) => b.pts - a.pts || b.dg - a.dg);

        const puesto = tablaOrdenada.findIndex(e => {
            if (!e.nombre) return false;
            return e.nombre.trim().toLowerCase() === nombreBuscado;
        }) + 1;
        
        if (puesto > 0) {
            etiquetas.push(`J-${j}`);
            posiciones.push(puesto);
        }
    }

    // ... resto de tu código de Chart.js
    if (!window.chartInstances) window.chartInstances = {};
    if (window.chartInstances[canvasId]) window.chartInstances[canvasId].destroy();

    window.chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Posición',
                data: posiciones,
                borderColor: '#1842B7',
                tension: 0.3
            }]
        },
       options: {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 200,
            plugins: {
                legend: {
                    labels: {
                        color: '#000000', // Etiquetas en blanco
                        font: { size: 14 }
                    }
                }
            },
            scales:{

                x:{
                    ticks:{
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        },
                        autoSkip:false,
                        maxRotation:45,
                        minRotation:0,
                        align:'start'
                    },
                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }
                },

                y:{
                    min: 1,
                    max: 12,
                    reverse: true,
                    ticks:{
                        stepSize: 1,
                        color:"#333",
                        font:{
                            size:12,
                            weight:"600"
                        }
                    },
                    grid:{
                        color:"rgba(0,0,0,.08)"
                    }
                }

            }
        }
    });
}

// =====================================
// ESTADÍSTICAS POR ÁRBITRO
// =====================================

function crearEstadisticasArbitros(partidos){

    const estadisticas = {};

    partidos.forEach(p=>{

        if(
            !p.arbitro ||
            p.goles_local === "" ||
            p.goles_visitante === ""
        ){
            return;
        }

        if(!estadisticas[p.arbitro]){

            estadisticas[p.arbitro] = {
                pj:0,
                v:0,
                e:0,
                d:0
            };

        }

        const gl = Number(p.goles_local);
        const gv = Number(p.goles_visitante);

        const esLocal = p.local.trim() === nombreMiEquipo;

        estadisticas[p.arbitro].pj++;

        if(gl === gv){

            estadisticas[p.arbitro].e++;

        }else if(

            (esLocal && gl > gv) ||
            (!esLocal && gv > gl)

        ){

            estadisticas[p.arbitro].v++;

        }else{

            estadisticas[p.arbitro].d++;

        }

    });

    const contenedor = document.getElementById("estadisticas-arbitros");

    contenedor.innerHTML = "";

    Object.entries(estadisticas)

    .sort((a,b)=>{

        const pa = a[1].pj ? a[1].v/a[1].pj : 0;
        const pb = b[1].pj ? b[1].v/b[1].pj : 0;

        return pb-pa;

    })

    .forEach(([arbitro,d])=>{

        const porcentaje =
            d.pj ? Math.round((d.v/d.pj)*100) : 0;

        contenedor.innerHTML += `

            <div class="fila-arbitro"
                 data-arbitro="${arbitro}">

                <span class="nombre-arbitro">
                    ${arbitro}
                </span>

                <span class="balance-arbitro">
                    <span class="verde">🟢 ${d.v}</span>
                    <span class="amarillo">🟡 ${d.e}</span>
                    <span class="rojo">🔴 ${d.d}</span>
                </span>

                <span class="porcentaje-arbitro">
                    ${porcentaje}%
                </span>

            </div>

        `;

    });

    // ===========================
    // CLICK EN UN ÁRBITRO
    // ===========================

    document.querySelectorAll(".fila-arbitro").forEach(fila=>{

        fila.onclick=()=>{

            const arbitro = fila.dataset.arbitro;

            const partidosArbitro = partidos.filter(p=>

                p.arbitro === arbitro &&
                p.goles_local !== "" &&
                p.goles_visitante !== ""

            );

            document.getElementById("tituloModal").textContent =
                `Partidos arbitrados por ${arbitro}`;

            const lista = document.getElementById("listaModal");

            lista.innerHTML = "";

            partidosArbitro.forEach(p=>{

                lista.innerHTML += `
                    <div class="partido-modal">

                        <span class="equipo-local">
                            ${p.local}
                        </span>

                        <span class="resultado-modal"
                            onclick="window.location.href='partido.html?id=${encodeURIComponent(p.id)}'">
                            ${p.goles_local} - ${p.goles_visitante}
                        </span>

                        <span class="equipo-visitante">
                            ${p.visitante}
                        </span>

                    </div>
                `;

            });

            document
                .getElementById("modalPartidos")
                .classList
                .add("visible");

        };

    });

}

function obtenerTemporadaActual(partidos){
    const temporadas = partidos
        .map(p => p.temporada)
        .filter(t => t)
        .map(String)
        .map(t => t.trim())
        .filter(Boolean);

    return temporadas.sort().pop();
}


function csvToJSON(csv) {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // --- AÑADE ESTA LÍNEA PARA VER EN CONSOLA ---
    console.log("Encabezados detectados:", headers); 
    // ---------------------------------------------
    
    return lines.slice(1).filter(l => l.trim() !== "").map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : "";
        });
        return obj;
    });
}

window.cerrarCuadro = function() {
    const contenedorLista = document.getElementById('lista-partidos');
    if (contenedorLista) {
        contenedorLista.style.display = 'none';
    }
};