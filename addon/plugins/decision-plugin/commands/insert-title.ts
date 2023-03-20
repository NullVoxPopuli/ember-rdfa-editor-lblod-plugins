import { Schema } from '@lblod/ember-rdfa-editor';
import { v4 as uuid } from 'uuid';
import insertNodeIntoAncestorAtPoint from '../../../utils/insert-block-into-node';

export default function insertTitle(placeholderText: string) {
  return insertNodeIntoAncestorAtPoint({
    ancestorType(schema: Schema) {
      return schema.nodes.besluit;
    },
    nodeToInsert(schema: Schema) {
      return schema.node(
        'title',
        { __rdfaId: uuid() },
        schema.node(
          'paragraph',
          null,
          schema.node('placeholder', {
            placeholderText,
          })
        )
      );
    },
  });
}
