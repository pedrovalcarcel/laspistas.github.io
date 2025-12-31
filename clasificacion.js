fetch("clasificacion.json")
.then(res => res.json())
.then(data =>{
    const cuerpo = document.getElementById("cuerpo-clasificacion");
    // ORDENAR CLASIFICACIÓN
    const clasificacionOrdenada = data.clasificacion.sort((a, b) => {
        // 1️⃣ Puntos
        if (b.pts !== a.pts) {
            return b.pts - a.pts;
        }

        // 2️⃣ Gol average
        const gaA = a.gf - a.gc;
        const gaB = b.gf - b.gc;
        if (gaB !== gaA) {
            return gaB - gaA;
        }

        // 3️⃣ Goles a favor
        return b.gf - a.gf;
    });
    clasificacionOrdenada.forEach((equipo, index) => {
        const fila = document.createElement("tr");
        const ga = equipo.gf - equipo.gc;
        fila.innerHTML = `
        <td>${index + 1}</td>
        <td>${equipo.equipo}</td>
        <td>${equipo.pj}</td>
        <td>${equipo.pg}</td>
        <td>${equipo.pe}</td>
        <td>${equipo.pp}</td>
        <td>${equipo.gf}</td>
        <td>${equipo.gc}</td>
        <td>${ga}</td>
        <td>${equipo.pts}</td>
        `;
        cuerpo.appendChild(fila);    
});
    
});