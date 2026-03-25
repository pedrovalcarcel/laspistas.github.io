// 1. Obtener el nombre del equipo de la URL
const urlParams = new URLSearchParams(window.location.search);
const nombreEquipo = urlParams.get('nombre');

document.addEventListener("DOMContentLoaded", async () => {
    if (!nombreEquipo) {
        document.getElementById('tituloEquipo').innerText = "Equipo no encontrado";
        return;
    }

    document.getElementById('tituloEquipo').innerText = nombreEquipo;

    // 2. Cargar los datos (Asumiendo que 'partidos.csv' es tu fuente y 'csvToJSON' está global)
    try {
        const res = await fetch(urlPartidosCSV);
        const csvText = await res.text();
        const partidos = csvToJSON(csvText);
        const partidosLiga = partidos.filter(p => !isNaN(parseInt(p.jornada)));
        const equiposLiga = [...new Set(
            partidosLiga.map(p => p.local).concat(partidosLiga.map(p => p.visitante))
        )].filter(nombre => nombre && nombre.trim() !== ""); // Limpieza extra


        const partidosEquipo = partidos.filter(p => 
            (p.local === nombreEquipo || p.visitante === nombreEquipo) 
        );
        partidosEquipo.sort((a, b) => parseInt(b.jornada) - parseInt(a.jornada));

        mostrarListaPartidos(partidosEquipo);
        pintarRacha(partidosEquipo, nombreEquipo);

        // Solo llama a las gráficas que existen en equipo.html
        // Asegúrate de que los IDs coincidan exactamente con tu HTML
        generarGraficaEvolucion(partidosEquipo, nombreEquipo, 'graficaPuntosEquipo');
        generarGraficaPosicionJornada(partidos, nombreEquipo, 'graficaPosicionEquipo');
        inicializarComparador(equiposLiga, nombreEquipo,partidosLiga);
        
        // NO llames a generarGraficaVictoriasPorHora aquí a menos que tengas ese canvas en equipo.html
    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
});

// --- Funciones auxiliares ---

function mostrarListaPartidos(partidos) {
    const lista = document.getElementById('listaPartidosEquipo');
    lista.innerHTML = '';

    partidos.forEach(p => {
        const li = document.createElement('li');
        li.className = 'partido-item';
        
        // Link equipo local
        const linkLocal = `<a href="equipo.html?nombre=${encodeURIComponent(p.local)}" class="link-equipo">${p.local}</a>`;
        // Link goles al acta
        const linkActa = `<a href="partido.html?id=${p.id}" class="link-acta">${p.goles_local} - ${p.goles_visitante}</a>`;
        // Link equipo visitante
        const linkVisitante = `<a href="equipo.html?nombre=${encodeURIComponent(p.visitante)}" class="link-equipo">${p.visitante}</a>`;

        li.innerHTML = `J-${p.jornada}: ${linkLocal} ${linkActa} ${linkVisitante}`;
        lista.appendChild(li);
    });
}

function pintarRacha(partidos, nombre) {
    const contenedor = document.getElementById('racha');
    contenedor.innerHTML = ''; 
    partidosConResultado = partidos.filter(p => p.goles_local !== ""); // Solo partidos con resultado registrado
    const ultimos5 = partidosConResultado.slice(0, 5).reverse();

    ultimos5.forEach(p => {
        const golesL = parseInt(p.goles_local);
        const golesV = parseInt(p.goles_visitante);
        let resultado = "";

        if (p.local === nombre) {
            resultado = (golesL > golesV) ? "win" : (golesL < golesV) ? "loss" : "draw";
        } else {
            resultado = (golesV > golesL) ? "win" : (golesV < golesL) ? "loss" : "draw";
        }
        
        const span = document.createElement('span');
        span.className = `resultado-item ${resultado}`;
        span.textContent = resultado === 'win' ? 'V' : resultado === 'draw' ? 'E' : 'D';
        contenedor.appendChild(span);
    });
}

function inicializarComparador(equipos, equipoActual, todosLosPartidos) {
    const selector = document.getElementById('selectorComparar');
    const contenedor = document.getElementById('contenedorComparacion');

    // Rellenar el select (solo equipos de liga)
    equipos.sort().forEach(equipo => {
        if (equipo !== equipoActual) {
            const option = document.createElement('option');
            option.value = equipo;
            option.textContent = equipo;
            selector.appendChild(option);
        }
    });

    selector.addEventListener('change', (e) => {
        const equipoSel = e.target.value;
        if (!equipoSel) { contenedor.innerHTML = ''; return; }

        // 1. Obtener clasificación completa para calcular posiciones
        const tabla = calcularClasificacion(todosLosPartidos);
        const listaRanking = Object.entries(tabla)
            .map(([nombre, stats]) => ({ nombre, ...stats }))
            .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

        const getPos = (nombre) => listaRanking.findIndex(e => e.nombre === nombre) + 1;
        
        const posActual = getPos(equipoActual);
        const posSel = getPos(equipoSel);

        // 2. Calcular Stats (usando tu función calcularStatsBasicas que ya tienes)
        const statsActual = calcularStatsBasicas(equipoActual, todosLosPartidos);
        const statsSel = calcularStatsBasicas(equipoSel, todosLosPartidos);

        // 2. Obtener enfrentamientos previos (H2H)
        const h2h = todosLosPartidos.filter(p => 
            ((p.local === equipoActual && p.visitante === equipoSel) || 
             (p.local === equipoSel && p.visitante === equipoActual)) &&
            p.goles_local !== ""
        );

        // 3. Obtener Racha del equipo seleccionado (últimos 5)
        const rachaSel = todosLosPartidos
            .filter(p => (p.local === equipoSel || p.visitante === equipoSel) && p.goles_local !== "")
            .sort((a, b) => parseInt(b.jornada) - parseInt(a.jornada))
            .slice(0, 5)
            .reverse();

        // 4. Renderizar HTML
        const colorPos = posActual < posSel ? "#28a745" : (posActual > posSel ? "#dc3545" : "white");
        const colorPosSel = posSel < posActual ? "#28a745" : (posSel > posActual ? "#dc3545" : "white");
        const colorPtos = getColor(statsActual.puntos, statsSel.puntos);
        const colorGF = getColor(statsActual.gf, statsSel.gf);
        const colorGC = getColor(statsActual.gc, statsSel.gc, true);

        contenedor.innerHTML = `
            <div class="comparacion-box">
                <h4>
                    <a href="equipo.html?nombre=${encodeURIComponent(equipoActual)}" class="link-comparar">${equipoActual}</a> 
                    vs 
                    <a href="equipo.html?nombre=${encodeURIComponent(equipoSel)}" class="link-comparar">${equipoSel}</a>
                </h4>
                <div class="stat-row">
                    <span class="val" style="color:${colorPos}">${posActual}º</span>
                    <span class="lab">POSICIÓN</span>
                    <span class="val" style="color:${colorPosSel}">${posSel}º</span>
                </div>
                <div class="stat-row">
                    <span class="val" style="color:${colorPtos}">${statsActual.puntos}</span>
                    <span class="lab">PUNTOS</span>
                    <span class="val" style="color:${statsSel.puntos > statsActual.puntos ? '#28a745' : statsSel.puntos < statsActual.puntos ? '#dc3545' : 'white'}">${statsSel.puntos}</span>
                </div>
                <div class="stat-row">
                    <span class="val" style="color:${colorGF}">${statsActual.gf}</span>
                    <span class="lab">GOLES FAVOR</span>
                    <span class="val" style="color:${statsSel.gf > statsActual.gf ? '#28a745' : statsSel.gf < statsActual.gf ? '#dc3545' : 'white'}">${statsSel.gf}</span>
                </div>
                <div class="stat-row">
                    <span class="val" style="color:${colorGC}">${statsActual.gc}</span>
                    <span class="lab">GOLES CONTRA</span>
                    <span class="val" style="color:${statsSel.gc < statsActual.gc ? '#28a745' : statsSel.gc > statsActual.gc ? '#dc3545' : 'white'}">${statsSel.gc}</span>
                </div>

                <h5>Enfrentamientos Previos</h5>
                <ul class="h2h-lista">
                    ${h2h.length > 0 ? h2h.map(p => `
                        <li>J-${p.jornada}: 
                            <a href="partido.html?id=${p.id}">
                                ${p.local} ${p.goles_local} - ${p.goles_visitante} ${p.visitante}
                            </a>
                        </li>
                    `).join('') : '<li>No hay duelos previos</li>'}
                </ul>
            </div>
        `;

        // Pintar la racha mini del equipo comparado
        const rachaDiv = document.getElementById('rachaComparado');
        rachaSel.forEach(p => {
            const res = obtenerResultado(p, equipoSel);
            const span = document.createElement('span');
            span.className = `cuadrado-resultado mini ${res}`;
            span.textContent = res.toUpperCase().charAt(0);
            rachaDiv.appendChild(span);
        });
    });
}

// Función auxiliar para calcular todo de una vez
function calcularStatsEquipo(nombre, partidos, listaEquipos) {
    // Calculamos estadísticas de todos para saber el ranking
    const ranking = listaEquipos.map(eq => {
        const stats = calcularStatsBasicas(eq, partidos);
        return { nombre: eq, ...stats };
    }).sort((a, b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc));

    const posicion = ranking.findIndex(e => e.nombre === nombre) + 1;
    const stats = calcularStatsBasicas(nombre, partidos);
    
    return { ...stats, posicion };
}

// Función auxiliar simple para no repetir código
function calcularStatsBasicas(nombre, partidos) {
    let puntos = 0, gf = 0, gc = 0;
    partidos.filter(p => (p.local === nombre || p.visitante === nombre) && p.goles_local !== "").forEach(p => {
        const gl = parseInt(p.goles_local), gv = parseInt(p.goles_visitante);
        if (p.local === nombre) { gf += gl; gc += gv; puntos += (gl > gv ? 3 : gl === gv ? 1 : 0); }
        else { gf += gv; gc += gl; puntos += (gv > gl ? 3 : gv === gl ? 1 : 0); }
    });
    return { puntos, gf, gc };
}

function obtenerResultado(p, nombre) {
    const gl = parseInt(p.goles_local);
    const gv = parseInt(p.goles_visitante);
    if (p.local === nombre) return (gl > gv) ? "v" : (gl < gv) ? "d" : "e";
    return (gv > gl) ? "v" : (gv < gl) ? "d" : "e";
}

function getColor(val1, val2, esContra = false) {
    if (val1 === val2) return "white";
    if (esContra) {
        return val1 < val2 ? "#28a745" : "#dc3545"; // Menor es mejor
    }
    return val1 > val2 ? "#28a745" : "#dc3545"; // Mayor es mejor
}
