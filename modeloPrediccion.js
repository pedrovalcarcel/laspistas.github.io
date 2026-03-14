// ===============================
// VARIABLES GLOBALES
// ===============================
let net;
let modeloEntrenado = false;
let mapaGlobalPoder = {};
let partidosGlobal = [];

const MI_EQUIPO2 = "Las Pistas FC";

// ===============================
// INICIALIZAR IA
// ===============================
async function inicializarIA(partidos, clasificacion) {
    if (typeof brain === "undefined") {
        document.getElementById("contenedor-prediccion").innerHTML = "Error: Motor IA no cargado";
        return;
    }

    partidosGlobal = partidos;
    mapaGlobalPoder = clasificacion;

    // -----------------------------
    // 1️⃣ Cargar modelo si existe
    // -----------------------------
    if (localStorage.getItem("modeloIA")) {
        net = new brain.NeuralNetwork({ hiddenLayers: [12, 8], activation: 'sigmoid' });
        net.fromJSON(JSON.parse(localStorage.getItem("modeloIA")));
        modeloEntrenado = true;
        return; // ya no hace falta entrenar
    }

    // -----------------------------
    // 2️⃣ Crear nueva red y entrenar
    // -----------------------------
    net = new brain.NeuralNetwork({
        hiddenLayers: [12, 8],
        activation: 'sigmoid'
    });

    const partidosJugados = partidos.filter(p => p.goles_local !== "" && p.goles_visitante !== "");

    const datosEntrenamiento = partidosJugados.map(p => {
        const previos = partidosAntesDeFecha(partidos, p.fecha);
        const statsL = fuerzaEquipo(p.local, calcularClasificacion(previos));
        const statsV = fuerzaEquipo(p.visitante, calcularClasificacion(previos));
        const formaL = calcularForma(p.local, previos);
        const formaV = calcularForma(p.visitante, previos);

        return {
            input: {
                diffPuntos: (statsL.puntos - statsV.puntos + 3) / 6,
                ataqueRelativo: (statsL.ataque / (statsV.defensa + 0.1)) / 5,
                formaRelativa: (formaL - formaV + 1) / 2
            },
            output: {
                ganadorLocal: parseInt(p.goles_local) > parseInt(p.goles_visitante) ? 1 : 0,
                empate: parseInt(p.goles_local) === parseInt(p.goles_visitante) ? 1 : 0,
                ganadorVis: parseInt(p.goles_local) < parseInt(p.goles_visitante) ? 1 : 0
            }
        };
    });

    if (datosEntrenamiento.length > 5) {
        net.train(datosEntrenamiento, {
            iterations: 2000,
            errorThresh: 0.005,
            log: false
        });
        modeloEntrenado = true;

        // -----------------------------
        // 3️⃣ Guardar modelo entrenado
        // -----------------------------
        const modeloJSON = net.toJSON();
        localStorage.setItem("modeloIA", JSON.stringify(modeloJSON));
    }
}

// ===============================
// MOTOR DE CÁLCULO (POISSON + DIXON-COLES)
// ===============================
function poisson(lambda, k) {
    let fact = 1;
    for (let i = 1; i <= k; i++) fact *= i;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

function probabilidadesResultado(xgLocal, xgVisitante) {
    let v = 0, e = 0, d = 0;
    const MAX = 10;
    const rho = -0.15;

    for (let i = 0; i <= MAX; i++) {
        for (let j = 0; j <= MAX; j++) {
            let p = poisson(xgLocal, i) * poisson(xgVisitante, j);

            if (i === 0 && j === 0) p *= (1 - (xgLocal * xgVisitante * rho));
            else if (i === 0 && j === 1) p *= (1 + (xgLocal * rho));
            else if (i === 1 && j === 0) p *= (1 + (xgVisitante * rho));
            else if (i === 1 && j === 1) p *= (1 - rho);

            if (i > j) v += p;
            else if (i === j) e += p;
            else d += p;
        }
    }

    const total = v + e + d;
    return { victoria: v / total, empate: e / total, derrota: d / total };
}

// ===============================
// PREDICCIÓN INTEGRADA
// ===============================
function predecirPartido(local, visitante, hora, fecha) {
    const partidosPrevios = partidosAntesDeFecha(partidosGlobal, fecha);
    const mapaDinamico = calcularClasificacion(partidosPrevios);

    // 1. Cálculo estadístico XG
    const xg = calcularXG(local, visitante, mapaDinamico, partidosPrevios, hora);
    const probsPoisson = probabilidadesResultado(xg.local, xg.visitante);

    let vFinal = probsPoisson.victoria;
    let eFinal = probsPoisson.empate;
    let dFinal = probsPoisson.derrota;

    // 2. Refinamiento con Red Neuronal (Si hay datos suficientes)
    if (modeloEntrenado) {
        const statsL = fuerzaEquipo(local, mapaDinamico);
        const statsV = fuerzaEquipo(visitante, mapaDinamico);
        const fL = calcularForma(local, partidosPrevios);
        const fV = calcularForma(visitante, partidosPrevios);

        const resIA = net.run({
            diffPuntos: (statsL.puntos - statsV.puntos + 3) / 6,
            ataqueRelativo: (statsL.ataque / (statsV.defensa + 0.1)) / 5,
            formaRelativa: (fL - fV + 1) / 2
        });

        // Clamp para evitar valores extremos
        resIA.ganadorLocal = Math.max(0.001, Math.min(0.999, resIA.ganadorLocal));
        resIA.empate = Math.max(0.001, Math.min(0.999, resIA.empate));
        resIA.ganadorVis = Math.max(0.001, Math.min(0.999, resIA.ganadorVis));

        // Hibridación: 70% estadística, 30% IA
        vFinal = (vFinal * 0.7) + (resIA.ganadorLocal * 0.3);
        eFinal = (eFinal * 0.7) + (resIA.empate * 0.3);
        dFinal = (dFinal * 0.7) + (resIA.ganadorVis * 0.3);

        // Normalizar para que sumen 1
        const total = vFinal + eFinal + dFinal;
        vFinal /= total;
        eFinal /= total;
        dFinal /= total;
    }

    // Ajuste de perspectiva según MI_EQUIPO2
    let victoria, empate, derrota;
    if (local === MI_EQUIPO2) {
        victoria = vFinal; empate = eFinal; derrota = dFinal;
    } else {
        victoria = dFinal; empate = eFinal; derrota = vFinal;
    }

    return {
        xgLocal: xg.local,
        xgVisitante: xg.visitante,
        victoria, empate, derrota,
        marcadorProbable: marcadorMasProbable(xg.local, xg.visitante)
    };
}

// ===============================
// FUNCIONES DE APOYO
// ===============================
function calcularXG(local, visitante, mapa, partidos, hora) {
    const localStats = fuerzaEquipo(local, mapa);
    const visStats = fuerzaEquipo(visitante, mapa);
    const fL = calcularForma(local, partidos);
    const fV = calcularForma(visitante, partidos);

    const mediaLiga = 1.6;
    const ventajaCasa = 1.12;

    let xgL = mediaLiga * (localStats.ataque / mediaLiga) * (visStats.defensa / mediaLiga) * ventajaCasa;
    let xgV = mediaLiga * (visStats.ataque / mediaLiga) * (localStats.defensa / mediaLiga) * (2 - ventajaCasa);

    let ajuste = (fL - fV) * 0.25 + (localStats.puntos - visStats.puntos) * 0.20;
    ajuste = Math.max(-0.4, Math.min(0.4, ajuste));

    return {
        local: Math.max(0.3, xgL * (1 + ajuste)),
        visitante: Math.max(0.3, xgV * (1 - ajuste))
    };
}

function fuerzaEquipo(eq, mapa) {
    const e = mapa[eq] || { gf: 0, gc: 0, pts: 0, pj: 0 };
    if (!e.pj || e.pj === 0) return { ataque: 1.1, defensa: 1.1, puntos: 1 };
    return {
        ataque: e.gf / e.pj,
        defensa: e.gc / e.pj,
        puntos: e.pts / e.pj
    };
}

function calcularForma(equipo, partidos) {
    const ultimos = partidos
        .filter(p => p.local === equipo || p.visitante === equipo)
        .slice(-5);
    if (ultimos.length === 0) return 0.5;
    let pts = 0;
    ultimos.forEach(p => {
        const gl = parseInt(p.goles_local) || 0;
        const gv = parseInt(p.goles_visitante) || 0;
        if (p.local === equipo) {
            if (gl > gv) pts += 3; else if (gl === gv) pts += 1;
        } else {
            if (gv > gl) pts += 3; else if (gv === gl) pts += 1;
        }
    });
    return pts / (ultimos.length * 3);
}

// ===============================
// UTILIDADES E INTERFAZ
// ===============================
function marcadorMasProbable(xgL, xgV) {
    let mejorP = 0, marcador = "0-0";
    for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 6; j++) {
            const p = poisson(xgL, i) * poisson(xgV, j);
            if (p > mejorP) { mejorP = p; marcador = `${i}-${j}`; }
        }
    }
    return marcador;
}

function calcularClasificacion(partidos, hastaJornada = 999) {
    const tabla = {};

    partidos.filter(p => p.goles_local !== "" && !isNaN(parseInt(p.jornada)) && parseInt(p.jornada) < hastaJornada)
    .forEach(p => {
        const local = p.local.trim();
        const visitante = p.visitante.trim();

        // Inicializamos los equipos si no existen, incluyendo las nuevas métricas
        [local, visitante].forEach(e => { 
            if (!tabla[e]) tabla[e] = { pts: 0, gf: 0, gc: 0, pj: 0, pg: 0, pe: 0, pp: 0 }; 
        });

        const gl = parseInt(p.goles_local);
        const gv = parseInt(p.goles_visitante);

        // Actualizamos partidos jugados
        tabla[local].pj++;
        tabla[visitante].pj++;

        // Actualizamos goles
        tabla[local].gf += gl; tabla[local].gc += gv;
        tabla[visitante].gf += gv; tabla[visitante].gc += gl;

        // Actualizamos puntos y resultado (Ganado/Empatado/Perdido)
        if (gl > gv) {
            tabla[local].pts += 3;
            tabla[local].pg++;
            tabla[visitante].pp++;
        } else if (gv > gl) {
            tabla[visitante].pts += 3;
            tabla[visitante].pg++;
            tabla[local].pp++;
        } else {
            tabla[local].pts++;
            tabla[visitante].pts++;
            tabla[local].pe++;
            tabla[visitante].pe++;
        }
    });

    return tabla;
}
function partidosAntesDeFecha(partidos, fecha) {
    const f = fechaDesdeString(fecha);
    return partidos.filter(p => p.fecha && fechaDesdeString(p.fecha) < f);
}

function fechaDesdeString(s) {
    const [d, m, a] = s.split("/");
    return new Date(a, m - 1, d);
}

async function esperarIALista() {
    if (modeloEntrenado) return true;
    return new Promise(res => {
        let i = 0;
        const c = setInterval(() => {
            if (modeloEntrenado || i > 40) { clearInterval(c); res(); }
            i++;
        }, 50);
    });
}

async function mostrarPrediccion(partido) {
    await esperarIALista();
    const hora = partido.hora ? parseInt(partido.hora.split(":")[0]) : 12;
    const pred = predecirPartido(partido.local, partido.visitante, hora, partido.fecha);

    const v = (pred.victoria * 100).toFixed(1);
    const e = (pred.empate * 100).toFixed(1);
    const d = (pred.derrota * 100).toFixed(1);

   document.getElementById("contenedor-prediccion").innerHTML = `
        <div style="font-family: sans-serif; border: 1px solid #ccc; padding: 15px; border-radius: 8px;">
            <h3>Predicción IA Avanzada</h3>
            <p><b>Marcador esperado:</b> ${pred.xgLocal.toFixed(1)} - ${pred.xgVisitante.toFixed(1)}</p>
            <p><b>Marcador más probable:</b> ${pred.marcadorProbable}</p>
            
            <div style="display: flex; height: 30px; border-radius: 5px; overflow: hidden; margin-top: 10px; background: #eee;">
                <div style="width: ${v}%; background: #4CAF50;"></div>
                <div style="width: ${e}%; background: #f3ff50;"></div>
                <div style="width: ${d}%; background: #F44336;"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 8px; color: #fff;">
                <span>${v}%</span>
                <span>${e}%</span>
                <span>${d}%</span>
            </div>
        </div>
    `;
}

function obtenerMapaPoder(clasificacion) {
    const mapa = {};
    const lista = Array.isArray(clasificacion) ? clasificacion : (clasificacion.equipos || []);
    lista.forEach(e => {
        mapa[e.equipo] = { pts: e.pts, gf: e.gf, gc: e.gc, pj: e.pj };
    });
    return mapa;
}