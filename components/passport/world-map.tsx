import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import Svg, { Rect, Path, Circle, Text as SvgText, G } from "react-native-svg";
import { feature } from "topojson-client";
import topology from "world-atlas/countries-110m.json";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme-provider";
import { project } from "@/constants/geo";
import type { PassportPin } from "@/hooks/use-passport";

// A REAL world map for the passport: actual Natural Earth country geometry
// (world-atlas 110m → GeoJSON via topojson-client) rendered as vectors with
// react-native-svg — so it works identically on web, iOS and Android with no map
// SDK, no API key and offline. Visited countries are highlighted; pins drop on
// top with ZOOM-DEPENDENT COUNTED CLUSTERS.

type Feature = { geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const WORLD: Feature[] = (feature(topology, (topology as any).objects.countries) as any).features;

// Ray-casting point-in-polygon on [lng,lat] rings (outer rings only).
function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polygonsOf(f: Feature): number[][][][] {
  return f.geometry.type === "Polygon"
    ? [f.geometry.coordinates as number[][][]]
    : (f.geometry.coordinates as number[][][][]);
}
function inFeature(lng: number, lat: number, f: Feature): boolean {
  for (const poly of polygonsOf(f)) if (inRing(lng, lat, poly[0])) return true;
  return false;
}

type Cluster = { x: number; y: number; count: number; kind: PassportPin["kind"] };

export function WorldMap({ pins, height = 200 }: { pins: PassportPin[]; height?: number }) {
  const { tokens: t } = useTheme();
  const [w, setW] = useState(0);
  const [zoom, setZoom] = useState(1);

  const proj = pins.map((p) => ({ ...project(p.lat, p.lng), pin: p }));
  const cx = proj.length ? proj.reduce((s, p) => s + p.x, 0) / proj.length : 0.5;
  const cy = proj.length ? proj.reduce((s, p) => s + p.y, 0) / proj.length : 0.5;
  const H = height;
  const toX = (px: number) => ((px - cx) * zoom + cx) * w;
  const toY = (py: number) => ((py - cy) * zoom + cy) * H;

  // Which countries has the user visited? (any pin inside)
  const visited = useMemo(() => {
    const set = new Set<number>();
    WORLD.forEach((f, i) => {
      if (pins.some((p) => inFeature(p.lng, p.lat, f))) set.add(i);
    });
    return set;
  }, [pins]);

  // Country SVG paths for the current view (zoom pivots on the pins' centroid).
  const paths = useMemo(() => {
    if (w === 0) return [];
    return WORLD.map((f) => {
      let d = "";
      for (const poly of polygonsOf(f)) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i++) {
            const p = project(ring[i][1], ring[i][0]);
            d += (i === 0 ? "M" : "L") + toX(p.x).toFixed(1) + " " + toY(p.y).toFixed(1) + " ";
          }
          d += "Z ";
        }
      }
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, zoom, cx, cy, H]);

  const ocean = t.dark ? "#0E1626" : "#DCE6F2";
  const land = t.dark ? "#2A2D33" : "#C7D0DC";
  const landStroke = ocean;
  const visitedFill = t.accent;

  // cluster pins (cell shrinks as you zoom in)
  const cell = 0.16 / zoom;
  const buckets = new Map<string, { xs: number[]; ys: number[]; pins: PassportPin[] }>();
  for (const p of proj) {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const b = buckets.get(k) ?? { xs: [], ys: [], pins: [] };
    b.xs.push(p.x); b.ys.push(p.y); b.pins.push(p.pin);
    buckets.set(k, b);
  }
  const clusters: Cluster[] = [...buckets.values()].map((b) => ({
    x: b.xs.reduce((s, v) => s + v, 0) / b.xs.length,
    y: b.ys.reduce((s, v) => s + v, 0) / b.ys.length,
    count: b.pins.length,
    kind: b.pins.some((p) => p.kind === "place") ? "place" : "landmark",
  }));

  return (
    <View style={{ gap: 8 }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{
          height: H,
          borderRadius: t.radius,
          overflow: "hidden",
          borderWidth: t.cardBorder?.width ?? 1,
          borderColor: t.cardBorder?.color ?? t.border,
        }}
      >
        {w > 0 ? (
          <Svg width={w} height={H}>
            <Rect x={0} y={0} width={w} height={H} fill={ocean} />
            <G>
              {paths.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  fill={visited.has(i) ? visitedFill : land}
                  fillOpacity={visited.has(i) ? 0.85 : 1}
                  stroke={landStroke}
                  strokeWidth={0.5}
                />
              ))}
            </G>
            {clusters.map((c, i) => {
              const X = toX(c.x), Y = toY(c.y);
              if (X < -20 || X > w + 20 || Y < -20 || Y > H + 20) return null;
              if (c.count > 1) {
                return (
                  <G key={i}>
                    <Circle cx={X} cy={Y} r={13} fill="#111" opacity={0.85} />
                    <Circle cx={X} cy={Y} r={13} fill="none" stroke="#fff" strokeWidth={1.5} />
                    <SvgText x={X} y={Y + 4} fontSize={11} fontWeight="700" fill="#fff" textAnchor="middle">
                      {c.count}
                    </SvgText>
                  </G>
                );
              }
              return (
                <G key={i}>
                  <Circle cx={X} cy={Y} r={5.5} fill="#111" />
                  <Circle cx={X} cy={Y} r={5.5} fill="none" stroke="#fff" strokeWidth={1.5} />
                </G>
              );
            })}
          </Svg>
        ) : null}

        <View style={{ position: "absolute", right: 8, bottom: 8, flexDirection: "row", gap: 6 }}>
          <ZoomBtn label="−" onPress={() => setZoom((z) => Math.max(1, +(z / 1.6).toFixed(2)))} t={t} />
          <ZoomBtn label="+" onPress={() => setZoom((z) => Math.min(10, +(z * 1.6).toFixed(2)))} t={t} />
        </View>
      </View>
      {pins.length === 0 ? (
        <Text variant="caption" className="text-center">
          Your visited places will pin here.
        </Text>
      ) : null}
    </View>
  );
}

function ZoomBtn({ label, onPress, t }: { label: string; onPress: () => void; t: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "Zoom in" : "Zoom out"}
      style={{
        width: 34,
        height: 34,
        borderRadius: t.skin === "poster" ? 2 : 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.cardBg,
        borderWidth: t.cardBorder?.width ?? 1,
        borderColor: t.cardBorder?.color ?? t.border,
      }}
    >
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "700", lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}
