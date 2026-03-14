// 1. URL del CSV publicado en Google Sheets
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv"; 
const MI_EQUIPO = "Las Pistas FC";

fetch(csvUrl)
  .then(res => res.text())
  .then(csvText => {
    const data = csvToJSON(csvText);
    const partidos = data.filter(p => 
      p.local.trim() === MI_EQUIPO || p.visitante.trim() === MI_EQUIPO
    );

    const contenedor = document.getElementById("partidos-mes");
    const hoy = new Date();
    const proximos = partidos
    .filter(p => {
      if (!p.fecha) return false;
      const f = fechaDesdeString(p.fecha);
      return f >= hoy;
    })
    .sort((a,b) => fechaDesdeString(a.fecha) - fechaDesdeString(b.fecha));

  const proximo = proximos[0];

  mostrarProximoPartido(proximo);
    // Mes actual y siguiente
    contenedor.innerHTML = "";
    crearCalendario(hoy.getFullYear(), hoy.getMonth(), partidos, contenedor);
    
    const mesSiguiente = hoy.getMonth() === 11 ? 0 : hoy.getMonth() + 1;
    const anoSiguiente = hoy.getMonth() === 11 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    crearCalendario(anoSiguiente, mesSiguiente, partidos, contenedor);
  });

function csvToJSON(csv) {
  const lines = csv.split("\n");
  // Limpiamos los encabezados por si tienen espacios: "hora " -> "hora"
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  return lines.slice(1).filter(l => l.trim() !== "").map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
    return obj;
  });
}

function crearCalendario(ano, mes, partidos, contenedor) {
  const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const calendario = document.createElement("div");
  calendario.className = "calendario";
  calendario.innerHTML = `<h3>${nombresMeses[mes]} ${ano}</h3>`;
  
  const grid = document.createElement("div");
  grid.className = "grid-calendario";

  const primerDia = new Date(ano, mes, 1).getDay();
  const diasMes = new Date(ano, mes + 1, 0).getDate();

  for (let i = 0; i < (primerDia === 0 ? 6 : primerDia - 1); i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {
    const celda = document.createElement("div");
    celda.className = "dia";
    
    // Marcar día de hoy
    const hoy = new Date();
    if (dia === hoy.getDate() && mes === hoy.getMonth() && ano === hoy.getFullYear()) {
      celda.classList.add("hoy");
    }

    celda.innerHTML = `<strong>${dia}</strong>`;

    partidos
      .filter(p => {
        const f = fechaDesdeString(p.fecha);
        return f.getDate() === dia && f.getMonth() === mes && f.getFullYear() === ano;
      })
      .forEach(p => {
        const partido = document.createElement("a");
        partido.classList.add("partido");
        partido.href = `partido.html?id=${p.id}`;

        // Lógica colores
        const gLocal = Number(p.goles_local);
        const gVis = Number(p.goles_visitante);
        
        if (p.goles_local !== "" && p.goles_visitante !== "") {
          if (gLocal === gVis) partido.classList.add("empatado");
          else if ((p.local.trim() === MI_EQUIPO && gLocal > gVis) || (p.visitante.trim() === MI_EQUIPO && gVis > gLocal)) partido.classList.add("ganado");
          else partido.classList.add("perdido");
        } else {
          partido.classList.add("pendiente");
        }

        // Mostrar hora y campo (usando las columnas del CSV)
        partido.innerHTML = `<span>${p.hora || "Sin hora"}</span><br><span>${p.campo || "Sin campo"}</span>`;
        celda.appendChild(partido);
      });
    grid.appendChild(celda);
  }
  calendario.appendChild(grid);
  contenedor.appendChild(calendario);
}

function fechaDesdeString(fecha) {
  const [d, m, a] = fecha.split("/");
  return new Date(a, m - 1, d);
}
function obtenerDiaSemana(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [d, m, a] = fecha.split("/");
    return dias[new Date(a, m - 1, d).getDay()];
}
function mostrarProximoPartido(p) {
  if (!p) return;

  const cont = document.getElementById("proximo-partido");
  const dia = obtenerDiaSemana(p.fecha);
  const rival = p.local.trim() === MI_EQUIPO ? p.visitante : p.local;

  cont.innerHTML = `
    <h3>Próximo partido</h3>
    <div class="card-partido">
      <a class="link-partido" href="partido.html?id=${p.id}">
        <strong>${MI_EQUIPO}</strong> vs <strong>${rival}</strong>
      </a>
      <div>${dia} ${p.fecha}</div>
      <div>${p.hora || "Sin hora"}</div>
      <div>${p.campo || "Sin campo"}</div>
    </div>
  `;
}