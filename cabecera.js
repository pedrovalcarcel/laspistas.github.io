(() => {
    const pagina = location.pathname.split("/").pop().toLocaleLowerCase("es") || "index.html";
    const secciones = {
        "index.html": "index.html",
        "resultados.html": "resultados.html",
        "partido.html": "resultados.html",
        "jugadores.html": "jugadores.html",
        "jugador.html": "jugadores.html",
        "alineacion.html": "jugadores.html",
        "estadisticas.html": "estadisticas.html",
        "equipo.html": "estadisticas.html",
        "historico.html": "historico.html"
    };
    const destinoActivo = secciones[pagina] || pagina;

    document.querySelectorAll(".cabecera-centro nav a").forEach(enlace => {
        const destino = new URL(enlace.href, location.href).pathname.split("/").pop().toLocaleLowerCase("es");
        if (destino !== destinoActivo) return;
        enlace.classList.add("seccion-activa");
        enlace.setAttribute("aria-current", "location");
    });
})();
