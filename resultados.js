const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";
const MI_EQUIPO = "Las Pistas FC";

// Iniciamos la carga
fetch(csvUrl)
  .then(res => res.text())
  .then(csvText => {
    const data = csvToJSON(csvText);
    const partidos = data.filter(p => p.local.trim() === MI_EQUIPO || p.visitante.trim() === MI_EQUIPO);
    renderizarCalendario(partidos);
    renderizarEstadisticasArbitros(partidos); // Llamamos a la nueva función
  })
  .catch(err => console.error("Error al cargar:", err));

function csvToJSON(csv) {
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).filter(l => l.trim() !== "").map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
    return obj;
  });
}

// --- NUEVA FUNCIÓN DE ESTADÍSTICAS POR ÁRBITRO ---
function renderizarEstadisticasArbitros(partidos) {
  const contenedor = document.getElementById("calendarios-resultados");
  const stats = {};

  partidos.forEach(p => {
    if (p.goles_local === "" || p.goles_visitante === "" || !p.arbitro) return;
    if (!stats[p.arbitro]) stats[p.arbitro] = { v: 0, e: 0, d: 0 };

    const gLocal = Number(p.goles_local);
    const gVis = Number(p.goles_visitante);
    const esLocal = p.local.trim() === MI_EQUIPO;

    if (gLocal === gVis) {
      stats[p.arbitro].e++;
    } else {
      const victoria = esLocal ? (gLocal > gVis) : (gVis > gLocal);
      victoria ? stats[p.arbitro].v++ : stats[p.arbitro].d++;
    }
  });

  const resumen = document.createElement("div");
  resumen.classList.add("resumen-arbitros");
  resumen.innerHTML = `<h2>Estadísticas por árbitro</h2>`;

  Object.keys(stats).forEach(id => {
    const s = stats[id];
    const total = s.v + s.e + s.d;
    const pct = total > 0 ? Math.round((s.v / total) * 100) : 0;
    const p = document.createElement("p");
    p.style.cursor = "pointer";
    p.innerHTML = `${id} → 🟢 ${s.v} | 🟡 ${s.e} | 🔴 ${s.d} (${pct} %)`;
    p.onclick = () => filtrarPorArbitro(id);
    resumen.appendChild(p);
  });
  contenedor.appendChild(resumen);
}

// --- FUNCIÓN CALENDARIO (Tu código original) ---
function renderizarCalendario(partidos) {
  const contenedor = document.getElementById("calendarios-resultados");
  const partidosPorFecha = {};
  
  partidos.forEach(p => {
    const fechaISO = convertirFecha(p.fecha);
    if (!fechaISO) return;
    if (!partidosPorFecha[fechaISO]) partidosPorFecha[fechaISO] = [];
    partidosPorFecha[fechaISO].push(p);
  });

  const meses = [
    { nombre: "Septiembre", mes: 8 }, { nombre: "Octubre", mes: 9 },
    { nombre: "Noviembre", mes: 10 }, { nombre: "Diciembre", mes: 11 },
    { nombre: "Enero", mes: 0 }, { nombre: "Febrero", mes: 1 },
    { nombre: "Marzo", mes: 2 }, { nombre: "Abril", mes: 3 }, 
    { nombre: "Mayo", mes: 4 }
  ];

  meses.forEach(m => {
    const calendario = document.createElement("div");
    calendario.classList.add("calendario");
    const año = (m.mes >= 8) ? 2025 : 2026;
    calendario.innerHTML = `<h3>${m.nombre} ${año}</h3><div class="grid-calendario"></div>`;
    const grid = calendario.querySelector(".grid-calendario");

    ["L", "M", "X", "J", "V", "S", "D"].forEach(d => {
      const cab = document.createElement("div");
      cab.classList.add("dia", "cabecera-dia");
      cab.textContent = d;
      grid.appendChild(cab);
    });

    const primerDia = new Date(año, m.mes, 1).getDay();
    const offset = (primerDia === 0) ? 6 : primerDia - 1;

    for (let i = 0; i < offset; i++) {
      const vacio = document.createElement("div");
      vacio.classList.add("dia", "vacio");
      grid.appendChild(vacio);
    }

    const diasMes = new Date(año, m.mes + 1, 0).getDate();
    for (let d = 1; d <= diasMes; d++) {
      const fechaISO = `${año}-${String(m.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dia = document.createElement("div");
      dia.classList.add("dia");
      dia.innerHTML = `<strong>${d}</strong>`;

      const partidosDelDia = partidosPorFecha[fechaISO] || [];
      partidosDelDia.forEach(p => {
        const pEl = document.createElement("a");
        pEl.classList.add("partido");
        pEl.setAttribute("data-arbitro", p.arbitro);
        pEl.href = `partido.html?id=${p.id}`;
        const gLocal = Number(p.goles_local);
        const gVis = Number(p.goles_visitante);
        const esLocal = p.local.trim() === MI_EQUIPO;

        let claseResultado = "pendiente";
        if (p.goles_local !== "" && p.goles_visitante !== "") {
            if (gLocal === gVis) claseResultado = "empatado";
            else {
                const victoria = esLocal ? (gLocal > gVis) : (gVis > gLocal);
                claseResultado = victoria ? "ganado" : "perdido";
            }
        }
        pEl.classList.add(claseResultado);
        pEl.textContent = `${p.local} ${p.goles_local}-${p.goles_visitante} ${p.visitante}`;
        dia.appendChild(pEl);
      });
      grid.appendChild(dia);
    }
    contenedor.appendChild(calendario);
  });
}

function convertirFecha(fecha) {
  if (!fecha) return "";
  const f = String(fecha).trim();
  if (f.match(/^\d{4}-\d{2}-\d{2}$/)) return f;
  if (f.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [d, m, a] = f.split("/");
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return "";
}

function filtrarPorArbitro(nombreArbitro) {
    const todosLosPartidos = document.querySelectorAll(".partido");
    
    todosLosPartidos.forEach(el => {
        const esDelArbitro = el.getAttribute("data-arbitro") === nombreArbitro;
        el.style.display = esDelArbitro ? "block" : "none";
    });

    // Ocultar meses que no tengan partidos visibles
    document.querySelectorAll(".calendario").forEach(cal => {
        const tienePartidosVisibles = cal.querySelector(".partido[style='display: block;']");
        cal.style.display = tienePartidosVisibles ? "block" : "none";
    });
    
    alert(`Filtrando partidos arbitrados por: ${nombreArbitro}`);
}
