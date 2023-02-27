import {
  constructStructureBodyNodeSpec,
  constructStructureNodeSpec,
  romanize,
} from '../utils/structure';
import { v4 as uuid } from 'uuid';
import { StructureSpec } from '..';
import { SAY } from '@lblod/ember-rdfa-editor-lblod-plugins/utils/constants';
import { unwrap } from '@lblod/ember-rdfa-editor-lblod-plugins/utils/option';

const PLACEHOLDERS = {
  title: 'article-structure-plugin.placeholder.section.heading',
  body: 'article-structure-plugin.placeholder.section.body',
};
export const sectionSpec: StructureSpec = {
  name: 'section',
  continuous: false,
  translations: {
    insert: 'article-structure-plugin.insert.section',
    move: {
      up: 'article-structure-plugin.move-up.section',
      down: 'article-structure-plugin.move-down.section',
    },
    remove: 'article-structure-plugin.remove.section',
  },
  constructor: ({ schema, number, content, intl }) => {
    const numberConverted = romanize(number || 1);
    const node = schema.node(
      `section`,
      { resource: `http://data.lblod.info/sections/${uuid()}` },
      [
        schema.node(
          'structure_header',
          { level: 5, number: numberConverted },
          schema.node('placeholder', {
            placeholderText: intl?.t(PLACEHOLDERS.title),
          })
        ),
        schema.node(
          `section_body`,
          {},
          content ??
            schema.node(
              'paragraph',
              {},
              schema.node('placeholder', {
                placeholderText: intl?.t(PLACEHOLDERS.body),
              })
            )
        ),
      ]
    );
    const selectionConfig: {
      relativePos: number;
      type: 'text' | 'node';
    } = content
      ? { relativePos: 5, type: 'text' }
      : { relativePos: 6, type: 'node' };
    return {
      node,
      selectionConfig,
    };
  },
  updateNumber: ({ number, pos, transaction }) => {
    const numberConverted = romanize(number);
    return transaction.setNodeAttribute(pos + 1, 'number', numberConverted);
  },
  content: ({ pos, state }) => {
    const node = unwrap(state.doc.nodeAt(pos));
    return node.child(1).content;
  },
};

export const section = constructStructureNodeSpec({
  type: SAY('Section'),
  content: 'structure_header section_body',
});

export const section_body = constructStructureBodyNodeSpec({
  content: '(subsection|block)+|(article|block)+',
});
