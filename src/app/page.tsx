'use client';

import { db } from "@/lib/db";
import Link from "next/link";

export default function Home() {
  const { isLoading, error, data } = db.useQuery({ maps: {} });

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-[#2d2d2d] text-[#00ff00] flex items-center justify-center font-mono">
        Loading Maps...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-[#2d2d2d] text-red-500 flex items-center justify-center font-mono">
        Error: {error.message}
      </div>
    );
  }

  return (
    <main className="w-full h-screen bg-[#2d2d2d] text-white font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl border-2 border-[#4a4a4a] bg-[#3a3a3a] shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-[#4a4a4a] p-2 flex justify-between items-center border-b border-[#222]">
          <h1 className="font-bold text-sm text-white tracking-wide px-2">
            Counter-Strike Source Beta
          </h1>
          <div className="flex gap-1">
             <div className="w-3 h-3 bg-[#555] rounded-sm"></div>
             <div className="w-3 h-3 bg-[#555] rounded-sm"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-[500px]">
            {/* Map List */}
            <div className="w-full md:w-1/3 bg-[#252525] border-r border-[#222] p-1 overflow-y-auto">
                <div className="text-xs text-[#aaa] mb-1 px-2">Map Selection</div>
                <ul className="space-y-[1px]">
                    {data?.maps.map((map) => (
                        <li key={map.id}>
                            <Link href={`/game/${map.id}`} className="block px-2 py-1 text-sm hover:bg-[#4a6b8a] hover:text-white cursor-pointer text-[#ddd]">
                                {map.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Map Preview / Details */}
            <div className="w-full md:w-2/3 bg-[#333] p-4 flex flex-col relative">
                 <div className="border-2 border-[#555] bg-black h-64 w-full mb-4 relative flex items-center justify-center">
                     {/* Placeholder for map preview */}
                     <div className="text-[#00ff00] font-mono text-xs opacity-50">
                         [ NO PREVIEW AVAILABLE ]
                     </div>
                     <div className="absolute inset-0 border border-[#ffffff10] pointer-events-none" />
                 </div>
                 
                 <div className="flex-1 border border-[#444] bg-[#222] p-2 text-xs text-[#ccc] font-mono leading-relaxed overflow-y-auto">
                     <p>Map Description:</p>
                     <p className="mt-2">
                        This is a highly classified mission area. 
                        Terrorists are attempting to bomb the target. 
                        Counter-Terrorists must defuse the bomb or eliminate all threats.
                     </p>
                     <p className="mt-4 text-[#aaa]">
                        Max Players: 32<br/>
                        Time Limit: 20:00<br/>
                        Buy Time: 0:45
                     </p>
                 </div>

                 <div className="mt-4 flex justify-end gap-2">
                      <button className="px-6 py-1 bg-[#4a4a4a] border border-[#666] text-xs text-[#ddd] hover:bg-[#5a5a5a] active:bg-[#333] active:translate-y-[1px]">
                          Cancel
                      </button>
                      <button className="px-6 py-1 bg-[#4a4a4a] border border-[#666] text-xs text-[#ddd] hover:bg-[#5a5a5a] active:bg-[#333] active:translate-y-[1px]">
                          Start
                      </button>
                 </div>
            </div>
        </div>
      </div>
      
      <div className="mt-8 text-[#555] text-xs font-mono">
         Powered by InstantDB & React Three Fiber
      </div>
    </main>
  );
}
