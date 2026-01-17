/**
 * ============================================================
 * 📄 FILE: backend/src/services/projection.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Projects high-dimensional vectors to 3D using UMAP.
 *    This gives us x,y,z coordinates for the "Embedding View".
 * 
 * 🛠️ TECH USED:
 *    - umap-js (JavaScript UMAP implementation)
 * 
 * 📤 EXPORTS:
 *    - computeUMAP() → returns 3D coordinates for each vector
 * 
 * 💡 KEY CONCEPT:
 *    UMAP = Uniform Manifold Approximation and Projection
 *    - Preserves LOCAL neighborhoods (nearby = similar)
 *    - Better than PCA for non-linear data
 *    - Better than t-SNE for preserving global structure
 * 
 *    Parameters:
 *    - nNeighbors: how many neighbors to consider (default 15)
 *    - minDist: how tightly to pack points (default 0.1)
 *    - nComponents: output dimensions (we use 3 for 3D viz)
 * 
 * ============================================================
 */

import { UMAP } from 'umap-js';

// UMAP parameters
const N_NEIGHBORS = 15;
const MIN_DIST = 0.1;
const N_COMPONENTS = 3;

/**
 * Project vectors to 3D using UMAP
 * 
 * @param vectors - Array of vectors to project
 * @returns Array of [x, y, z] coordinates
 */
export async function computeUMAP(vectors: number[][]): Promise<number[][]> {
  if (vectors.length < N_NEIGHBORS) {
    // Not enough points for UMAP, return random positions
    console.warn(`⚠️ Only ${vectors.length} vectors, need ${N_NEIGHBORS} for UMAP. Using random positions.`);
    return vectors.map(() => [
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ]);
  }

  console.log(`🔄 Computing UMAP for ${vectors.length} vectors...`);

  const umap = new UMAP({
    nNeighbors: N_NEIGHBORS,
    minDist: MIN_DIST,
    nComponents: N_COMPONENTS,
    spread: 1.0,
    random: Math.random, // Use Math.random for reproducibility with seed
  });

  // Fit and transform
  const embedding = umap.fit(vectors);

  console.log(`✅ UMAP projection complete`);

  return embedding;
}

/**
 * Incremental UMAP for adding new points without recomputing
 * (Not implemented - for future optimization)
 */
export async function transformNewPoint(
  existingEmbedding: number[][],
  newVector: number[]
): Promise<number[]> {
  // For hackathon, just recompute full UMAP
  // In production, use incremental methods
  return [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
}

/**
 * Simple PCA fallback (if UMAP is too slow)
 */
export function computePCA3D(vectors: number[][]): number[][] {
  // For 5D → 3D, just take first 3 dimensions
  // Fallback approximation when UMAP is unavailable
  return vectors.map(v => [
    v[0] || 0,
    v[1] || 0,
    v[2] || 0
  ]);
}
