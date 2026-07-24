// Lightweight declarations so the passport world map can use real Natural Earth
// country geometry without pulling large @types or making tsc parse the huge JSON.
declare module "world-atlas/countries-110m.json" {
  const topology: any;
  export default topology;
}
declare module "topojson-client" {
  export function feature(topology: any, object: any): any;
}
