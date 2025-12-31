fetch("resultados.json")
.then(res => res.json())
.then(data => {
    const ul = document.getElementById("partidos-mes");
    const mesActual = new Date().getMonth();

    data.partidos.forEach(p => {
        const fecha = new Date(p.fecha.split("/").reverse().join("-"));
        if (fecha.getMonth() === (mesActual)) {
            const li = document.createElement("li");
            li.innerHTML = `
            <a href="partido.html?id=${p.id}">
                J${p.jornada} - ${p.local} VS ${p.visitante}
            </a>`;
            ul.appendChild(li);
        }
    });
});