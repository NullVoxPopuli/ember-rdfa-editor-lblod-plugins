import { Structure, STRUCTURES } from './constants';

export default function optionsWithDefaults(options?: {
  structures: (Structure | string)[];
}) {
  const structuresSelected = [];
  const structuresTypesSelectedByUser =
    (options && options.structures) || Object.keys(STRUCTURES);
  for (const type of structuresTypesSelectedByUser) {
    if (typeof type === 'string') {
      const defaultStructure = STRUCTURES[type];
      if (defaultStructure) {
        structuresSelected.push(defaultStructure);
      } else {
        console.warn(
          `Article Structure Plugin: structure type ${type} not found in the default structure types`
        );
      }
    } else {
      structuresSelected.push(type);
    }
  }
  return {
    structures: structuresSelected,
    structureTypes: structuresSelected.map((structure) => structure.type),
  };
}
