/**
 * ============================================================
 * 📄 FILE: backend/src/routes/graph.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Returns the social graph data for 3D visualization.
 *    Nodes = users with positions, Links = similarity connections.
 * 
 * 🛠️ TECH USED:
 *    - Fastify (route registration)
 *    - Vector store (for kNN search)
 *    - UMAP (for 3D projection)
 *    - DBSCAN (for cluster IDs)
 * 
 * 📥 INPUT:
 *    GET /graph?mode=force|embedding
 * 
 * 📤 OUTPUT:
 *    { nodes: Node[], links: Link[] }
 * 
 * ============================================================
 */

import { FastifyInstance } from 'fastify';
import { getAllUsers, getUserById } from '../data/users.js';
import { getKNearestNeighbors } from '../services/vectorStore.js';
import { computeUMAP } from '../services/projection.js';
import { computeClusters } from '../services/clustering.js';
import { cosineSimilarity } from '../services/vectorStore.js';

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

export async function graphRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /graph
   * Returns full graph data for 3D visualization
   * Query params:
   *   - mode: 'force' (default) or 'embedding' (UMAP positions)
   *   - k: number of neighbors per node (default 5)
   */
  fastify.get('/', async (request, reply) => {
    const { mode = 'force', k = 5 } = request.query as { mode?: string; k?: number };

    try {
      const users = await getAllUsers();
      if (users.length === 0) {
        return { nodes: [], links: [], mode };
      }
      
      // Compute clusters using DBSCAN
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
        const neighbors = await getKNearestNeighbors(user.id, Number(k));
        
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

      return { nodes, links, mode };
    } catch (error) {
      console.error('Graph error:', error);
      return reply.status(500).send({ error: 'Failed to compute graph' });
    }
  });

  /**
   * GET /graph/match/:id1/:id2
   * Returns detailed match explanation between two users
   */
  fastify.get('/match/:id1/:id2', async (request, reply) => {
    const { id1, id2 } = request.params as { id1: string; id2: string };
    
    const [user1, user2] = await Promise.all([getUserById(id1), getUserById(id2)]);

    if (!user1 || !user2) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Calculate overall similarity
    const similarity = cosineSimilarity(user1.vector, user2.vector);

    // Calculate contribution of each dimension
    const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const contributions = dimensions.map((dim, idx) => {
      const diff = Math.abs(user1.vector[idx] - user2.vector[idx]);
      const contribution = (1 - diff) * user1.vector[idx] * user2.vector[idx];
      return { dimension: dim, contribution: parseFloat(contribution.toFixed(3)) };
    }).sort((a, b) => b.contribution - a.contribution);

    // Find shared interests
    const sharedInterests = user1.interests.filter(i => user2.interests.includes(i));

    return {
      user1: { id: user1.id, name: user1.name },
      user2: { id: user2.id, name: user2.name },
      similarity: parseFloat(similarity.toFixed(3)),
      topContributors: contributions.slice(0, 3),
      sharedInterests
    };
  });
}
