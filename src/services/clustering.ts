/**
 * ============================================================
 * 📄 FILE: backend/src/services/clustering.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Clusters users into groups using DBSCAN algorithm.
 *    Each cluster becomes a "community" in the 3D visualization.
 *    Clusters are colored differently in the graph.
 * 
 * 🛠️ TECH USED:
 *    - density-clustering (DBSCAN implementation)
 *    - No need to specify K (number of clusters) in advance!
 * 
 * 📤 EXPORTS:
 *    - computeClusters() → returns cluster ID for each user
 * 
 * 💡 KEY CONCEPT:
 *    DBSCAN = Density-Based Spatial Clustering
 *    Parameters:
 *    - epsilon: max distance between neighbors
 *    - minPts: min points to form a cluster
 *    Noise points get clusterId = -1
 * 
 * ============================================================
 */

// @ts-ignore - density-clustering doesn't have types
import clustering from 'density-clustering';

// DBSCAN parameters
const EPSILON = 0.3;  // Max distance between neighbors (tune this!)
const MIN_POINTS = 3; // Min points to form a dense region

/**
 * Compute cluster labels for a set of vectors using DBSCAN
 * 
 * @param vectors - Array of vectors (each vector is number[])
 * @returns Array of cluster IDs (same length as input)
 *          -1 = noise (no cluster)
 *          0, 1, 2, ... = cluster indices
 */
export function computeClusters(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dbscan = new clustering.DBSCAN();
  
  // DBSCAN returns array of clusters, where each cluster is array of indices
  // e.g., [[0, 3, 5], [1, 2, 4]] means cluster 0 has items 0,3,5
  const clusterIndices: number[][] = dbscan.run(vectors, EPSILON, MIN_POINTS);

  // Convert to per-item labels
  const labels = new Array(vectors.length).fill(-1); // Default: noise
  
  clusterIndices.forEach((cluster, clusterId) => {
    cluster.forEach(itemIndex => {
      labels[itemIndex] = clusterId;
    });
  });

  // Count cluster stats
  const clusterCounts = new Map<number, number>();
  labels.forEach(label => {
    clusterCounts.set(label, (clusterCounts.get(label) || 0) + 1);
  });

  console.log(`✅ DBSCAN found ${clusterIndices.length} clusters`);
  console.log(`   Noise points: ${clusterCounts.get(-1) || 0}`);

  return labels;
}

/**
 * Alternative: HDBSCAN for more robust clustering
 * (Not implemented - use if DBSCAN doesn't work well)
 */
export function computeHDBSCAN(vectors: number[][]): number[] {
  // HDBSCAN adapts epsilon automatically
  // For hackathon, DBSCAN is sufficient
  return computeClusters(vectors);
}

/**
 * Get cluster statistics
 */
export function getClusterStats(labels: number[]): {
  numClusters: number;
  noiseCount: number;
  clusterSizes: number[];
} {
  const clusterCounts = new Map<number, number>();
  
  labels.forEach(label => {
    clusterCounts.set(label, (clusterCounts.get(label) || 0) + 1);
  });

  const noiseCount = clusterCounts.get(-1) || 0;
  clusterCounts.delete(-1);

  return {
    numClusters: clusterCounts.size,
    noiseCount,
    clusterSizes: Array.from(clusterCounts.values())
  };
}
