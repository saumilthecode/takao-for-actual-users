/**
 * ============================================================
 * 📄 FILE: app/api/graph/route.ts
 * 
 * 🎯 PURPOSE:
 *    Next.js API route for graph data.
 *    Returns nodes and links for 3D visualization.
 * 
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/src/init';
import { getAllUsers } from '@/src/data/users';
import { getKNearestNeighbors } from '@/src/services/vectorStore';
import { computeUMAP } from '@/src/services/projection';
import { computeClusters } from '@/src/services/clustering';

export interface GraphNode {
  id: string;
  name: string;
  age: number;
  uni: string;
  x: number;
  y: number;
  z: number;
  clusterId: number;
  vector: number[];
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export async function GET(request: NextRequest) {
  await ensureInitialized();
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'force';
    const k = parseInt(searchParams.get('k') || '5');

    const users = await getAllUsers();
    
    // Compute clusters using DBSCAN
    if (users.length === 0) {
      return NextResponse.json({ nodes: [], links: [], mode });
    }

    const clusterLabels = computeClusters(users.map(u => u.vector));
    
    // Compute UMAP positions if embedding mode
    let positions: number[][] | null = null;
    if (mode === 'embedding') {
      positions = await computeUMAP(users.map(u => u.vector));
    }

    // Build nodes array
    const nodes: GraphNode[] = users.map((user, idx) => ({
      id: user.id,
      name: user.name,
      age: user.age,
      uni: user.uni,
      x: positions ? positions[idx][0] * 100 : Math.random() * 200 - 100,
      y: positions ? positions[idx][1] * 100 : Math.random() * 200 - 100,
      z: positions ? positions[idx][2] * 100 : Math.random() * 200 - 100,
      clusterId: clusterLabels[idx],
      vector: user.vector,
      traits: user.traits,
      interests: user.interests
    }));

    // Build links array (top-k neighbors for each node)
    const links: GraphLink[] = [];
    const seenPairs = new Set<string>();
    const userIds = new Set(users.map(u => u.id));

    for (const user of users) {
      const neighbors = await getKNearestNeighbors(user.id, k);
      
      for (const neighbor of neighbors) {
        // Only create links to users that exist in the nodes array
        if (!userIds.has(neighbor.id)) continue;
        
        const pairKey = [user.id, neighbor.id].sort().join('-');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          links.push({
            source: user.id,
            target: neighbor.id,
            strength: neighbor.similarity
          });
        }
      }
    }

    return NextResponse.json({ nodes, links, mode });
  } catch (error) {
    console.error('Graph error:', error);
    return NextResponse.json(
      { error: 'Failed to compute graph' },
      { status: 500 }
    );
  }
}
