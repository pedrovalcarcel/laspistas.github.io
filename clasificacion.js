// clasificacion.js
const urlPartidosC = obtenerUrlPartidosTemporadaActual();

function obtenerNombreArchivoEscudo(equipo) {
    return equipo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

fetch(urlPartidosC)
    .then(res => res.text())
    .then(csvText => {
        const partidos = csvToJSON(csvText);
        const partidosTemporada = filtrarTemporadaActual(partidos);
        // Filtrar solo partidos oficiales ya jugados
        const partidosOficiales = partidosTemporada.filter(p => !isNaN(p.jornada) && p.jornada !== "Amistoso" && p.goles_local !== "");
        
        // Calcular clasificación (asumiendo que tienes esta función en tu proyecto)
        // Clasificación actual
        const tabla = calcularClasificacion(partidosOficiales);
        mostrarRankingAtaqueDefensa(tabla);

        // Última jornada disputada
        const ultimaJornada = Math.max(
            ...partidosOficiales.map(p => Number(p.jornada))
        );

        // Clasificación de la jornada anterior
        const tablaAnterior = calcularClasificacion(
            partidosOficiales,
            ultimaJornada - 1
        );

        // ==========================================
        // RANKING ATAQUE / DEFENSA
        // ==========================================

        
        // Convertir a array y ordenar
        const tablaArray = Object.keys(tabla).map(nombre => ({
            equipo: nombre,
            ...tabla[nombre],
            ga: tabla[nombre].gf - tabla[nombre].gc // Diferencia de goles
        })).sort((a, b) => b.pts - a.pts || b.ga - a.ga);

        const tablaAnteriorArray =
        Object.keys(tablaAnterior)
            .map(nombre => ({
                equipo: nombre,
                ...tablaAnterior[nombre],
                ga:
                    tablaAnterior[nombre].gf -
                    tablaAnterior[nombre].gc
            }))
            .sort(
                (a, b) =>
                    b.pts - a.pts ||
                    b.ga - a.ga
            );

        // Imprimir en el tbody
       const tbody = document.getElementById("cuerpo-clasificacion");

        tbody.innerHTML = tablaArray.map((eq, i) => {
        
            let movimiento = "";
            let diferencia = 0;
        
            if (ultimaJornada > 1) {
        
                const posicionAnterior = tablaAnteriorArray.findIndex(
                    e => e.equipo === eq.equipo
                );
        
                if (posicionAnterior !== -1) {
        
                    if (posicionAnterior > i) {
        
                        diferencia = posicionAnterior - i;
                        movimiento =
                            `<span class="mov subida">▲ ${diferencia}</span>`;
        
                    } else if (posicionAnterior < i) {
        
                        diferencia = i - posicionAnterior;
                        movimiento =
                            `<span class="mov bajada">▼ ${diferencia}</span>`;
        
                    } else {
        
                        movimiento =
                            `<span class="mov igual">=</span>`;
                    }
                }
            }
        
            // AQUÍ sigue estando dentro del map
            let enlace;
        
            if (eq.equipo.trim() === "Las Pistas FC") {
                enlace = "estadisticas.html";
            } else {
                enlace = `equipo.html?nombre=${encodeURIComponent(eq.equipo)}`;
            }
        
            const nombreArchivoEscudo =
                obtenerNombreArchivoEscudo(eq.equipo);
        
            const escudoUrl =
                `img/equipos/${nombreArchivoEscudo}.png`;
        
            const escudoFallbackUrl =
                `img/equipos/${nombreArchivoEscudo}.jpg`;
        
            return `
                <tr>
                    <td class="posicion-clasi">
                        ${i + 1}
                        ${movimiento}
                    </td>
        
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
        
                            <img
                                src="${escudoUrl}"
                                alt="Escudo de ${eq.equipo}"
                                style="width: 35px; height: 35px; object-fit: contain;"
                                onerror="this.onerror=null; this.src='${escudoFallbackUrl}'; this.style.display='block'"
                            >
        
                            <a href="${enlace}" class="link-equipo">
                                ${eq.equipo}
                            </a>
        
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
            
    // ============================================================
// RANKING DE ATAQUE Y DEFENSA
// ============================================================

function calcularRankingAtaqueDefensa(tablaClasificacion) {

    if (!tablaClasificacion) {
        return null;
    }

    const equipos = Object.keys(tablaClasificacion).map(nombre => ({

        equipo: nombre,

        gf: Number(tablaClasificacion[nombre].gf) || 0,

        gc: Number(tablaClasificacion[nombre].gc) || 0

    }));


    // ==========================================
    // ATAQUE (más goles = mejor)
    // ==========================================

    const ataque = [...equipos]

        .sort((a, b) => b.gf - a.gf)

        .map((equipo, indice) => ({

            equipo: equipo.equipo,

            goles: equipo.gf,

            posicion: indice + 1

        }));


    // ==========================================
    // DEFENSA (menos goles = mejor)
    // ==========================================

    const defensa = [...equipos]

        .sort((a, b) => a.gc - b.gc)

        .map((equipo, indice) => ({

            equipo: equipo.equipo,

            goles: equipo.gc,

            posicion: indice + 1

        }));


    return {

        ataque,

        defensa

    };

}

// ============================================================
// MOSTRAR COMPARACIÓN ENTRE EQUIPOS
// ============================================================

function actualizarComparacionRanking(
    ranking,
    nombreEquipo
) {

    const contenedor =
        document.getElementById(
            "comparacion-ranking"
        );

    if (!contenedor) return;

    const ataqueLasPistas =
        ranking.ataque.find(
            e => e.equipo === "Las Pistas FC"
        );

    const defensaLasPistas =
        ranking.defensa.find(
            e => e.equipo === "Las Pistas FC"
        );

    const ataqueRival =
        ranking.ataque.find(
            e => e.equipo === nombreEquipo
        );

    const defensaRival =
        ranking.defensa.find(
            e => e.equipo === nombreEquipo
        );

    if (
        !ataqueRival ||
        !defensaRival
    ) {
        return;
    }

    contenedor.innerHTML = `
    
        <table class="tabla-comparacion-ranking">

            <thead>

                <tr>

                    <th></th>

                    <th>Las Pistas</th>

                    <th>${nombreEquipo}</th>

                </tr>

            </thead>

            <tbody>

                <tr>

                    <td>⚽ Goles</td>

                    <td>${ataqueLasPistas.goles}</td>

                    <td>${ataqueRival.goles}</td>

                </tr>

                <tr>

                    <td>🏆 Ataque</td>

                    <td>${ataqueLasPistas.posicion}º</td>

                    <td>${ataqueRival.posicion}º</td>

                </tr>

                <tr>

                    <td>🛡️ Encajados</td>

                    <td>${defensaLasPistas.goles}</td>

                    <td>${defensaRival.goles}</td>

                </tr>

                <tr>

                    <td>🥅 Defensa</td>

                    <td>${defensaLasPistas.posicion}º</td>

                    <td>${defensaRival.posicion}º</td>

                </tr>

            </tbody>

        </table>

    `;

    const selector =
        document.getElementById(
            "selector-equipo-ranking"
        );

    if (selector) {

        actualizarComparacionRanking(
            ranking,
            selector.value
        );

        selector.addEventListener(
            "change",
            () => {

                actualizarComparacionRanking(
                    ranking,
                    selector.value
                );

            }
        );

    }

}

// ============================================================
// PINTAR TARJETA DE RANKING
// ============================================================

function mostrarRankingAtaqueDefensa(tablaClasificacion) {

    const contenedor =
        document.getElementById("contenido-ranking");

    if (!contenedor) return;

    const ranking =
        calcularRankingAtaqueDefensa(tablaClasificacion);

    if (!ranking) return;

    const miEquipo = "Las Pistas FC";

    const ataque =
        ranking.ataque.find(
            e => e.equipo === miEquipo
        );

    const defensa =
        ranking.defensa.find(
            e => e.equipo === miEquipo
        );

    const opciones =
        ranking.ataque
            .filter(e => e.equipo !== miEquipo)
            .map(e =>
                `<option value="${e.equipo}">
                    ${e.equipo}
                </option>`
            )
            .join("");

    contenedor.innerHTML = `

        <div class="ranking-resumen">

            <div class="ranking-item">

                <strong>Ataque</strong><br>

                ${ataque.posicion}º

                (${ataque.goles} goles)

            </div>

            <div class="ranking-item">

                <strong>Defensa</strong><br>

                ${defensa.posicion}º

                (${defensa.goles} encajados)

            </div>

        </div>

        <hr>

        <label>

            Comparar con:

        </label>

        <select id="selector-equipo-ranking">

            <option value="">

                Selecciona un equipo

            </option>

            ${opciones}

        </select>

        <div id="comparacion-ranking"></div>

    `;

    document
        .getElementById("selector-equipo-ranking")
        .addEventListener(
            "change",
            function () {

                mostrarComparacionRanking(
                    this.value,
                    ranking
                );

            }
        );

}

// ============================================================
// COMPARACIÓN ENTRE LAS PISTAS Y OTRO EQUIPO
// ============================================================

function mostrarComparacionRanking(
    nombreEquipo,
    ranking
) {

    if (!nombreEquipo) {

        document.getElementById(
            "comparacion-ranking"
        ).innerHTML = "";

        return;

    }

    const miEquipo = "Las Pistas FC";

    const ataqueLasPistas =
        ranking.ataque.find(e => e.equipo === miEquipo);

    const defensaLasPistas =
        ranking.defensa.find(e => e.equipo === miEquipo);

    const ataqueRival =
        ranking.ataque.find(e => e.equipo === nombreEquipo);

    const defensaRival =
        ranking.defensa.find(e => e.equipo === nombreEquipo);

    const maxGF = Math.max(
        ataqueLasPistas.goles,
        ataqueRival.goles
    );

    const maxGC = Math.max(
        defensaLasPistas.goles,
        defensaRival.goles
    );

    function barra(valor, maximo, color){
        const porcentaje =
            (valor / maximo) * 100;

        return `

            <div class="barra-ranking">

                <div
                    class="barra-ranking-relleno ${color}"
                    style="width:${porcentaje}%">
                </div>

            </div>

        `;

    }

    document.getElementById(
        "comparacion-ranking"
    ).innerHTML = `

        <h3>Ataque</h3>

        <div class="fila-ranking">

            <span class="equipo-ranking">
                Las Pistas FC
            </span>

            ${barra(
                ataqueLasPistas.goles,
                maxGF,
                ataqueLasPistas.goles >= ataqueRival.goles
                    ? "verde"
                    : "roja"
            )}

            <strong>

                ${ataqueLasPistas.goles}

                <span class="ranking-pos">

                    (${ataqueLasPistas.posicion}º)

                </span>

            </strong>

        </div>

        <div class="fila-ranking">

            <span class="equipo-ranking">
                ${nombreEquipo}
            </span>

            ${barra(
                ataqueRival.goles,
                maxGF,
                ataqueRival.goles >= ataqueLasPistas.goles
                    ? "verde"
                    : "roja"
            )}

            <strong>
                ${ataqueRival.goles}
                <span class="ranking-pos">
                    (${ataqueRival.posicion}º)
                </span>
            </strong>

        </div>


        <h3>Defensa</h3>

        <div class="fila-ranking">

            <span class="equipo-ranking">
                Las Pistas FC
            </span>

            ${barra(
                defensaLasPistas.goles,
                maxGC,
                defensaLasPistas.goles <= defensaRival.goles
                    ? "verde"
                    : "roja"
            )}

            <strong>
                ${defensaLasPistas.goles}
                <span class="ranking-pos">
                    (${defensaLasPistas.posicion}º)
                </span>
            </strong>

        </div>

        <div class="fila-ranking">

            <span class="equipo-ranking">
                ${nombreEquipo}
            </span>

            ${barra(
                defensaRival.goles,
                maxGC,
                defensaRival.goles <= defensaLasPistas.goles
                    ? "verde"
                    : "roja"
            )}

            <strong>
                ${defensaRival.goles}
                <span class="ranking-pos">
                    (${defensaRival.posicion}º)
                </span>
            </strong>

        </div>

    `;

}

// Asegúrate de que esta función esté disponible globalmente o importada
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
