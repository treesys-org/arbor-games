
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * ARBOR GAMES DASHBOARD
 * =====================
 * Interfaz principal para listar y lanzar los juegos generados.
 * Lee el archivo manifest.json generado por el workflow.
 */

const App = () => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Intentamos cargar el manifiesto generado por el script de Python
    fetch('./manifest.json')
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setLoading(false);
      })
      .catch(e => {
        console.warn("No se encontró manifest.json. Asegúrate de que el workflow se haya ejecutado.", e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-green-400 font-mono p-4 md:p-8 selection:bg-green-900 selection:text-white">
      <header className="max-w-6xl mx-auto border-b-4 border-green-700 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">ARBOR <span className="text-white">ARCADE</span></h1>
          <p className="text-xs md:text-sm opacity-80">System Ready. Mode: HTML/JS Injection.</p>
        </div>
        <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end border-t md:border-t-0 border-neutral-800 pt-2 md:pt-0 mt-2 md:mt-0">
          <div className="text-xs text-neutral-500">ENGINE</div>
          <div className="font-bold text-white">V.20.24</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        
        {/* INSTRUCTION CARD */}
        <div className="mb-8 md:mb-12 bg-neutral-800/50 p-4 md:p-6 rounded-lg border border-neutral-700 flex flex-col md:flex-row items-start gap-4">
          <div className="text-3xl bg-neutral-900 p-2 rounded-full border border-neutral-700">🤖</div>
          <div>
            <h3 className="font-bold text-white text-lg">Protocolo de Creación</h3>
            <p className="text-neutral-400 text-sm mt-1 leading-relaxed">
              Sistema listo. Para añadir un nuevo juego, simplemente ordénalo: <br/>
              <span className="text-green-300 block my-1 font-bold">"Crea un juego sobre [Tema] en la carpeta [nombre_carpeta]"</span>
              Yo generaré el HTML/JS y el sistema actualizará esta lista automáticamente.
            </p>
          </div>
        </div>

        {/* STATUS INDICATOR */}
        {loading && (
            <div className="text-center py-20">
                <div className="inline-block animate-spin text-4xl mb-4">⚙️</div>
                <p>Escaneando cartuchos...</p>
            </div>
        )}

        {/* EMPTY STATE */}
        {!loading && games.length === 0 && (
             <div className="text-center py-12 border-2 border-dashed border-neutral-700 rounded-xl">
                <p className="text-xl text-white">No se detectaron juegos.</p>
                <p className="text-sm text-neutral-500 mt-2">Ejecuta el script 'game_builder.py' o crea una carpeta en 'arbor-games/'.</p>
             </div>
        )}

        {/* GAMES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {games.map((game) => {
            return (
                <a 
                key={game.id} 
                href={game.path}
                className="group flex flex-col h-full bg-neutral-800 border-l-4 border-green-600 hover:border-white hover:bg-neutral-700 transition-all active:scale-[0.98] md:hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden rounded-r-lg"
                >
                {/* Background Icon Watermark */}
                <div className="absolute -top-4 -right-4 text-9xl opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none select-none grayscale">
                    {game.icon}
                </div>

                <div className="p-4 md:p-6 flex-1 flex flex-col relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-4xl filter drop-shadow-lg">{game.icon || '👾'}</span>
                        <span className="text-xs font-bold bg-black/40 px-2 py-1 rounded text-neutral-400 border border-neutral-600">v{game.version}</span>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight group-hover:text-green-300">{game.name}</h2>
                    <p className="text-xs md:text-sm text-neutral-400 mb-6 flex-1 line-clamp-3">{game.description}</p>
                    
                    <div className="pt-4 border-t border-neutral-600/50 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-green-600 group-hover:text-white transition-colors">
                        <span>Insert Coin</span>
                        <span>▶</span>
                    </div>
                </div>
                </a>
            );
          })}
        </div>
      </main>
    </div>
  );
};

// Ensure Root Exists
let rootEl = document.getElementById('root');
if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
}

// Inject Tailwind if missing (Fallback for pure preview environments)
if (!document.querySelector('script[src*="tailwindcss"]')) {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
}

const root = createRoot(rootEl);
root.render(<App />);

// AI Studio always uses an `index.tsx` file for all project types.
