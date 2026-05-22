import { getStroke } from "perfect-freehand";
import earcut from "earcut";

const points = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0]
];
const stroke = getStroke(points, { size: 10 });
const flat = stroke.flat();
const triangles = earcut(flat);
console.log(triangles.length > 0 ? "earcut works" : "earcut failed");
