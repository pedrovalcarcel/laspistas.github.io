// 1. Obtener el nombre del equipo de la URL
const urlParams = new URLSearchParams(window.location.search);
const nombreEquipo = urlParams.get('nombre');
const temporadaEquipo = urlParams.get('temporada') || obtenerTemporadaActualCsv();

function normalizarNombreEquipo(nombre) {
    return String(nombre || '').trim().toLocaleLowerCase('es');
}

function urlEquipo(nombre) {
    const parametros = new URLSearchParams({ nombre, temporada: temporadaEquipo });
    return `equipo.html?${parametros.toString()}`;
}

function urlPartidoEquipo(id) {
    const parametros = new URLSearchParams({ id, temporada: temporadaEquipo });
    return `partido.html?${parametros.toString()}`;
}

// Convierte el nombre del equipo en el nombre de archivo de su
// escudo (misma lógica que en clasificacion.js/historico.js, para
// que los nombres de archivo coincidan en todo el proyecto).
function obtenerNombreArchivoEscudo(equipo) {
    return equipo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

function mostrarEscudoEquipo(equipo) {

    const img = document.getElementById('escudoEquipoPagina');

    if (!img || !equipo) {
        return;
    }

    const nombreArchivo = obtenerNombreArchivoEscudo(equipo);

    img.alt = `Escudo de ${equipo}`;
    img.src = `img/equipos/${nombreArchivo}.png`;

    // Si no existe el .png, probamos con .jpg; si tampoco, ocultamos
    // el hueco del escudo en vez de dejar un icono de imagen rota.
    img.onerror = () => {
        img.onerror = () => {
            img.style.display = 'none';
        };
        img.src = `img/equipos/${nombreArchivo}.jpg`;
    };

}

document.addEventListener("DOMContentLoaded", async () => {
    if (!nombreEquipo) {
        document.getElementById('tituloEquipo').innerText = "Equipo no encontrado";
        document.getElementById('tituloEquipoPagina').innerText = "Equipo no encontrado";
        return;
    }

    document.getElementById('tituloEquipo').innerText = nombreEquipo;
    document.getElementById('tituloEquipoPagina').innerText = nombreEquipo;
    mostrarEscudoEquipo(nombreEquipo);


    // 2. Cargar los datos (Asumiendo que 'partidos.csv' es tu fuente y 'csvToJSON' está global)
    try {
        let partidosTemporada = null;
        try {
            const datosHistorico = JSON.parse(sessionStorage.getItem("equipoDesdeHistorico") || "null");
            sessionStorage.removeItem("equipoDesdeHistorico");
            if (datosHistorico?.temporada === temporadaEquipo && Array.isArray(datosHistorico.partidos)) {
                partidosTemporada = datosHistorico.partidos;
            }
        } catch (error) {
            console.warn("No se pudieron leer los partidos recibidos desde el histórico.", error);
        }

        // Al entrar desde otra sección, cargar la pestaña de la temporada
        // correspondiente y aplicar el mismo filtro que usa el histórico.
        if (!partidosTemporada) {
            const res = await fetchChecked(obtenerUrlPartidosTemporada(temporadaEquipo));
            const csvText = await res.text();
            const partidos = csvToJSON(csvText);
            partidosTemporada = filtrarPartidosPorTemporada(partidos, temporadaEquipo);
        }
        if (partidosTemporada.length === 0) {
            throw new Error(`La hoja de ${temporadaEquipo} no contiene partidos para mostrar.`);
        }
        const partidosLiga = partidosTemporada.filter(p =>
            /^\d+$/.test(String(p.jornada || "").trim())
        );
        const equiposLiga = [...new Set(
            partidosLiga.map(p => p.local).concat(partidosLiga.map(p => p.visitante))
        )].filter(nombre => nombre && nombre.trim() !== ""); // Limpieza extra

        const nombreBuscado = normalizarNombreEquipo(nombreEquipo);
        const partidosEquipo = partidosTemporada.filter(p =>
            normalizarNombreEquipo(p.local) === nombreBuscado ||
            normalizarNombreEquipo(p.visitante) === nombreBuscado
        );
        partidosEquipo.sort((a, b) => parseInt(b.jornada) - parseInt(a.jornada));

        mostrarListaPartidos(partidosEquipo);
        pintarRacha(partidosEquipo, nombreEquipo);

        // Solo llama a las gráficas que existen en equipo.html
        // Asegúrate de que los IDs coincidan exactamente con tu HTML
        generarGraficaEvolucion(partidosEquipo, nombreEquipo, 'graficaPuntosEquipo');
        generarGraficaPosicionJornada(partidosTemporada, nombreEquipo, 'graficaPosicionEquipo');
        inicializarComparador(equiposLiga, nombreEquipo,partidosLiga);
        inicializarExpandirGraficas();

        if (partidosEquipo.length === 0) {
            const lista = document.getElementById('listaPartidosEquipo');
            if (lista) {
                const aviso = document.createElement('p');
                aviso.className = 'sin-datos';
                aviso.textContent = `No hay partidos de ${nombreEquipo} en la temporada ${temporadaEquipo}.`;
                lista.replaceChildren(aviso);
            }
        }
        
        // NO llames a generarGraficaVictoriasPorHora aquí a menos que tengas ese canvas en equipo.html
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        const lista = document.getElementById('listaPartidosEquipo');
        if (lista) {
            const aviso = document.createElement('p');
            aviso.className = 'sin-datos';
            aviso.textContent = `No se pudieron cargar los datos de ${temporadaEquipo}.`;
            lista.replaceChildren(aviso);
        }
    }
});

function inicializarExpandirGraficas() {
    const wrappers = document.querySelectorAll('.pagina-equipo .grafica-wrapper:not(.racha-wrapper)');

    wrappers.forEach(wrapper => {
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return;

        wrapper.style.cursor = 'zoom-in';
        wrapper.addEventListener('click', () => {
            const expanded = wrapper.classList.toggle('enlarged');
            wrapper.style.cursor = expanded ? 'zoom-out' : 'zoom-in';

            const chart = window.chartInstances?.[canvas.id];
            if (chart && typeof chart.resize === 'function') {
                setTimeout(() => chart.resize(), 50);
            }
        });
    });
}

// --- Funciones auxiliares ---

function mostrarListaPartidos(partidos) {
    const lista = document.getElementById('listaPartidosEquipo');
    lista.innerHTML = '';

    partidos.forEach(p => {
        const li = document.createElement('li');
        li.className = 'partido-item';
        
        // Link equipo local
        const linkLocal = `<a href="${urlEquipo(p.local)}" class="link-equipo">${p.local}</a>`;
        // Link goles al acta
        const linkActa = `<a href="${urlPartidoEquipo(p.id)}" class="link-acta">${p.goles_local} - ${p.goles_visitante}</a>`;
        // Link equipo visitante
        const linkVisitante = `<a href="${urlEquipo(p.visitante)}" class="link-equipo">${p.visitante}</a>`;

        li.innerHTML = `J-${p.jornada}: ${linkLocal} ${linkActa} ${linkVisitante}`;
        lista.appendChild(li);
    });
}

function pintarRacha(partidos, nombre) {
    const contenedor = document.getElementById('racha');
    if (!contenedor) return;

    contenedor.className = 'racha';
    contenedor.innerHTML = '';

    const partidosConResultado = partidos.filter(
        p => p.goles_local !== "" && p.goles_visitante !== ""
    );

    const ultimos5 = partidosConResultado.reverse().slice(-5);

    if (ultimos5.length === 0) {
        contenedor.innerHTML = '<p class="sin-datos">No hay resultados recientes.</p>';
        return;
    }

    const html = ultimos5.map(p => {
        const golesL = parseInt(p.goles_local, 10);
        const golesV = parseInt(p.goles_visitante, 10);
        const esLocal = p.local === nombre;

        let claseResultado = 'racha-e';
        let letra = 'E';

        if ((esLocal && golesL > golesV) || (!esLocal && golesV > golesL)) {
            claseResultado = 'racha-v';
            letra = 'V';
        } else if ((esLocal && golesL < golesV) || (!esLocal && golesV < golesL)) {
            claseResultado = 'racha-d';
            letra = 'D';
        }

        return `
            <a href="${urlPartidoEquipo(p.id)}" style="text-decoration:none;">
                <div class="partido-racha ${claseResultado}" data-id="${p.id}">
                    ${letra}
                </div>
            </a>
        `;
    }).join('');

    contenedor.innerHTML = html;

    if (typeof activarTooltipsRacha === "function") {
        activarTooltipsRacha(contenedor, partidos);
    }
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
        contenedor.innerHTML = `
            <div class="comparacion-box">
                <h4>
                    <a href="${urlEquipo(equipoActual)}" class="link-comparar">${equipoActual}</a> 
                    vs 
                    <a href="${urlEquipo(equipoSel)}" class="link-comparar">${equipoSel}</a>
                </h4>
                <div class="stat-row">
                    <span class="val">${posActual}º</span>
                    <span class="lab">POSICIÓN</span>
                    <span class="val">${posSel}º</span>
                </div>
                <div class="stat-row">
                    <span class="val">${statsActual.puntos}</span>
                    <span class="lab">PUNTOS</span>
                    <span class="val">${statsSel.puntos}</span>
                </div>
                <div class="stat-row">
                    <span class="val">${statsActual.gf}</span>
                    <span class="lab">GOLES FAVOR</span>
                    <span class="val">${statsSel.gf}</span>
                </div>
                <div class="stat-row">
                    <span class="val">${statsActual.gc}</span>
                    <span class="lab">GOLES CONTRA</span>
                    <span class="val">${statsSel.gc}</span>
                </div>

                <h5>Enfrentamientos Previos</h5>
                <ul class="h2h-lista">
                    ${h2h.length > 0 ? h2h.map(p => `
                        <li>J-${p.jornada}: 
                            <a href="${urlPartidoEquipo(p.id)}">
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

