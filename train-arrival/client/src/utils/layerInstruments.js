export function getSourceOfVectorLayerByName(mapObject, layerName) {
  if (!mapObject) return null;

  const layer = mapObject.getAllLayers().find(
    l => l.get('name') === layerName
  );
  if (!layer) return null;

  return layer.getSource();
}