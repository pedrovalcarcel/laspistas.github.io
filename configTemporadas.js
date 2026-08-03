const SPREADSHEET_ID = "2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C";

const TEMPORADA_CSV_GIDS = {
    "2025/26": {
        partidos: 0,
        eventos: 1785101781
    },
    "2026/27": {
        partidos: 529616834,
        eventos: 644906735
    }
};

// Para Node (generarCalendario.js)
if (typeof module !== "undefined") {
    module.exports = {
        SPREADSHEET_ID,
        TEMPORADA_CSV_GIDS
    };
}

// Para el navegador
if (typeof window !== "undefined") {
    window.SPREADSHEET_ID = SPREADSHEET_ID;
    window.TEMPORADA_CSV_GIDS = TEMPORADA_CSV_GIDS;
}