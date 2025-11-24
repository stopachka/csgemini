'use client';

import React from 'react';
import GameScene from '@/components/GameScene';
import { useParams } from 'next/navigation';

export default function GamePage() {
  const params = useParams();
  const mapId = params.mapId as string;

  if (!mapId) return <div>Loading...</div>;

  return (
    <main className="w-full h-screen">
      <GameScene mapId={mapId} />
    </main>
  );
}
