// 1. Configuración de URLs
// Usamos la URL de tu Spreadsheet (pestaña de resultados/partidos)

const urlPartidosCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";
const urlGolesCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=1785101781&single=true&output=csv";
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
    entrenarIA(datosPartidos, mapaPoder, listaArbitros);
    
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
        const golesData = csvToJSON(await resGoles.text());
        
        // 3. Obtenemos el JSON y nos aseguramos de que sea un array
        const rawJugadores = await resJugadores.json();
        const jugadores = Array.isArray(rawJugadores) ? rawJugadores : [rawJugadores];

        console.log("Datos cargados correctamente:", { partidos, golesData, jugadores });

        // 4. Dibujamos las gráficas
        generarGraficaEvolucion(partidos, nombreMiEquipo,'graficaPuntos');
        generarGraficaVictoriasPorHora(partidos);
        
        // Pasamos ambos argumentos: los goles (CSV) y la lista (Array) de jugadores
        generarGraficaGolesPorJugador(golesData, jugadores);
        generarGraficaAsistenciasPorJugador(golesData, jugadores); 
        generarGraficaPosicionJornada(partidos, nombreMiEquipo, 'graficaPosicion');
        
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
                borderColor: '#0d93e0',
                backgroundColor: 'rgba(13, 147, 224, 0.2)',
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
                legend: { labels: { color: '#ffffff', font: { size: 14 } } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#ffffff', stepSize: 3, font: { size: 10 } } },
                x: { ticks: { color: '#ffffff', font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}
function generarGraficaVictoriasPorHora(partidos) {
    const statsHora = {};

    // 1. Filtrado y agrupación
    partidos.filter(p => (p.local === "Las Pistas FC" || p.visitante === "Las Pistas FC") && p.goles_local !== "")
            .forEach(p => {
                const hora = p.hora;
                if (!statsHora[hora]) statsHora[hora] = { totales: 0, victorias: 0, partidos: [] };
                
                statsHora[hora].partidos.push(p);
                statsHora[hora].totales++;
                
                const golesL = parseInt(p.goles_local);
                const golesV = parseInt(p.goles_visitante);
                if ((p.local === "Las Pistas FC" && golesL > golesV) || 
                    (p.visitante === "Las Pistas FC" && golesV > golesL)) {
                    statsHora[hora].victorias++;
                }
            });

    const labelsOrdenadas = Object.keys(statsHora).sort((a, b) => {
        const horaA = parseInt(a.split(':')[0]);
        const horaB = parseInt(b.split(':')[0]);
        return horaA - horaB;
    });

    const porcentajes = labelsOrdenadas.map(h => (statsHora[h].victorias / statsHora[h].totales) * 100);

    const ctx = document.getElementById('graficaVictoriasHora').getContext('2d');
    if (window.miGraficoVictorias) window.miGraficoVictorias.destroy();

    // 2. Creación del gráfico
    window.miGraficoVictorias = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
            labels: labelsOrdenadas,
            datasets: [{
                label: '% Victorias',
                data: porcentajes,
                backgroundColor: '#0d93e0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            hover: {
                mode: null
            },
            plugins: {
                tooltip: {
                    enabled:false
                },
                datalabels: {
                    color: '#ffffff',
                    anchor: 'center',
                    align: 'center',
                    formatter: (value, context) => {
                        const h = labelsOrdenadas[context.dataIndex];
                        return `${statsHora[h].victorias}/${statsHora[h].totales}`;
                    },
                    font: { weight: 'bold', size: 10 }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: 'white' } },
                x: { ticks: { color: 'white' } }
            }
        }
    });

    // 3. EVENTO DE CLIC EXTERNO (A prueba de errores)
    // Usamos el contenedor padre del canvas para evitar que Chart.js bloquee el clic
    const contenedorGrafica = document.querySelector('.contenedor-grafica-horas');
    
    contenedorGrafica.onclick = (evt) => {
        // Solo actuamos si el clic fue específicamente sobre el canvas
        if (evt.target.id !== 'graficaVictoriasHora') return;

        const rect = ctx.canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const xAxis = window.miGraficoVictorias.scales.x;
        const index = xAxis.getValueForPixel(x);

        if (index !== undefined && labelsOrdenadas[index]) {
            const horaSeleccionada = labelsOrdenadas[index];
            const listaPartidos = statsHora[horaSeleccionada].partidos;

            // Construir HTML centrado
            let html = `<h4 style="margin-top:0;">Partidos a las ${horaSeleccionada}:</h4>
                        <ul style="list-style-type: none; padding: 0; margin: 0 auto; display: inline-block; text-align: left;">`; 

            listaPartidos.forEach(p => {
                html += `<li style="margin-bottom: 5px;">${p.local} ${p.goles_local} - ${p.goles_visitante} ${p.visitante}</li>`;
            });
            html += `</ul>`;

            // Añadir el botón de cierre
            html += `<br><button class="boton-cerrar" onclick="cerrarCuadro()" 
                    style="background: yellow; color: black; border: none; padding: 5px 15px; cursor: pointer; border-radius: 4px; font-weight: bold;">
                    Cerrar</button>`;
            
            const contenedorLista = document.getElementById('lista-partidos');
            if (contenedorLista) {
                contenedorLista.innerHTML = html;
                
                // Estilos de posicionamiento para centrar el cuadro en pantalla
                contenedorLista.style.position = 'fixed'; 
                contenedorLista.style.top = '50%';
                contenedorLista.style.left = '50%';
                contenedorLista.style.transform = 'translate(-50%, -50%)';
                contenedorLista.style.zIndex = '99999';
                contenedorLista.style.background = 'black';
                contenedorLista.style.color = 'white';
                contenedorLista.style.padding = '25px';
                contenedorLista.style.border = '3px solid yellow';
                contenedorLista.style.borderRadius = '12px';
                contenedorLista.style.textAlign = 'center'; // Centra el contenido interior
                contenedorLista.style.display = 'block';
            }
        }
                }

            }


function generarGraficaGolesPorJugador(golesData, listaJugadores) {
    // 1. Acceso seguro a la lista de jugadores (tu estructura es un array que contiene un objeto con la propiedad 'jugadores')
    const jugadoresArray = (listaJugadores && listaJugadores[0] && listaJugadores[0].jugadores) ? listaJugadores[0].jugadores : [];

    const mapaJugadores = {};
    jugadoresArray.forEach(j => {
        if (j.dorsal && j.alias) {
            mapaJugadores[String(j.dorsal).trim()] = j.alias.trim();
        }
    });

    // 2. Procesamiento de goles
    const conteoGoles = {};
    golesData.forEach(fila => {
        const dorsal = fila.dorsal_goleador ? String(fila.dorsal_goleador).trim() : null;
        if (dorsal) {
            const nombre = mapaJugadores[dorsal] || `Dorsal ${dorsal}`;
            conteoGoles[nombre] = (conteoGoles[nombre] || 0) + 1;
        }
    });

    // 3. Ordenar datos de mayor a menor (Top Goleadores)
    const items = Object.keys(conteoGoles).map(nombre => ({
        nombre: nombre,
        goles: conteoGoles[nombre]
    }));
    items.sort((a, b) => b.goles - a.goles);

    const labels = items.map(item => item.nombre);
    const data = items.map(item => item.goles);
    const totalGoles = data.reduce((a, b) => a + b, 0);

    // 4. Paleta de 16 colores fijos de alto contraste
    const paletaColores = [
        '#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', 
        '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE', 
        '#008080', '#E6BEFF', '#9A6324', '#FFFAC8', '#800000', '#AAFFC3'
    ];

    // 5. Dibujar gráfico
    const ctx = document.getElementById('graficaGolesPorJugador').getContext('2d');
    if (window.miGraficoGoles) window.miGraficoGoles.destroy();

    window.miGraficoGoles = new Chart(ctx, {
        type: 'pie',
        plugins: [ChartDataLabels],
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map((_, index) => paletaColores[index % paletaColores.length]),
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    color: '#ffffff',
                    weight: 'bold',
                    text: 'Goles por Jugador',
                },
                legend: { 
                    position: 'right', 
                    labels: { color: '#ffffff', font: { size: 12 } } 
                },
                datalabels: {
                    color: '#000000',
                    font: { weight: 'bold' },
                    formatter: (value) => {
                        const pct = ((value / totalGoles) * 100).toFixed(0);
                        return `${value}g (${pct}%)`;
                    }
                }
            }
        }
    });
}

function generarGraficaAsistenciasPorJugador(asistenciasData, listaJugadores) {
    // 1. Acceso seguro a la lista de jugadores
    const jugadoresArray = (listaJugadores && listaJugadores[0] && listaJugadores[0].jugadores) ? listaJugadores[0].jugadores : [];

    const mapaJugadores = {};
    jugadoresArray.forEach(j => {
        if (j.dorsal && j.alias) {
            mapaJugadores[String(j.dorsal).trim()] = j.alias.trim();
        }
    });

    // 2. Procesamiento de asistencias (CAMBIO AQUÍ: dorsal_asistente)
    const conteoAsistencias = {};
    asistenciasData.forEach(fila => {
        const dorsal = fila.dorsal_asistente ? String(fila.dorsal_asistente).trim() : null;
        if (dorsal) {
            const nombre = mapaJugadores[dorsal] || `Dorsal ${dorsal}`;
            conteoAsistencias[nombre] = (conteoAsistencias[nombre] || 0) + 1;
        }
    });

    // 3. Ordenar datos
    const items = Object.keys(conteoAsistencias).map(nombre => ({
        nombre: nombre,
        asistencias: conteoAsistencias[nombre]
    }));
    items.sort((a, b) => b.asistencias - a.asistencias);

    const labels = items.map(item => item.nombre);
    const data = items.map(item => item.asistencias);
    const totalAsistencias = data.reduce((a, b) => a + b, 0);

    // 4. Dibujar gráfico (Asegúrate de tener un canvas con id='graficaAsistenciasPorJugador')
    const ctx = document.getElementById('graficaAsistenciasPorJugador').getContext('2d');
    if (window.miGraficoAsistencias) window.miGraficoAsistencias.destroy();

    window.miGraficoAsistencias = new Chart(ctx, {
        type: 'pie',
        plugins: [ChartDataLabels],
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', 
                    '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE'
                ],
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    color: '#ffffff',
                    weight: 'bold',
                    text: 'Asistencias por Jugador',
                },
                legend: { position: 'right', labels: { color: '#ffffff' } },
                datalabels: {
                    color: '#000000',
                    font: { weight: 'bold' },
                    formatter: (value) => {
                        const pct = ((value / totalAsistencias) * 100).toFixed(0);
                        // CAMBIO: ahora mostramos 'a' de asistencias en lugar de 'g'
                        return `${value}a (${pct}%)`;
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
                borderColor: '#FFD700',
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
                        color: '#ffffff', // Etiquetas en blanco
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,
                    min: 1,
                    max: 12,
                    ticks: {
                        color: '#ffffff', // Números del eje Y en blanco
                        stepSize: 1
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' } // Líneas suaves
                },
                x: {
                    ticks: {
                        color: '#ffffff', // Etiquetas del eje X en blanco
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
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