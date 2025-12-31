fetch("resultados.json")
  .then(res => res.json())
  .then(data => {
    const partidos = data.partidos;
    const contenedor = document.getElementById("pagina-partidos");

    partidos.forEach(p => {
      const li = document.createElement("li");
      li.href = `partido.html?id=${p.id}`;
      li.classList.add("enlace-partido");
      li.innerHTML = `<a href="partido.html?id=${p.id}">Jornada ${p.jornada}: ${p.local} ${p.goles_local} - ${p.goles_visitante} ${p.visitante}</a>`;
      contenedor.appendChild(li);
    });
  });
