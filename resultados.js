// =====================================
// CONFIGURACIÓN
// =====================================

const csvUrl = obtenerUrlPartidosTemporadaActual();

const MI_EQUIPO = "Las Pistas FC";

// =====================================
// CARGAR DATOS
// =====================================

fetch(csvUrl)
.then(r => r.text())
.then(csv => {
    const partidosRaw = csvToJSON(csv);
    const partidos = filtrarPartidosPorTemporadaActual(partidosRaw).filter(p =>
        p.local.trim() === MI_EQUIPO ||
        p.visitante.trim() === MI_EQUIPO
    );
    crearTooltip();
    crearBarraResumen(partidos);
    const contenedor = document.getElementById("calendarios-resultados");
    contenedor.innerHTML = "";
    // Detectar temporada automáticamente
    const hoy = new Date();

    // Si estamos entre septiembre y diciembre,
    // la temporada empieza este año.
    // Si estamos entre enero y agosto,
    // empezó el año anterior.
    const inicioTemporada = hoy.getMonth() >= 8
        ? hoy.getFullYear()
        : hoy.getFullYear() - 1;

    const finTemporada = inicioTemporada + 1;

    const temporada = [
        { mes: 8,  año: inicioTemporada }, // Septiembre
        { mes: 9,  año: inicioTemporada }, // Octubre
        { mes: 10, año: inicioTemporada }, // Noviembre
        { mes: 11, año: inicioTemporada }, // Diciembre
        { mes: 0,  año: finTemporada },    // Enero
        { mes: 1,  año: finTemporada },    // Febrero
        { mes: 2,  año: finTemporada },    // Marzo
        { mes: 3,  año: finTemporada },    // Abril
        { mes: 4,  año: finTemporada },    // Mayo
        { mes: 5,  año: finTemporada }     // Junio


    ];

    temporada.forEach(t => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "calendario-card";
        const titulo = document.createElement("h2");
        titulo.id = `titulo-${t.año}-${t.mes}`;
        const contenido = document.createElement("div");
        tarjeta.appendChild(titulo);
        tarjeta.appendChild(contenido);
        contenedor.appendChild(tarjeta);
        crearCalendario(
            t.año,
            t.mes,
            partidos,
            contenido,
            titulo.id
        );

    });

});

// =====================================
// BARRA RESUMEN
// =====================================

function crearBarraResumen(partidos){
    let v = 0;
    let e = 0;
    let d = 0;

    partidos.forEach(p=>{
        if(p.goles_local==="" || p.goles_visitante==="") return;
        const gl = Number(p.goles_local);
        const gv = Number(p.goles_visitante);
        const esLocal = p.local.trim()===MI_EQUIPO;
        if(gl===gv){
            e++;
        }else if(
            (esLocal && gl>gv) ||
            (!esLocal && gv>gl)
        ){
            v++;
        }else{

            d++;
        }
    });

    const total = v + e + d;
    document.getElementById("barra-resumen").innerHTML = `
      <span class="pj">
          PJ:
          <strong>${total}</strong>
      </span>

      <span class="g">
          G:
          <strong>${v}</strong>
      </span>

      <span class="e">
          E:
          <strong>${e}</strong>
      </span>

      <span class="d">
          D:
          <strong>${d}</strong>
      </span>
  `;
}