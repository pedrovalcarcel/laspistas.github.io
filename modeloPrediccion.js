// ============================================================
// MODELO DE PREDICCIÓN IA
// ============================================================


// ============================================================
// CONVERTIR FECHA
// ============================================================

function convertirFechaIA(fecha) {

    if (!fecha) return null;

    const partes = String(fecha).trim().split("/");

    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const año = Number(partes[2]);

    const fechaObjeto = new Date(año, mes, dia);

    if (isNaN(fechaObjeto.getTime())) {
        return null;
    }

    return fechaObjeto.getTime();

}


// ============================================================
// ¿ES PARTIDO DE LIGA?
// ============================================================

function esPartidoLiga(partido) {

    if (!partido) return false;

    return (
        partido.jornada !== undefined &&
        partido.jornada !== null &&
        String(partido.jornada).trim() !== "" &&
        !isNaN(Number(partido.jornada))
    );

}


// ============================================================
// ¿ESTÁ JUGADO?
// ============================================================

function partidoJugado(partido) {

    return (

        partido &&
        partido.goles_local !== undefined &&
        partido.goles_visitante !== undefined &&
        String(partido.goles_local).trim() !== "" &&
        String(partido.goles_visitante).trim() !== "" &&
        !isNaN(Number(partido.goles_local)) &&
        !isNaN(Number(partido.goles_visitante))

    );

}


// ============================================================
// NORMALIZAR
// ============================================================

function normalizarValor(valor) {

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            1,
            numero / 5
        )
    );

}

// ============================================================
// CONTAR EQUIPOS TOTALES (para normalizar la posición)
// ============================================================

function contarEquiposTotales(partidos) {

    if (!Array.isArray(partidos)) return 20;

    const equipos = new Set();

    partidos.forEach(p => {

        if (!esPartidoLiga(p)) return;

        const local = String(p.local || "").trim();
        const visitante = String(p.visitante || "").trim();

        if (local) equipos.add(local);
        if (visitante) equipos.add(visitante);

    });

    return equipos.size || 20;

}


// ============================================================
// FIRMA DE LOS DATOS (para saber si hay que reentrenar)
// ============================================================
// Genera una "huella" a partir de TODOS los partidos jugados:
// equipos, jornada y marcador. Si cambia cualquier dato (se
// añade un partido nuevo, o se corrige un marcador ya existente)
// la firma cambia y el modelo guardado en localStorage queda
// invalidado automáticamente.

function hashSimple(cadena) {

    let hash = 0;

    for (let i = 0; i < cadena.length; i++) {
        hash = (hash * 31 + cadena.charCodeAt(i)) | 0;
    }

    return hash;

}

function calcularFirmaDatos(partidos) {

    if (!Array.isArray(partidos)) return "0";

    const jugados = partidos.filter(
        p => esPartidoLiga(p) && partidoJugado(p)
    );

    // Ordenamos para que el orden en el array no cambie la firma,
    // solo lo hará un cambio real en los datos.
    const partes = jugados
        .map(p =>
            `${p.jornada}|${String(p.local || "").trim()}|` +
            `${String(p.visitante || "").trim()}|` +
            `${p.goles_local}|${p.goles_visitante}`
        )
        .sort();

    return `${jugados.length}-${hashSimple(partes.join("~"))}`;

}


// ============================================================
// FILTRAR SOLO LA TEMPORADA ACTUAL
// ============================================================
// Cada hoja de vuestro Excel ya es de una sola temporada, así
// que normalmente esto no cambia nada. Pero si en el futuro
// juntáis varias temporadas en un mismo array (p.ej. para el
// histórico), esta función evita que el modelo mezcle datos de
// temporadas distintas sin que nadie se dé cuenta: si detecta un
// campo "temporada" en los partidos, se queda solo con la más
// reciente. Si no existe ese campo, no hace nada (asume que el
// array ya es de una única temporada, como hasta ahora).

function filtrarTemporadaActual(partidos) {

    if (!Array.isArray(partidos)) return partidos;

    const conTemporada = partidos.filter(p => p && p.temporada);

    if (conTemporada.length === 0) {
        return partidos;
    }

    const temporadas = conTemporada
        .map(p => String(p.temporada).trim())
        .filter(Boolean);

    const temporadaActual = temporadas.sort().pop();

    return partidos.filter(
        p => !p.temporada ||
        String(p.temporada).trim() === temporadaActual
    );

}


// ============================================================
// BLOQUE 2 - CALCULAR CLASIFICACIÓN
// ============================================================

function calcularClasificacion(
    partidos,
    jornadaMaxima = Infinity
) {

    const tabla = {};

    if (!Array.isArray(partidos)) {
        return tabla;
    }

    partidos.forEach(partido => {

        // ----------------------------
        // Validaciones
        // ----------------------------

        if (!esPartidoLiga(partido)) {
            return;
        }

        if (!partidoJugado(partido)) {
            return;
        }

        const jornada = Number(partido.jornada);

        if (
            !Number.isFinite(jornada) ||
            jornada > jornadaMaxima
        ) {
            return;
        }

        const local =
            String(partido.local || "").trim();

        const visitante =
            String(partido.visitante || "").trim();

        if (!local || !visitante) {
            return;
        }

        const golesLocal =
            Number(partido.goles_local);

        const golesVisitante =
            Number(partido.goles_visitante);

        // ----------------------------
        // Crear equipos
        // ----------------------------

        if (!tabla[local]) {

            tabla[local] = {

                pj: 0,

                pg: 0,

                pe: 0,

                pp: 0,

                gf: 0,

                gc: 0,

                pts: 0

            };

        }

        if (!tabla[visitante]) {

            tabla[visitante] = {

                pj: 0,

                pg: 0,

                pe: 0,

                pp: 0,

                gf: 0,

                gc: 0,

                pts: 0

            };

        }

        // ----------------------------
        // Actualizar estadísticas
        // ----------------------------

        tabla[local].pj++;
        tabla[visitante].pj++;

        tabla[local].gf += golesLocal;
        tabla[local].gc += golesVisitante;

        tabla[visitante].gf += golesVisitante;
        tabla[visitante].gc += golesLocal;

        if (golesLocal > golesVisitante) {

            tabla[local].pg++;
            tabla[local].pts += 3;

            tabla[visitante].pp++;

        }
        else if (golesVisitante > golesLocal) {

            tabla[visitante].pg++;
            tabla[visitante].pts += 3;

            tabla[local].pp++;

        }
        else {

            tabla[local].pe++;
            tabla[visitante].pe++;

            tabla[local].pts++;
            tabla[visitante].pts++;

        }

    });

    return tabla;

}

// ============================================================
// BLOQUE 3 - OBTENER CARACTERÍSTICAS DEL EQUIPO
// ============================================================

function obtenerCaracteristicasEquipo(
    equipo,
    partidos,
    tablaClasificacion,
    equipoRival = null,
    jornadaLimite = Infinity
) {

    if (!equipo) {
        return null;
    }

    const nombreEquipo = String(equipo).trim();

    // ---------------------------------------
    // Partidos válidos (Liga + jugados + anteriores)
    // ---------------------------------------

    const partidosEquipo = (Array.isArray(partidos) ? partidos : []).filter(p => {

        if (!esPartidoLiga(p)) {
            return false;
        }

        if (!partidoJugado(p)) {
            return false;
        }

        const jornada = Number(p.jornada);

        if (
            !Number.isFinite(jornada) ||
            jornada >= jornadaLimite
        ) {
            return false;
        }

        const local =
            String(p.local || "").trim();

        const visitante =
            String(p.visitante || "").trim();

        return (
            local === nombreEquipo ||
            visitante === nombreEquipo
        );

    });
    partidosEquipo.sort((a, b) => {

        return (
            convertirFechaIA(a.fecha) -
            convertirFechaIA(b.fecha)
        );

    });

    // ---------------------------------------
    // Sin historial
    // ---------------------------------------

    if (partidosEquipo.length === 0) {

        return {

            partidos: 0,

            victorias: 0,

            empates: 0,

            derrotas: 0,

            golesFavor: 0,

            golesContra: 0,

            golesFavorPorPartido: 0,

            golesContraPorPartido: 0,

            diferenciaGolesPorPartido: 0,

            puntosPorPartido: 0,

            forma: 0,

            posicion: 0,

            enfrentamientosDirectos: 0

        };

    }


    // ---------------------------------------
    // Estadísticas
    // ---------------------------------------

    let victorias = 0;
    let empates = 0;
    let derrotas = 0;

    let golesFavor = 0;
    let golesContra = 0;

    let puntos = 0;

    let pesoTotal = 0;

    partidosEquipo.forEach((p, indice) => {

        // Peso creciente según antigüedad
        const peso =
            0.4 +
            (indice + 1) / partidosEquipo.length * 0.6;

        pesoTotal += peso;

        const esLocal =
            String(p.local).trim() === nombreEquipo;

        const gf =
            esLocal
                ? Number(p.goles_local)
                : Number(p.goles_visitante);

        const gc =
            esLocal
                ? Number(p.goles_visitante)
                : Number(p.goles_local);

        golesFavor += gf * peso;
        golesContra += gc * peso;

        if (gf > gc) {

            victorias += peso;
            puntos += 3 * peso;

        }
        else if (gf === gc) {

            empates += peso;
            puntos += peso;

        }
        else {

            derrotas += peso;

        }

    });

    const total = partidosEquipo.length;

    const divisor =
        pesoTotal || 1;

    const golesFavorPorPartido =
        golesFavor / divisor;

    const golesContraPorPartido =
        golesContra / divisor;

    const diferenciaGolesPorPartido =
        (golesFavor - golesContra) / divisor;

    const puntosPorPartido =
        puntos / divisor;

    // ---------------------------------------
    // Fuerza media de los rivales
    // ---------------------------------------

    let fuerzaRivales = 0;

    partidosEquipo.forEach(p => {

        const rival =
            String(p.local).trim() === nombreEquipo
                ? String(p.visitante).trim()
                : String(p.local).trim();

        if (
            tablaClasificacion &&
            tablaClasificacion[rival]
        ) {

            fuerzaRivales +=
                tablaClasificacion[rival].pts /
                Math.max(
                    tablaClasificacion[rival].pj,
                    1
                );

        }

    });

    const fuerzaMediaRivales =

        partidosEquipo.length

            ? fuerzaRivales /
            partidosEquipo.length

            : 0;

    // ---------------------------------------
    // Forma reciente
    // ---------------------------------------

    const ultimos5 =
        [...partidosEquipo]
            .sort((a, b) =>
                convertirFechaIA(a.fecha) -
                convertirFechaIA(b.fecha)
            )
            .slice(-5);
            let golesFavorUltimos5 = 0;
            let golesContraUltimos5 = 0;

            ultimos5.forEach(p => {

                const esLocal =
                    String(p.local).trim() === nombreEquipo;

                const gf =
                    esLocal
                        ? Number(p.goles_local)
                        : Number(p.goles_visitante);

                const gc =
                    esLocal
                        ? Number(p.goles_visitante)
                        : Number(p.goles_local);

                golesFavorUltimos5 += gf;
                golesContraUltimos5 += gc;

            });

            const golesFavorUltimos5PP =
                ultimos5.length
                    ? golesFavorUltimos5 / ultimos5.length
                    : 0;

            const golesContraUltimos5PP =
                ultimos5.length
                    ? golesContraUltimos5 / ultimos5.length
                    : 0;

    let puntosForma = 0;

    ultimos5.forEach(p => {

        const esLocal =
            String(p.local).trim() === nombreEquipo;

        const gf =
            esLocal
                ? Number(p.goles_local)
                : Number(p.goles_visitante);

        const gc =
            esLocal
                ? Number(p.goles_visitante)
                : Number(p.goles_local);

        if (gf > gc) {

            puntosForma += 3;

        }
        else if (gf === gc) {

            puntosForma += 1;

        }

    });

    const forma =
        ultimos5.length
            ? puntosForma / (ultimos5.length * 3)
            : 0;


    // ---------------------------------------
    // Posición
    // ---------------------------------------

    let posicion = 0;

    if (
        tablaClasificacion &&
        tablaClasificacion[nombreEquipo]
    ) {

        const equipos =
            Object.entries(tablaClasificacion)
                .sort((a, b) => {

                    if (b[1].pts !== a[1].pts) {
                        return b[1].pts - a[1].pts;
                    }

                    const difA =
                        a[1].gf - a[1].gc;

                    const difB =
                        b[1].gf - b[1].gc;

                    if (difB !== difA) {
                        return difB - difA;
                    }

                    return b[1].gf - a[1].gf;

                });

        posicion =
            equipos.findIndex(
                e => e[0] === nombreEquipo
            ) + 1;

    }


    // ---------------------------------------
    // Enfrentamientos directos
    // ---------------------------------------

    let enfrentamientosDirectos = 0;

    if (equipoRival) {

        enfrentamientosDirectos =
            partidosEquipo.filter(p => {

                const local =
                    String(p.local).trim();

                const visitante =
                    String(p.visitante).trim();

                return (
                    (local === nombreEquipo &&
                     visitante === equipoRival) ||

                    (visitante === nombreEquipo &&
                     local === equipoRival)

                );

            }).length;

    }

    // ---------------------------------------
    // POTENCIA OFENSIVA Y DEFENSIVA
    // ---------------------------------------

    let mediaLigaGF = 0;
    let partidosLiga = 0;

    if (tablaClasificacion) {

        Object.values(tablaClasificacion).forEach(equipo => {

            if (equipo.pj > 0) {

                mediaLigaGF +=
                    equipo.gf / equipo.pj;

                partidosLiga++;

            }

        });

    }

    mediaLigaGF =
        partidosLiga
            ? mediaLigaGF / partidosLiga
            : 1;

    const potenciaOfensiva =
        golesFavorPorPartido /
        mediaLigaGF;

    const potenciaDefensiva =
        mediaLigaGF /
        Math.max(
            golesContraPorPartido,
            0.1
        );


    return {

        partidos: total,

        victorias,

        empates,

        derrotas,

        golesFavor,

        golesContra,

        golesFavorPorPartido,

        golesContraPorPartido,

        diferenciaGolesPorPartido,

        puntosPorPartido,

        forma,

        posicion,

        enfrentamientosDirectos,

        golesFavorUltimos5PP,

        golesContraUltimos5PP,
        
        fuerzaMediaRivales,
        
        potenciaOfensiva,

        potenciaDefensiva

    };

}

// ============================================================
// BLOQUE 3.5 - CONSTRUIR ENTRADA PARA LA RED NEURONAL
// ============================================================
// ⚠️ IMPORTANTE: esta es la ÚNICA función que debe decidir qué
// variables ve la red neuronal. Se usa tanto para generar los
// datos de entrenamiento (prepararDatosEntrenamiento) como para
// predecir un partido nuevo (predecirPartido). Si en el futuro
// quieres añadir/quitar una variable, hazlo solo aquí: así
// entrenamiento y predicción nunca podrán desincronizarse.
//
// ⚠️ OJO CON EL SOBREAJUSTE: con pocos partidos por temporada,
// meter muchas variables puede hacer que la red "memorice" en
// vez de aprender patrones reales. Usa validarModeloIA() (más
// abajo) para comprobar si añadir/quitar variables mejora o
// empeora el acierto real antes de darlo por bueno.

function construirEntradaIA(local, visitante, totalEquipos = 20) {

    if (!local || !visitante) {
        return null;
    }

    const maxPosicion = Math.max(totalEquipos, 1);

    return {

        diferencia_pp:
            normalizarValor(
                local.puntosPorPartido -
                visitante.puntosPorPartido + 2.5
            ),

        diferencia_gf:
            normalizarValor(
                local.golesFavorPorPartido -
                visitante.golesFavorPorPartido + 2.5
            ),

        diferencia_gc:
            normalizarValor(
                visitante.golesContraPorPartido -
                local.golesContraPorPartido + 2.5
            ),

        diferencia_forma:
            (local.forma - visitante.forma + 1) / 2,

        diferencia_posicion:
            (visitante.posicion - local.posicion + maxPosicion) /
            (maxPosicion * 2),

        // --------------------------------------------
        // Variables nuevas (antes se calculaban pero no
        // se usaban como entrada de la red)
        // --------------------------------------------

        diferencia_gf_ultimos5:
            normalizarValor(
                local.golesFavorUltimos5PP -
                visitante.golesFavorUltimos5PP + 2.5
            ),

        diferencia_gc_ultimos5:
            normalizarValor(
                visitante.golesContraUltimos5PP -
                local.golesContraUltimos5PP + 2.5
            ),

        diferencia_fuerza_rivales:
            normalizarValor(
                local.fuerzaMediaRivales -
                visitante.fuerzaMediaRivales + 2.5
            ),

        diferencia_potencia_ofensiva:
            normalizarValor(
                local.potenciaOfensiva -
                visitante.potenciaOfensiva + 2.5
            ),

        diferencia_potencia_defensiva:
            normalizarValor(
                local.potenciaDefensiva -
                visitante.potenciaDefensiva + 2.5
            )

        // enfrentamientosDirectos NO se incluye: es un simple
        // contador (nº de veces que se han enfrentado), tiene el
        // mismo valor para local y visitante, así que no aporta
        // ninguna señal diferencial a la red tal y como está
        // calculado hoy. Si en el futuro quieres usarlo, habría
        // que convertirlo en un balance de victorias/derrotas
        // específico entre esos dos equipos, no solo un contador.

    };

}


// ============================================================
// BLOQUE 4 - PREPARAR DATOS DE ENTRENAMIENTO
// ============================================================

function prepararDatosEntrenamiento(
    partidosSinFiltrar,
    tablaClasificacion
) {

    if (!Array.isArray(partidosSinFiltrar)) {
        return [];
    }

    const partidos = filtrarTemporadaActual(partidosSinFiltrar);

    const ejemplos = [];

    const totalEquipos = contarEquiposTotales(partidos);

    partidos.forEach(partido => {

        if (!esPartidoLiga(partido)) {
            return;
        }

        if (!partidoJugado(partido)) {
            return;
        }

        const jornadaActual =
            Number(partido.jornada);

        if (!Number.isFinite(jornadaActual)) {
            return;
        }

        const equipoLocal =
            String(partido.local || "").trim();

        const equipoVisitante =
            String(partido.visitante || "").trim();

        if (!equipoLocal || !equipoVisitante) {
            return;
        }

        const golesLocal =
            Number(partido.goles_local);

        const golesVisitante =
            Number(partido.goles_visitante);

        if (
            !Number.isFinite(golesLocal) ||
            !Number.isFinite(golesVisitante)
        ) {
            return;
        }

        // --------------------------------------------
        // CLASIFICACIÓN ANTES DE ESTE PARTIDO
        // --------------------------------------------

        const clasificacionAnterior =
            calcularClasificacion(
                partidos,
                jornadaActual - 1
            );

        // --------------------------------------------
        // ESTADÍSTICAS ANTES DE ESTE PARTIDO
        // --------------------------------------------

        const local =
            obtenerCaracteristicasEquipo(

                equipoLocal,

                partidos,

                clasificacionAnterior,

                equipoVisitante,

                jornadaActual

            );

        const visitante =
            obtenerCaracteristicasEquipo(

                equipoVisitante,

                partidos,

                clasificacionAnterior,

                equipoLocal,

                jornadaActual

            );

        if (!local || !visitante) {
            return;
        }

        // --------------------------------------------
        // SALIDA
        // --------------------------------------------

        let victoriaLocal = 0;
        let empate = 0;
        let victoriaVisitante = 0;

        if (golesLocal > golesVisitante) {

            victoriaLocal = 1;

        }
        else if (golesLocal < golesVisitante) {

            victoriaVisitante = 1;

        }
        else {

            empate = 1;

        }

        // --------------------------------------------
        // ENTRADA DE LA RED
        // --------------------------------------------

        const entrada = construirEntradaIA(
            local,
            visitante,
            totalEquipos
        );

        if (!entrada) {
            return;
        }

        ejemplos.push({

            input: entrada,

            output: {

                victoria_local:
                    victoriaLocal,

                empate:
                    empate,

                victoria_visitante:
                    victoriaVisitante

            }

        });

    });

    console.log(`📚 Datos de entrenamiento preparados: ${ejemplos.length} partidos.`);

    return ejemplos;

}

// ============================================================
// ENTRENAR EN UN WEB WORKER (para no bloquear la página)
// ============================================================
// 🔧 MEJORA: redIA.train() es una llamada síncrona y, con
// 3000 iteraciones, puede notarse como un "congelado" momentáneo
// de la página mientras entrena. Delegamos esa parte pesada a un
// Web Worker (entrenamiento.worker.js) y aquí solo esperamos el
// resultado. Si el navegador no soporta Workers (o falla la
// carga del script), hacemos fallback a entrenar igual en el
// hilo principal para no dejar la web sin predicciones.

function entrenarModeloEnWorker(ejemplos, configRed, opcionesEntrenamiento) {

    return new Promise((resolve, reject) => {

        if (typeof Worker === "undefined") {
            reject(new Error("Web Workers no disponibles en este navegador."));
            return;
        }

        let worker;

        try {
            worker = new Worker("entrenamiento.worker.js");
        } catch (error) {
            reject(error);
            return;
        }

        worker.onmessage = (evento) => {

            worker.terminate();

            if (evento.data && evento.data.ok) {
                resolve(evento.data);
            } else {
                reject(new Error(
                    (evento.data && evento.data.error) ||
                    "Error entrenando la IA en segundo plano."
                ));
            }

        };

        worker.onerror = (error) => {
            worker.terminate();
            reject(error);
        };

        worker.postMessage({ ejemplos, configRed, opcionesEntrenamiento });

    });

}


// ============================================================
// BLOQUE 5 - INICIALIZAR IA
// ============================================================

let redIA = null;
let iaEntrenada = false;
let modeloGuardado = null;

async function inicializarIA(
    partidosSinFiltrar,
    tablaClasificacion
) {

    if(iaEntrenada && redIA) {
        console.log("✅ IA ya está entrenada.");
        return redIA;
    }

    //----------------------------------------------------------
    // VALIDACIONES
    //----------------------------------------------------------

    if (!Array.isArray(partidosSinFiltrar)) {
        console.error("❌ Los partidos no son un array.");
        return null;
    }

    if (typeof brain === "undefined" || !brain.NeuralNetwork) {
        console.error("❌ Brain.js no está disponible.");
        return null;
    }

    const partidos = filtrarTemporadaActual(partidosSinFiltrar);

    console.log(`🤖 Inicializando IA con ${partidos.length} partidos.`);

    // -------------------------------------
    // ¿Existe un modelo ya entrenado Y los datos no han cambiado?
    // -------------------------------------

    const firmaActual = calcularFirmaDatos(partidos);
    const cacheGuardada = localStorage.getItem("modeloIA");

    if (cacheGuardada) {

        try {

            const datosCache = JSON.parse(cacheGuardada);

            if (
                datosCache &&
                datosCache.firma === firmaActual &&
                datosCache.modelo
            ) {

                redIA = new brain.NeuralNetwork();
                redIA.fromJSON(datosCache.modelo);
                iaEntrenada = true;

                console.log("✅ Modelo IA cargado desde localStorage (sin cambios en los datos).");

                return redIA;

            }

            console.log("♻️ Hay resultados nuevos o corregidos: reentrenando la IA...");

        } catch (error) {

            console.warn("⚠️ No se pudo leer el modelo guardado, se reentrenará.", error);

        }

    }

    //----------------------------------------------------------
    // PREPARAR DATOS
    //----------------------------------------------------------

    const ejemplos = prepararDatosEntrenamiento(partidos, tablaClasificacion);

    if (ejemplos.length === 0) {
        console.error("❌ No hay datos suficientes para entrenar la IA.");
        redIA = null;
        return null;
    }

    //----------------------------------------------------------
    // ENTRENAMIENTO
    //----------------------------------------------------------

    const configRed = { activation: "sigmoid", hiddenLayers: [4] };

    const opcionesEntrenamiento = {
        iterations: 3000,
        learningRate: 0.03,
        errorThresh: 0.005,
        shuffle: true,
        log: false
    };

    console.log("🚀 Entrenando IA...");

    let entrenamiento;

    try {

        entrenamiento = await entrenarModeloEnWorker(
            ejemplos,
            configRed,
            opcionesEntrenamiento
        );

    } catch (error) {

        console.warn(
            "⚠️ No se pudo entrenar en segundo plano, se entrena en el hilo principal.",
            error
        );

        const redTemporal = new brain.NeuralNetwork(configRed);
        const resultado = redTemporal.train(ejemplos, opcionesEntrenamiento);

        entrenamiento = {
            modelo: redTemporal.toJSON(),
            resultado
        };

    }

    redIA = new brain.NeuralNetwork(configRed);
    redIA.fromJSON(entrenamiento.modelo);

    const iteraciones = entrenamiento.resultado ? entrenamiento.resultado.iterations : "?";
    const error = entrenamiento.resultado ? entrenamiento.resultado.error : "?";

    console.log(`✅ IA entrenada (${iteraciones} iteraciones, error ${error}).`);

    // Guardamos el modelo entrenado junto con la firma de los
    // datos usados, para poder detectar cuándo hay que reentrenar.
    modeloGuardado = entrenamiento.modelo;

    localStorage.setItem(
        "modeloIA",
        JSON.stringify({
            modelo: modeloGuardado,
            firma: firmaActual
        })
    );

    console.log("💾 Modelo IA guardado.");

    iaEntrenada = true;

    return redIA;

}

// ============================================================
// ============================================================
// BLOQUE 6 - PREDECIR PARTIDO
// ============================================================

// Por debajo de este número de partidos jugados, la predicción
// es poco fiable (apenas hay historial de ese equipo) y se avisa
// al usuario en vez de mostrar un porcentaje que parecería más
// fiable de lo que realmente es.
const MIN_PARTIDOS_PARA_PREDECIR = 3;

function predecirPartido(partido, partidosSinFiltrar) {

    if (!redIA) {
        return null;
    }

    if (!partido) {
        return null;
    }

    const partidos = filtrarTemporadaActual(partidosSinFiltrar);

    const jornada = Number(partido.jornada);

    const clasificacion =
        calcularClasificacion(
            partidos,
            jornada - 1
        );

    const local =
        obtenerCaracteristicasEquipo(
            partido.local,
            partidos,
            clasificacion,
            partido.visitante,
            jornada
        );

    const visitante =
        obtenerCaracteristicasEquipo(
            partido.visitante,
            partidos,
            clasificacion,
            partido.local,
            jornada
        );

    if (!local || !visitante) {
        return null;
    }

    const totalEquipos = contarEquiposTotales(partidos);

    // 🔧 FIX: antes aquí se construían variables distintas
    // (local_pp, visitante_pp...) a las usadas en el entrenamiento
    // (diferencia_pp...), así que la red predecía con datos que
    // nunca había visto. Ahora usamos la misma función para
    // entrenar y predecir, así que ambas fases están sincronizadas.
    const entrada = construirEntradaIA(
        local,
        visitante,
        totalEquipos
    );

    if (!entrada) {
        return null;
    }

    return {

        probabilidades: redIA.run(entrada),

        partidosLocal: local.partidos,

        partidosVisitante: visitante.partidos,

        datosSuficientes:
            local.partidos >= MIN_PARTIDOS_PARA_PREDECIR &&
            visitante.partidos >= MIN_PARTIDOS_PARA_PREDECIR

    };

}

// ============================================================
// PREDICCIONES CONGELADAS (persistidas)
// ============================================================
// 🔧 FIX: el modelo se reentrena (con pesos nuevos, al azar) cada
// vez que hay resultados nuevos o corregidos. Como mostrarPrediccion
// recalculaba la predicción en cada visita usando el modelo "del
// momento", el mismo partido podía mostrar un % distinto antes y
// después de conocerse su resultado.
//
// Ahora: la PRIMERA vez que se calcula la predicción de un
// partido, se guarda en localStorage. A partir de ahí, esa
// predicción queda fija para siempre para ese partido, aunque el
// modelo se reentrene más adelante con datos nuevos.
//
// (Si la primera vez que se ve la ficha de un partido es DESPUÉS
// de que se haya jugado —p. ej. partidos antiguos, o la primera
// vez que se despliega esta función— no hay forma de recuperar
// retroactivamente el % "de antes". En ese caso se congela la
// primera predicción calculada, que es la mejor aproximación
// disponible, y a partir de ahí ya no volverá a cambiar.)

const CLAVE_PREDICCIONES_GUARDADAS = "prediccionesGuardadas";

function obtenerPrediccionesGuardadas() {

    try {

        const datos = localStorage.getItem(CLAVE_PREDICCIONES_GUARDADAS);
        return datos ? JSON.parse(datos) : {};

    } catch (error) {

        console.warn("⚠️ No se pudieron leer las predicciones guardadas.", error);
        return {};

    }

}

function obtenerPrediccionGuardadaDePartido(idPartido) {

    if (idPartido === undefined || idPartido === null || idPartido === "") {
        return null;
    }

    const todas = obtenerPrediccionesGuardadas();

    return todas[idPartido] || null;

}

function guardarPrediccionParaPartido(idPartido, resultado) {

    if (idPartido === undefined || idPartido === null || idPartido === "") {
        return;
    }

    const todas = obtenerPrediccionesGuardadas();

    todas[idPartido] = resultado;

    try {

        localStorage.setItem(
            CLAVE_PREDICCIONES_GUARDADAS,
            JSON.stringify(todas)
        );

    } catch (error) {

        console.warn("⚠️ No se pudo guardar la predicción de este partido.", error);

    }

}

// Utilidad manual (consola) para borrar las predicciones congeladas,
// por ejemplo si quieres forzar que se recalculen todas de nuevo.
function reiniciarPrediccionesGuardadas() {

    localStorage.removeItem(CLAVE_PREDICCIONES_GUARDADAS);
    console.log("🗑 Predicciones congeladas eliminadas.");

}


// ============================================================
// BLOQUE 7 - MOSTRAR PREDICCIÓN
// ============================================================

function mostrarPrediccion(partido) {

    const contenedor =
        document.getElementById(
            "contenedor-prediccion"
        );

    if (!contenedor) {
        return;
    }

    const idPartido = partido && partido.id;

    // 1) ¿Ya teníamos una predicción congelada para este partido?
    let resultado = obtenerPrediccionGuardadaDePartido(idPartido);

    // 2) Si no, la calculamos ahora (necesitamos el modelo cargado)
    //    y la dejamos guardada para que no vuelva a cambiar.
    if (!resultado) {

        if (!redIA) {
            return;
        }

        resultado = predecirPartido(partido, partidosGlobalActa);

        if (resultado) {
            guardarPrediccionParaPartido(idPartido, resultado);
        }

    }

    if (!resultado) {

        contenedor.innerHTML = `

            <p class="sin-datos">

                No se pudo calcular la predicción.

            </p>

        `;

        return;

    }

    if (!resultado.datosSuficientes) {

        contenedor.innerHTML = `

            <p class="sin-datos">

                Aún no hay partidos suficientes de ${partido.local}
                y ${partido.visitante} esta temporada para hacer
                una predicción fiable.

            </p>

        `;

        return;

    }

    let local =
    Number(resultado.probabilidades.victoria_local) || 0;

    let empate =
        Number(resultado.probabilidades.empate) || 0;

    let visitante =
        Number(resultado.probabilidades.victoria_visitante) || 0;


    // ======================================
    // NORMALIZAR PARA QUE SUMEN 100%
    // ======================================

    const suma =
        local +
        empate +
        visitante;

    if (suma > 0) {

        local /= suma;
        empate /= suma;
        visitante /= suma;

    }


    // ======================================
    // PASAR A PORCENTAJES
    // ======================================

    local =
        Math.round(local * 100);

    empate =
        Math.round(empate * 100);

    visitante =
        Math.round(visitante * 100);


    // ======================================
    // AJUSTAR REDONDEO
    // ======================================

    const diferencia =
        100 -
        (local + empate + visitante);

    if (diferencia !== 0) {

        if (
            local >= empate &&
            local >= visitante
        ) {

            local += diferencia;

        }
        else if (
            empate >= visitante
        ) {

            empate += diferencia;

        }
        else {

            visitante += diferencia;

        }

    }

    const miEquipo =
        (typeof nombreMiEquipo !== "undefined" ? nombreMiEquipo :
            (typeof MI_EQUIPO !== "undefined" ? MI_EQUIPO : "Las Pistas FC")).trim();

    const claseLocal = local > visitante
        ? "prediccion-ganador"
        : local < visitante
            ? "prediccion-perdedor"
            : "prediccion-empate";

    const claseVisitante = visitante > local
        ? "prediccion-ganador"
        : visitante < local
            ? "prediccion-perdedor"
            : "prediccion-empate";

    const claseEmpate = "prediccion-empate";

    contenedor.innerHTML = `

        <div class="prediccion-ia">

            <div class="prediccion-fila ${claseLocal}">

                <span>${partido.local}</span>

                <strong>${local}%</strong>

            </div>

            <div class="prediccion-fila prediccion-empate">

                <span>Empate</span>

                <strong>${empate}%</strong>

            </div>

            <div class="prediccion-fila ${claseVisitante}">

                <span>${partido.visitante}</span>

                <strong>${visitante}%</strong>

            </div>

        </div>

    `;

}

function reiniciarModeloIA() {

    localStorage.removeItem("modeloIA");

    modeloGuardado = null;

    redIA = null;

    iaEntrenada = false;

    console.log("🗑 Modelo IA eliminado.");

}


// ============================================================
// BLOQUE 8 - VALIDAR EL MODELO (leave-one-out)
// ============================================================
// Mide qué tan bien acierta realmente el modelo: para cada
// partido ya jugado, entrena una red SIN ese partido y comprueba
// si adivina su resultado (1X2). Es la forma correcta de saber
// si la IA acierta de verdad, en vez de fiarnos solo del error de
// entrenamiento (que puede estar "memorizando" en vez de
// aprendiendo patrones).
//
// ⚠️ Es lento a propósito: entrena un modelo distinto por cada
// partido. No se llama automáticamente en ningún sitio; ejecútala
// a mano desde la consola del navegador cuando quieras comprobar
// el modelo, por ejemplo:
//
//   validarModeloIA(partidosGlobalActa)
//
// También compara contra un "baseline" ingenuo (acertar siempre
// el resultado más frecuente, sin usar IA para nada) para saber
// si la red realmente está aportando algo.

function validarModeloIA(partidosSinFiltrar, opciones = {}) {

    if (typeof brain === "undefined" || !brain.NeuralNetwork) {
        console.error("❌ Brain.js no está disponible.");
        return null;
    }

    const iteracionesValidacion = opciones.iterations || 800;

    const partidos = filtrarTemporadaActual(partidosSinFiltrar);

    const partidosLiga = partidos.filter(
        p => esPartidoLiga(p) && partidoJugado(p)
    );

    if (partidosLiga.length < 8) {
        console.warn(
            `⚠️ Solo hay ${partidosLiga.length} partidos jugados. ` +
            "Con tan pocos datos, el resultado de la validación no es muy fiable."
        );
    }

    console.log(
        `🔍 Validando el modelo con ${partidosLiga.length} partidos (leave-one-out). ` +
        "Esto entrena un modelo distinto por cada partido, puede tardar un poco..."
    );

    let aciertos = 0;
    let evaluados = 0;
    const detalle = [];

    for (let i = 0; i < partidos.length; i++) {

        const partidoI = partidos[i];

        if (!esPartidoLiga(partidoI) || !partidoJugado(partidoI)) {
            continue;
        }

        // Todos los partidos MENOS este
        const partidosSinI = partidos.filter((_, idx) => idx !== i);

        const ejemplos = prepararDatosEntrenamiento(
            partidosSinI,
            calcularClasificacion(partidosSinI)
        );

        if (ejemplos.length === 0) {
            continue;
        }

        const redTemp = new brain.NeuralNetwork({
            activation: "sigmoid",
            hiddenLayers: [4]
        });

        redTemp.train(ejemplos, {
            iterations: iteracionesValidacion,
            learningRate: 0.03,
            errorThresh: 0.005,
            shuffle: true,
            log: false
        });

        const jornada = Number(partidoI.jornada);
        const clasifAntes = calcularClasificacion(partidosSinI, jornada - 1);

        const localFeat = obtenerCaracteristicasEquipo(
            partidoI.local, partidosSinI, clasifAntes, partidoI.visitante, jornada
        );

        const visitanteFeat = obtenerCaracteristicasEquipo(
            partidoI.visitante, partidosSinI, clasifAntes, partidoI.local, jornada
        );

        if (!localFeat || !visitanteFeat) {
            continue;
        }

        const totalEquipos = contarEquiposTotales(partidosSinI);
        const entrada = construirEntradaIA(localFeat, visitanteFeat, totalEquipos);

        if (!entrada) {
            continue;
        }

        const salida = redTemp.run(entrada);

        const prediccion =
            (salida.victoria_local >= salida.empate && salida.victoria_local >= salida.victoria_visitante)
                ? "victoria_local"
                : (salida.empate >= salida.victoria_visitante)
                    ? "empate"
                    : "victoria_visitante";

        const golesLocal = Number(partidoI.goles_local);
        const golesVisitante = Number(partidoI.goles_visitante);

        const real =
            golesLocal > golesVisitante ? "victoria_local" :
            golesLocal < golesVisitante ? "victoria_visitante" :
            "empate";

        const acierto = prediccion === real;

        if (acierto) aciertos++;
        evaluados++;

        detalle.push({
            partido: `${partidoI.local} ${golesLocal}-${golesVisitante} ${partidoI.visitante}`,
            prediccion,
            real,
            acierto
        });

    }

    const porcentaje = evaluados ? Math.round((aciertos / evaluados) * 100) : 0;

    // Baseline ingenuo: ¿qué % acertarías eligiendo siempre el
    // resultado más frecuente, sin usar ninguna IA?
    const conteoReal = { victoria_local: 0, empate: 0, victoria_visitante: 0 };
    detalle.forEach(d => conteoReal[d.real]++);

    const mejorBaseline = Math.max(
        conteoReal.victoria_local,
        conteoReal.empate,
        conteoReal.victoria_visitante
    );

    const porcentajeBaseline = evaluados
        ? Math.round((mejorBaseline / evaluados) * 100)
        : 0;

    console.log(`✅ Validación terminada: ${aciertos}/${evaluados} aciertos (${porcentaje}%).`);
    console.log(`ℹ️ Baseline sin IA (elegir siempre el resultado más habitual): ${porcentajeBaseline}%.`);

    if (porcentaje <= porcentajeBaseline) {
        console.warn(
            "⚠️ El modelo no está superando al baseline ingenuo. " +
            "Con estos datos, probablemente compense simplificar el modelo " +
            "(menos variables en construirEntradaIA) en vez de complicarlo."
        );
    }

    console.table(detalle);

    return { evaluados, aciertos, porcentaje, porcentajeBaseline, detalle };

}