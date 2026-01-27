fetch("resultados.json")
  .then(res => res.json())
  .then(data => {
    const contenedor = document.getElementById("calendarios-resultados");
    const partidos = data.partidos;

    const meses = [
      { nombre: "Septiembre", mes: 8 },
      { nombre: "Octubre", mes: 9 },
      { nombre: "Noviembre", mes: 10 },
      { nombre: "Diciembre", mes: 11 },
      { nombre: "Enero", mes: 0 },
      { nombre: "Febrero", mes: 1 },
      { nombre: "Marzo", mes: 2 },
      { nombre: "Abril", mes: 3 },
      { nombre: "Mayo", mes: 4 }
    ];

   const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];

meses.forEach(m => {

    const calendario = document.createElement("div");
    calendario.classList.add("calendario");
    const año = m.mes >= 8 ? 2025 : 2026;
    calendario.innerHTML = `
        <h3>${m.nombre} ${año}</h3>
        <div class="grid-calendario"></div>
    `;

    const grid = calendario.querySelector(".grid-calendario");

    // Cabecera días semana
    diasSemana.forEach(d => {
        const cab = document.createElement("div");
        cab.classList.add("dia", "cabecera-dia");
        cab.textContent = d;
        grid.appendChild(cab);
    });

    const primerDia = new Date(año, m.mes, 1).getDay(); 
    // getDay(): 0=domingo ... 6=sábado

    // Convertimos a lunes=0 ... domingo=6
    const offset = primerDia === 0 ? 6 : primerDia - 1;

    // Celdas vacías antes del día 1
    for (let i = 0; i < offset; i++) {
        const vacio = document.createElement("div");
        vacio.classList.add("dia", "vacio");
        grid.appendChild(vacio);
    }

    const diasMes = new Date(año, m.mes + 1, 0).getDate();

    for (let d = 1; d <= diasMes; d++) {

        const dia = document.createElement("div");
        dia.classList.add("dia");
        dia.innerHTML = `<strong>${d}</strong>`;
        const hoy = new Date();
          if (
              d === hoy.getDate() &&
              m.mes === hoy.getMonth() &&
              año === hoy.getFullYear()
          ) {
              dia.classList.add("hoy");
          }
        const fecha = `${año}-${String(m.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        partidos
            .filter(p => convertirFecha(p.fecha) === fecha)
            .forEach(p => {

                const partido = document.createElement("a");
                partido.classList.add("partido");
                partido.href = `partido.html?id=${p.id}`;

                if (p.goles_local !== "?") {
                    const esLocal = p.local === "Las Pistas FC";
                    const gf = esLocal ? p.goles_local : p.goles_visitante;
                    const gc = esLocal ? p.goles_visitante : p.goles_local;

                    if (gf > gc) partido.classList.add("ganado");
                    else if (gf === gc) partido.classList.add("empatado");
                    else partido.classList.add("perdido");

                    partido.textContent =
                        `${p.local} ${p.goles_local}-${p.goles_visitante} ${p.visitante}`;
                } else {
                    partido.classList.add("pendiente");
                    partido.textContent = `${p.local} vs ${p.visitante}`;
                }

                dia.appendChild(partido);
            });

        grid.appendChild(dia);
    }

    contenedor.appendChild(calendario);
});
});

  function convertirFecha(fecha) {
    const [dia, mes, año] = fecha.split("/");
    return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}
