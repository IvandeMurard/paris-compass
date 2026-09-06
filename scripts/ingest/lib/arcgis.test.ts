// Reading a point off an ArcGIS feature — the whole of #68 in one function.
//
// The cases below are not invented: `{"x":"NaN","y":"NaN"}` is exactly what the
// APUR 2020 layer answered on 5 September 2026 for the fifteen premises of
// Chapelle International, and it is the string, not the number. The old reader
// was `feature.geometry?.x ?? null`, which is green on every case here except
// the ones that matter.

import { describe, expect, it } from "vitest"

import { featurePoint } from "./arcgis"

const feature = (geometry?: { x: unknown; y: unknown }) => ({ attributes: {}, geometry })

describe("featurePoint", () => {
  it("rend le point quand les deux ordonnées sont finies", () => {
    expect(featurePoint(feature({ x: 652830.7, y: 6866480.1 }))).toEqual({
      x: 652830.7,
      y: 6866480.1,
    })
  })

  it("accepte une ordonnée nulle : 0 est une coordonnée, pas une absence", () => {
    expect(featurePoint(feature({ x: 0, y: 0 }))).toEqual({ x: 0, y: 0 })
  })

  it("lit une ordonnée transmise en texte", () => {
    expect(featurePoint(feature({ x: "652830.7", y: "6866480.1" }))).toEqual({
      x: 652830.7,
      y: 6866480.1,
    })
  })

  // Le cas de #68 : la chaîne "NaN", orthographe Esri d'une géométrie absente.
  it("refuse la chaîne NaN que le service envoie pour un local sans point", () => {
    expect(featurePoint(feature({ x: "NaN", y: "NaN" }))).toBeNull()
  })

  it("refuse un NaN numérique", () => {
    expect(featurePoint(feature({ x: NaN, y: NaN }))).toBeNull()
  })

  it("refuse l'infini", () => {
    expect(featurePoint(feature({ x: Infinity, y: 1 }))).toBeNull()
    expect(featurePoint(feature({ x: "Infinity", y: 1 }))).toBeNull()
  })

  // Half a point is not a point: keeping the ordinate that parsed would put the
  // premise on a meridian it has no business being on.
  it("refuse le point entier quand une seule ordonnée est inutilisable", () => {
    expect(featurePoint(feature({ x: 652830.7, y: "NaN" }))).toBeNull()
    expect(featurePoint(feature({ x: "NaN", y: 6866480.1 }))).toBeNull()
  })

  it("refuse la chaîne vide plutôt que de la lire comme zéro", () => {
    // Number("") vaut 0, et un local à (0, 0) est au large du golfe de Guinée.
    expect(featurePoint(feature({ x: "", y: "" }))).toBeNull()
  })

  it("refuse null et undefined, y compris une géométrie absente", () => {
    expect(featurePoint(feature({ x: null, y: null }))).toBeNull()
    expect(featurePoint(feature({ x: undefined, y: undefined }))).toBeNull()
    expect(featurePoint(feature())).toBeNull()
  })

  it("refuse ce qui n'est pas un nombre du tout", () => {
    expect(featurePoint(feature({ x: "sans objet", y: "sans objet" }))).toBeNull()
    expect(featurePoint(feature({ x: {}, y: {} }))).toBeNull()
  })
})
