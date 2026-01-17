/**
 * ============================================================
 * 📄 FILE: frontend/components/SocialGraph.tsx
 * 
 * 🎯 PURPOSE:
 *    3D force graph visualization of the social network.
 *    Features: hover tooltips, click interactions, match explanations.
 * 
 * 🛠️ TECH USED:
 *    - react-force-graph-3d
 *    - Three.js (via react-force-graph-3d)
 *    - shadcn/ui components
 * 
 * ============================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchGraph, fetchMatchExplanation, GraphNode, GraphLink, GraphData, MatchExplanation } from '@/lib/api';
import { Users, X } from 'lucide-react';

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface SocialGraphProps {
  focusUserId?: string;
}

export default function SocialGraph({ focusUserId }: SocialGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphMode, setGraphMode] = useState<'force' | 'embedding'>('force');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [topMatches, setTopMatches] = useState<Array<{ node: GraphNode; similarity: number }>>([]);
  const [matchExplanation, setMatchExplanation] = useState<MatchExplanation | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const [linkThreshold, setLinkThreshold] = useState(0.2);
  const [highlightCircle, setHighlightCircle] = useState(false);
  const graphRef = useRef<any>();
  const glowTextureRef = useRef<THREE.Texture | null>(null);
  const sphereGeometryRef = useRef(new THREE.SphereGeometry(1, 24, 24));

  // Fetch graph data on mount
  useEffect(() => {
    loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphMode, focusUserId]);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const data = await fetchGraph(graphMode);
      
      // Filter out links that reference non-existent nodes
      const nodeIds = new Set(data.nodes.map(n => n.id));
      const validLinks = data.links.filter(link => {
        const sourceId = (link as any).source?.id ?? link.source;
        const targetId = (link as any).target?.id ?? link.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
      
      const centeredNodes = (() => {
        if (!data.nodes.length) return data.nodes;
        const centroid = data.nodes.reduce(
          (acc, node) => {
            acc.x += node.x;
            acc.y += node.y;
            acc.z += node.z;
            return acc;
          },
          { x: 0, y: 0, z: 0 }
        );
        centroid.x /= data.nodes.length;
        centroid.y /= data.nodes.length;
        centroid.z /= data.nodes.length;
        return data.nodes.map(node => ({
          ...node,
          x: node.x - centroid.x,
          y: node.y - centroid.y,
          z: node.z - centroid.z
        }));
      })();

      if (centeredNodes.length > 0) {
        const preferredFocus = focusUserId && centeredNodes.some(node => node.id === focusUserId)
          ? focusUserId
          : centeredNodes[0].id;
        setFocusNodeId(preferredFocus);
      }

      setGraphData({
        ...data,
        nodes: centeredNodes,
        links: validLinks
      });
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLinkNodeId = useCallback((link: any, key: 'source' | 'target') => {
    const value = link?.[key];
    if (value && typeof value === 'object') {
      return value.id as string;
    }
    return value as string;
  }, []);

  // Handle node hover - show tooltip
  const handleNodeHover = useCallback((node: any, event?: MouseEvent) => {
    if (node && event) {
      const typedNode = node as GraphNode;
      setHoveredNode(typedNode);
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        node: typedNode
      });
    } else {
      setHoveredNode(null);
      setTooltip(null);
    }
  }, []);

  // Handle node click - highlight neighbors and show top matches
  const handleNodeClick = useCallback(async (node: GraphNode) => {
    if (!graphData) return;

    setSelectedNode(node);
    setHighlightCircle(true);

    // Find top 5 matches (nodes connected to this one, sorted by link strength)
    const connectedLinks = graphData.links.filter(link => {
      const sourceId = getLinkNodeId(link, 'source');
      const targetId = getLinkNodeId(link, 'target');
      return sourceId === node.id || targetId === node.id;
    });

    const matches = connectedLinks
      .map(link => {
        const sourceId = getLinkNodeId(link, 'source');
        const targetId = getLinkNodeId(link, 'target');
        const otherId = sourceId === node.id ? targetId : sourceId;
        const otherNode = graphData.nodes.find(n => n.id === otherId);
        return otherNode ? { node: otherNode, similarity: link.strength } : null;
      })
      .filter((match): match is { node: GraphNode; similarity: number } => match !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    setTopMatches(matches);

    // Fetch detailed match explanation for the top match
    if (matches.length > 0) {
      try {
        const explanation = await fetchMatchExplanation(node.id, matches[0].node.id);
        setMatchExplanation(explanation);
      } catch (error) {
        console.error('Failed to fetch match explanation:', error);
      }
    }
  }, [graphData]);

  // Handle match click - show explanation
  const handleMatchClick = async (matchNode: GraphNode) => {
    if (!selectedNode) return;

    try {
      const explanation = await fetchMatchExplanation(selectedNode.id, matchNode.id);
      setMatchExplanation(explanation);
    } catch (error) {
      console.error('Failed to fetch match explanation:', error);
    }
  };

  // Update link width based on selection
  const getLinkWidth = useCallback((link: any) => {
    if (!selectedNode) return 1;
    const sourceId = getLinkNodeId(link, 'source');
    const targetId = getLinkNodeId(link, 'target');
    return (sourceId === selectedNode.id || targetId === selectedNode.id) ? 3 : 0.5;
  }, [getLinkNodeId, selectedNode]);

  const getLinkColor = useCallback((link: any) => {
    const strength = link?.strength ?? 0.2;
    if (!selectedNode) {
      return `rgba(195,206,148,${Math.min(0.5, Math.max(0.12, strength))})`;
    }
    const sourceId = getLinkNodeId(link, 'source');
    const targetId = getLinkNodeId(link, 'target');
    const isActive = sourceId === selectedNode.id || targetId === selectedNode.id;
    const alpha = isActive ? Math.min(0.95, Math.max(0.35, strength + 0.25)) : 0.18;
    return `rgba(195,206,148,${alpha})`;
  }, [getLinkNodeId, selectedNode]);

  const circleNodeIds = useMemo(() => {
    if (!selectedNode || topMatches.length === 0) return new Set<string>();
    return new Set([selectedNode.id, ...topMatches.map(match => match.node.id)]);
  }, [selectedNode, topMatches]);

  const circleMembers = useMemo(() => {
    if (!selectedNode) return [];
    const members = [selectedNode, ...topMatches.map(match => match.node)];
    return members.slice(0, 5);
  }, [selectedNode, topMatches]);

  const circleCohesion = useMemo(() => {
    if (!graphData || circleMembers.length < 2) return null;
    const circleIds = new Set(circleMembers.map(member => member.id));
    const circleLinks = graphData.links.filter(link => {
      const sourceId = getLinkNodeId(link, 'source');
      const targetId = getLinkNodeId(link, 'target');
      return circleIds.has(sourceId) && circleIds.has(targetId);
    });
    if (!circleLinks.length) return null;
    const avg = circleLinks.reduce((sum, link) => sum + (link.strength || 0), 0) / circleLinks.length;
    return avg;
  }, [getLinkNodeId, graphData, circleMembers]);

  const getNodeTone = useCallback((node: GraphNode) => {
    const isSelected = selectedNode && node.id === selectedNode.id;
    const isHovered = hoveredNode && node.id === hoveredNode.id;
    const isCircle = highlightCircle && circleNodeIds.has(node.id);
    const isFocus = focusNodeId && node.id === focusNodeId;
    if (isSelected) return { color: '#2c3b2a', glow: 0.5, sizeBoost: 2.2 };
    if (isHovered) return { color: '#2f4630', glow: 0.4, sizeBoost: 1.4 };
    if (isCircle) return { color: '#374f36', glow: 0.35, sizeBoost: 1.1 };
    if (isFocus) return { color: '#314335', glow: 0.4, sizeBoost: 1.4 };
    const colors = ['#1f2a22', '#243326', '#2a3a2c', '#2e4131', '#324736', '#2a3a2e'];
    const color = colors[node.clusterId % colors.length] || '#6b7280';
    return { color, glow: 0.35, sizeBoost: 1 };
  }, [circleNodeIds, focusNodeId, highlightCircle, hoveredNode, selectedNode]);

  const getNodeBaseSize = useCallback((node: GraphNode) => {
    const base = 2.6 + (node.traits?.extraversion || 0) * 1.8;
    return base;
  }, []);

  const buildGlowTexture = useCallback(() => {
    if (glowTextureRef.current) return glowTextureRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    glowTextureRef.current = texture;
    return texture;
  }, []);

  const createNodeObject = useCallback((node: GraphNode) => {
    const group = new THREE.Group();
    const tone = getNodeTone(node);
    const size = getNodeBaseSize(node) * tone.sizeBoost;
    const sphere = new THREE.Mesh(
      sphereGeometryRef.current,
      new THREE.MeshStandardMaterial({
        color: tone.color,
        emissive: tone.color,
        emissiveIntensity: 0.35,
        metalness: 0.2,
        roughness: 0.3
      })
    );
    sphere.scale.setScalar(size);
    group.add(sphere);

    const glowTexture = buildGlowTexture();
    if (glowTexture) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: tone.color,
        transparent: true,
        opacity: tone.glow,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(size * 6, size * 6, 1);
      sprite.renderOrder = -1;
      group.add(sprite);
    }

    (node as any).__threeGroup = group;
    return group;
  }, [buildGlowTexture, getNodeBaseSize, getNodeTone]);

  const updateNodeVisuals = useCallback(() => {
    if (!graphData) return;
    graphData.nodes.forEach(node => {
      const group = (node as any).__threeGroup as THREE.Group | undefined;
      if (!group) return;
      const tone = getNodeTone(node);
      const size = getNodeBaseSize(node) * tone.sizeBoost;
      const sphere = group.children.find(child => child.type === 'Mesh') as THREE.Mesh | undefined;
      if (sphere && sphere.material instanceof THREE.MeshStandardMaterial) {
        sphere.material.color.set(tone.color);
        sphere.material.emissive.set(tone.color);
        sphere.material.emissiveIntensity = 0.35 + tone.glow * 0.5;
        sphere.scale.setScalar(size);
      }
      const sprite = group.children.find(child => child.type === 'Sprite') as THREE.Sprite | undefined;
      if (sprite && sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.color.set(tone.color);
        sprite.material.opacity = tone.glow;
        sprite.scale.set(size * 6, size * 6, 1);
      }
    });
  }, [getNodeBaseSize, getNodeTone, graphData]);

  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    const linkBuckets = new Map<string, GraphLink[]>();
    graphData.links.forEach(link => {
      const sourceId = getLinkNodeId(link, 'source');
      const targetId = getLinkNodeId(link, 'target');
      if (!linkBuckets.has(sourceId)) linkBuckets.set(sourceId, []);
      if (!linkBuckets.has(targetId)) linkBuckets.set(targetId, []);
      linkBuckets.get(sourceId)?.push(link);
      linkBuckets.get(targetId)?.push(link);
    });

    const filteredLinks: GraphLink[] = [];
    linkBuckets.forEach(links => {
      const selected = links
        .filter(link => link.strength >= linkThreshold)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 4);
      selected.forEach(link => {
        if (!filteredLinks.includes(link)) {
          filteredLinks.push(link);
        }
      });
    });

    return {
      ...graphData,
      links: filteredLinks
    };
  }, [getLinkNodeId, graphData, linkThreshold]);

  useEffect(() => {
    if (!filteredGraphData || !graphRef.current) return;
    const timeout = window.setTimeout(() => {
      graphRef.current?.centerAt?.(0, 0, 0, 0);
      graphRef.current?.zoomToFit(800, 40);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [filteredGraphData]);

  useEffect(() => {
    if (!graphData || selectedNode || !focusNodeId) return;
    const focusNode = graphData.nodes.find(node => node.id === focusNodeId);
    if (focusNode) {
      handleNodeClick(focusNode);
    }
  }, [focusNodeId, graphData, handleNodeClick, selectedNode]);

  useEffect(() => {
    if (!filteredGraphData || !graphRef.current) return;
    if (graphMode === 'force') {
      const linkForce = graphRef.current.d3Force?.('link');
      if (linkForce?.distance) {
        linkForce.distance((link: any) => {
          const strength = (link as GraphLink)?.strength ?? 0.2;
          return 110 - strength * 60;
        });
      }
      const chargeForce = graphRef.current.d3Force?.('charge');
      chargeForce?.strength?.(-120);
      graphRef.current.d3ReheatSimulation?.();
    }
  }, [filteredGraphData, graphMode]);

  useEffect(() => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene?.();
    if (scene && !scene.getObjectByName('takoa-ambient')) {
      const ambient = new THREE.AmbientLight(0xf3f7df, 0.8);
      ambient.name = 'takoa-ambient';
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(120, 80, 120);
      keyLight.name = 'takoa-key';
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(0xd6e0b0, 0.9, 600);
      fillLight.position.set(-120, -40, 80);
      fillLight.name = 'takoa-fill';
      scene.add(fillLight);

      scene.fog = new THREE.Fog(0x0b0f0a, 120, 420);
    }

    const renderer = graphRef.current.renderer?.();
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    }
  }, [filteredGraphData]);

  useEffect(() => {
    updateNodeVisuals();
  }, [selectedNode, hoveredNode, highlightCircle, circleNodeIds, updateNodeVisuals]);


  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[60vh] sm:h-[65vh] lg:h-[600px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading graph...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!graphData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[60vh] sm:h-[65vh] lg:h-[600px]">
          <p className="text-muted-foreground">Failed to load graph data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 3D Graph */}
      <div className="lg:col-span-9">
        <Card className="h-full border-0 bg-transparent shadow-none rounded-none">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                3D Social Graph
                <Badge className="text-xs bg-black text-primary-foreground">Dev/UAT</Badge>
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Force</span> keeps related people closer by simulation.{' '}
                <span className="font-medium text-foreground">Embedding</span> places everyone by learned similarity coordinates.
              </div>
            </div>
            <div className="relative h-[60vh] sm:h-[70vh] lg:h-[calc(100vh-200px)] min-h-[360px] lg:min-h-[560px] w-full overflow-hidden rounded-none border-0 bg-transparent -ml-6">

              <div className="absolute left-6 top-4 z-10 rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs text-foreground">
                <div className="font-semibold">Legend</div>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#aab874]" />Clusters
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7ef3ff]" />You
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#cfe0a1]" />Circle
                  </span>
                </div>
              </div>

              <div className="absolute right-4 top-4 z-10 flex flex-col gap-3 rounded-xl border border-border/40 bg-background/70 p-3 text-xs text-foreground">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={graphMode === 'force' ? 'default' : 'outline'}
                    onClick={() => setGraphMode('force')}
                  >
                    Force
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={graphMode === 'embedding' ? 'default' : 'outline'}
                    onClick={() => setGraphMode('embedding')}
                  >
                    Embedding
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Force is a physics layout. Embedding is a fixed coordinate map.
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Link threshold</span>
                    <span>{linkThreshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={linkThreshold}
                    onChange={(e) => setLinkThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Higher hides weaker links to reduce clutter.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={highlightCircle ? 'default' : 'outline'}
                    onClick={() => setHighlightCircle(prev => !prev)}
                    disabled={!selectedNode}
                  >
                    Highlight circle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => graphRef.current?.zoomToFit(600, 40)}
                  >
                    Reset camera
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Highlight circle shows the circle of 5. Reset camera recenters the view.
                </div>
              </div>

              {typeof window !== 'undefined' && filteredGraphData && (
                <ForceGraph3D
                  ref={graphRef}
                  graphData={filteredGraphData}
                  nodeLabel={(node: any) => `${node.name}\n${node.age} years old\n${node.uni}`}
                  nodeThreeObject={(node: any) => createNodeObject(node)}
                  nodeThreeObjectExtend
                  linkSource="source"
                  linkTarget="target"
                  linkOpacity={selectedNode ? 0.12 : 0.22}
                  linkWidth={selectedNode ? 1.6 : 0.8}
                  linkColor={() => 'rgba(46,62,45,0.65)'}
                  onNodeHover={(node: any, event: any) => handleNodeHover(node, event as MouseEvent)}
                  onNodeClick={(node: any) => {
                    handleNodeClick(node);
                    graphRef.current?.cameraPosition(
                      { x: node.x * 1.2, y: node.y * 1.2, z: node.z * 1.2 + 80 },
                      node,
                      900
                    );
                  }}
                  enableNodeDrag={false}
                  showNavInfo={false}
                  backgroundColor="rgba(0,0,0,0)"
                />
              )}

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute z-50 bg-background border border-border rounded-lg shadow-lg p-3 pointer-events-none"
                  style={{
                    left: `${tooltip.x + 10}px`,
                    top: `${tooltip.y + 10}px`,
                    maxWidth: '200px'
                  }}
                >
                  <div className="font-semibold text-sm">{tooltip.node.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Age: {tooltip.node.age}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tooltip.node.uni}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Top Matches & Explanation */}
      <div className="lg:col-span-3 space-y-6">
        {/* Top Matches */}
        {selectedNode && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Circle (5)</CardTitle>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setTopMatches([]);
                  setMatchExplanation(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3">
                Includes you and four closest connections.
              </div>
              <div className="rounded-lg border border-border px-3 py-2 text-sm mb-3">
                <span className="font-medium">You:</span>{' '}
                {selectedNode.name}
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {topMatches.map((match, idx) => (
                    <div
                      key={match.node.id}
                      onClick={() => handleMatchClick(match.node)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        matchExplanation?.user2.id === match.node.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{match.node.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {match.node.age} • {match.node.uni}
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {(match.similarity * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {selectedNode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Circle cohesion score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-primary">
                {circleCohesion !== null
                  ? `${(circleCohesion * 100).toFixed(0)}%`
                  : '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                Average link strength across all connections inside the circle.
              </div>
              <div className="text-xs text-muted-foreground">Why this circle fits</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {matchExplanation?.topContributors.slice(0, 3).map((contrib, idx) => (
                  <li key={idx} className="capitalize">
                    {contrib.dimension} alignment
                  </li>
                ))}
                {!matchExplanation && (
                  <li>Shared interests and compatible group dynamics.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Match Explanation Panel */}
        {matchExplanation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Similarity Score */}
                <div>
                  <div className="text-sm font-medium mb-2">Similarity Score</div>
                  <div className="text-2xl font-bold text-primary">
                    {(matchExplanation.similarity * 100).toFixed(1)}%
                  </div>
                  <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${matchExplanation.similarity * 100}%` }}
                    />
                  </div>
                </div>

                {/* Top Contributing Dimensions */}
                <div>
                  <div className="text-sm font-medium mb-2">Top Contributing Dimensions</div>
                  <div className="space-y-2">
                    {matchExplanation.topContributors.map((contrib, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">
                          {contrib.dimension}
                        </span>
                        <span className="font-medium">
                          {(contrib.contribution * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared Interests */}
                {matchExplanation.sharedInterests.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Shared Interests</div>
                    <div className="flex flex-wrap gap-1">
                      {matchExplanation.sharedInterests.map((interest, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions when nothing selected */}
        {!selectedNode && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click a node to see</p>
              <p>top matches and explanations</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * 📄 FILE FOOTER: frontend/components/SocialGraph.tsx
 * ============================================================
 * PURPOSE:
 *    3D social graph view with circle-of-5 insights and view toggle.
 * TECH USED:
 *    - react-force-graph-3d
 *    - React
 *    - shadcn/ui
 * ============================================================
 */
